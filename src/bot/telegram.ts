import fs from "fs";
import path from "path";
import { Bot, InputFile, Keyboard } from "grammy";
import { config } from "../config.js";
import { whitelistMiddleware } from "./middleware.js";
import { runAgentLoop, resetSessionContext, compactContext, setCurrentModel, setCurrentThinkLevel } from "../agent/loop.js";
import { transcribeAudio } from "../services/whisper.js";
import { generateSpeech } from "../services/elevenlabs.js";
import { getSessionUsageStats } from "../db/memory.js";

export const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

// Strictly enforce user ID whitelisting
bot.use(whitelistMiddleware);

// --- Widget to Keyboard Parser ---
function extractWidgetsAndBuildKeyboard(text: string): { cleanText: string; replyMarkup: any } {
    let cleanText = text;
    let labels: string[] = [];

    const widgetRegex = /<widget[\s\S]*?<\/widget>/gi;
    const widgetMatches = [...text.matchAll(widgetRegex)];

    for (const match of widgetMatches) {
        const widgetHtml = match[0];
        const buttonRegex = /<button[^>]*>(.*?)<\/button>/gi;
        const buttonMatches = [...widgetHtml.matchAll(buttonRegex)];
        for (const btnMatch of buttonMatches) {
            labels.push(btnMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim());
        }
    }

    cleanText = text.replace(widgetRegex, "").trim();

    let replyMarkup = undefined;
    if (labels.length > 0) {
        const keyboard = new Keyboard();
        labels.forEach(l => keyboard.text(l).row());
        replyMarkup = keyboard.oneTime().resized();
    }

    return { cleanText, replyMarkup };
}

// --- Slash Commands ---

bot.command("start", async (ctx) => {
    await ctx.reply("👋 Hello! I am Gravity Claw. I am your fully autonomous personal AI assistant. I can process text, voice notes, and access local tools. How can I help you today?");
});

bot.command("new", async (ctx) => {
    await resetSessionContext(ctx.chat.id.toString());
    await ctx.reply("🧹 *Context Wiped:*\nI've cleared the recent conversation window. (My long-term vectorized memory is unaffected).", { parse_mode: "Markdown" });
});

bot.command("status", async (ctx) => {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const ramUsage = Math.round(process.memoryUsage().rss / 1024 / 1024);

    const message = `📊 *Gravity Claw Status*\n` +
        `• Engine: Gemini 2.5 Pro\n` +
        `• Memory: SQLite (FTS5 enabled)\n` +
        `• Uptime: ${hours}h ${minutes}m\n` +
        `• RAM: ${ramUsage} MB`;

    await ctx.reply(message, { parse_mode: "Markdown" });
});



bot.command("usage", async (ctx) => {
    const stats = getSessionUsageStats();
    const tokenEstimate = Math.round(stats.charCount / 4);

    const message = `📉 *Session Usage Tracking*\n` +
        `_Stats since last /new context wipe_\n\n` +
        `• *Messages Exchanged:* \`${stats.messageCount}\`\n` +
        `• *Total Characters:* \`${stats.charCount.toLocaleString()}\`\n` +
        `• *Estimated Tokens:* \`~${tokenEstimate.toLocaleString()}\``;

    await ctx.reply(message, { parse_mode: "Markdown" });
});

bot.command("compact", async (ctx) => {
    await ctx.replyWithChatAction("typing");
    const result = await compactContext();
    await ctx.reply(result as string, { parse_mode: "Markdown" });
});

bot.command("model", async (ctx) => {
    const rawArgs = ctx.message?.text?.split(" ") || [];
    rawArgs.shift(); // remove /model
    const modelTarget = rawArgs.join(" ").trim();

    if (!modelTarget) {
        await ctx.reply("❌ Usage: `/model google/gemini-2.5-pro`", { parse_mode: "Markdown" });
        return;
    }

    setCurrentModel(modelTarget);
    await ctx.reply(`✅ *Intelligence Engine Swapped*\nNow routing through: \`${modelTarget}\``, { parse_mode: "Markdown" });
});

bot.command("think", async (ctx) => {
    const rawArgs = ctx.message?.text?.split(" ") || [];
    rawArgs.shift();
    const level = rawArgs.join(" ").trim().toLowerCase();

    if (["high", "low", "default"].includes(level)) {
        setCurrentThinkLevel(level);
        await ctx.reply(`🧠 *Cognitive Level Adjusted*\nThinking mode is now set to: \`${level}\``, { parse_mode: "Markdown" });
    } else {
        await ctx.reply("❌ Usage: `/think <high|low|default>`", { parse_mode: "Markdown" });
    }
});

// --- Chat Handlers ---

bot.on("message:text", async (ctx) => {
    let userMessage = ctx.message.text;

    // --- Group Management ---
    if (ctx.chat.type !== "private") {
        const isMentioned = userMessage.includes(`@${ctx.me.username}`);
        const isReplyToBot = ctx.message.reply_to_message?.from?.id === ctx.me.id;

        if (!isMentioned && !isReplyToBot) {
            return; // Ignore general chatter in groups
        }

        // Strip the bot's username so it doesn't pollute the prompt
        userMessage = userMessage.replace(`@${ctx.me.username}`, "").trim();
    }

    // Show typing indicator on a loop to ensure it doesn't timeout during long agent reasoning
    let typingInterval = setInterval(() => ctx.replyWithChatAction("typing").catch(() => { }), 4000);
    await ctx.replyWithChatAction("typing");

    try {
        let reply = await runAgentLoop(userMessage, undefined, undefined, ctx.chat.id.toString());
        // Parse widgets into native Telegram keyboards
        const { cleanText, replyMarkup } = extractWidgetsAndBuildKeyboard(reply);

        if (replyMarkup) {
            await ctx.reply(cleanText, { reply_markup: replyMarkup });
        } else {
            await ctx.reply(cleanText);
        }
    } catch (error) {
        console.error("Agent Loop Error:", error);
        await ctx.reply("Sorry, I encountered an internal error processing your request.");
    } finally {
        clearInterval(typingInterval);
    }
});

bot.on("message:voice", async (ctx) => {
    // --- Group Management ---
    if (ctx.chat.type !== "private") {
        const isReplyToBot = ctx.message.reply_to_message?.from?.id === ctx.me.id;

        // Telegram Voice notes don't embed text mentions easily, so in groups, 
        // you must directly reply to the bot with a voice note for it to hear you.
        if (!isReplyToBot) {
            return;
        }
    }

    const fileId = ctx.message.voice.file_id;

    await ctx.replyWithChatAction("record_voice");

    try {
        // 1. Get the file info from Telegram
        const file = await ctx.api.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

        // 2. Download the voice note locally
        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 3. Let the user know we heard them
        await ctx.reply(`🎤 _Processing voice note natively..._`, { parse_mode: "Markdown" });

        let typingInterval = setInterval(() => ctx.replyWithChatAction("typing").catch(() => { }), 4000);
        await ctx.replyWithChatAction("typing");

        let replyText: string;
        try {
            // Write buffer to temporary file for Whisper
            const tempFilePath = path.join(process.cwd(), `temp_voice_${Date.now()}.ogg`);
            fs.writeFileSync(tempFilePath, buffer);

            // Transcribe using Whisper
            await ctx.reply(`🎙️ _Transcribing audio with Whisper..._`, { parse_mode: "Markdown" });
            const transcription = await transcribeAudio(tempFilePath);

            // Clean up temp file
            fs.unlinkSync(tempFilePath);

            await ctx.reply(`🗣️ *You said:* "${transcription}"`, { parse_mode: "Markdown" });

            // 4. Run the conversational agent loop with the transcribed text
            replyText = await runAgentLoop(transcription, undefined, undefined, ctx.chat.id.toString());
        } finally {
            clearInterval(typingInterval);
        }

        let recordingInterval = setInterval(() => ctx.replyWithChatAction("record_voice").catch(() => { }), 4000);
        await ctx.replyWithChatAction("record_voice");

        try {
            // 5. Generate TTS audio with ElevenLabs
            const { cleanText, replyMarkup } = extractWidgetsAndBuildKeyboard(replyText);
            const audioBuffer = await generateSpeech(cleanText);

            // 6. Send the generated speech and the text backup with buttons natively
            if (replyMarkup) {
                await ctx.reply(cleanText, { reply_markup: replyMarkup });
            } else {
                await ctx.reply(cleanText);
            }
            await ctx.replyWithVoice(new InputFile(audioBuffer, "response.mp3"));
        } finally {
            clearInterval(recordingInterval);
        }

    } catch (error: any) {
        console.error("Voice Processing Error:", error);
        fs.appendFileSync("debug-voice.log", `\n\n[Voice Error] ${new Date().toISOString()}\n${error.stack || error.message || error}`);
        await ctx.reply("Sorry, I encountered an error processing your voice message.");
    }
});

bot.on(["message:photo", "message:document"], async (ctx) => {
    // --- Group Management ---
    if (ctx.chat.type !== "private") {
        const isMentioned = ctx.message.caption?.includes(`@${ctx.me.username}`);
        const isReplyToBot = ctx.message.reply_to_message?.from?.id === ctx.me.id;

        if (!isMentioned && !isReplyToBot) {
            return;
        }
    }

    let fileId: string;
    let mimeType: string;

    if (ctx.message.photo) {
        // Get the highest resolution photo
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        fileId = photo.file_id;
        mimeType = "image/jpeg";
    } else if (ctx.message.document) {
        fileId = ctx.message.document.file_id;
        mimeType = ctx.message.document.mime_type || "application/octet-stream";
    } else {
        return;
    }

    let userMessage = ctx.message.caption || "";
    userMessage = userMessage.replace(`@${ctx.me.username}`, "").trim();

    await ctx.replyWithChatAction("typing");

    try {
        const file = await ctx.api.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

        const response = await fetch(fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let typingInterval = setInterval(() => ctx.replyWithChatAction("typing").catch(() => { }), 4000);

        try {
            let replyText = await runAgentLoop(userMessage || "Describe this file.", [{ buffer, mimeType }], undefined, ctx.chat.id.toString());
            // Map dashboard widgets into native Telegram buttons
            const { cleanText, replyMarkup } = extractWidgetsAndBuildKeyboard(replyText);
            if (replyMarkup) {
                await ctx.reply(cleanText, { reply_markup: replyMarkup });
            } else {
                await ctx.reply(cleanText);
            }
        } finally {
            clearInterval(typingInterval);
        }

    } catch (error) {
        console.error("Multimodal Processing Error:", error);
        await ctx.reply("Sorry, I encountered an error analyzing your file.");
    }
});

export function startBot() {
    console.log("Starting Gravity Claw bot...");
    bot.start({
        onStart: (botInfo) => {
            console.log(`Bot initialized as @${botInfo.username}`);
        }
    });
}
