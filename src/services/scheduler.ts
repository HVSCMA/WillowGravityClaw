import cron from "node-cron";
import { bot } from "../bot/telegram.js";
import { config } from "../config.js";
import { runAgentLoop } from "../agent/loop.js";
import { generateSpeech } from "./elevenlabs.js";
import { InputFile } from "grammy";

// For testing purposes, we use every minute.
// In production, this would be "0 4 * * *" for 8:00 AM daily in UTC+4.
const SCHEDULE = "0 4 * * *";

export function startScheduler() {
    console.log(`[Scheduler] Starting proactive systems...`);
    console.log(`  - Morning Briefing: ${config.CRON_MORNING_BRIEFING}`);
    console.log(`  - Evening Recap: ${config.CRON_EVENING_RECAP}`);
    console.log(`  - Hourly Heartbeat: ${config.CRON_HEARTBEAT}`);

    // === Morning Briefing ===
    cron.schedule(config.CRON_MORNING_BRIEFING, async () => {
        console.log(`[Scheduler] 🌅 Morning Briefing triggered.`);
        const prompt = `DO NOT mention that this is an automated response. You are reaching out to the user proactively to give them their Morning Briefing. Review recent SQLite memory and scheduled tasks, summarize their status, mention any relevant weather/news you can find or infer, and give a motivational start to the day. Use Telegram Markdown.`;
        await executeProactivePush(prompt, "🌅 *Morning Briefing*\n\n");
    });

    // === Evening Recap ===
    cron.schedule(config.CRON_EVENING_RECAP, async () => {
        console.log(`[Scheduler] 🌙 Evening Recap triggered.`);
        const prompt = `DO NOT mention that this is an automated response. You are reaching out to the user proactively to give them their Evening Recap. Review the SQLite memory for what was accomplished today, list any pending items that rolled over, and wind down the day. Use Telegram Markdown.`;
        await executeProactivePush(prompt, "🌙 *Evening Recap*\n\n");
    });

    // === Hourly Heartbeat / Smart Recommendations ===
    cron.schedule(config.CRON_HEARTBEAT, executeHeartbeat);
}

export async function executeHeartbeat() {
    console.log(`[Scheduler] 💓 Heartbeat triggered (Manual/Test).`);
    const prompt = `DO NOT mention that this is an automated response. This is your Hourly Heartbeat. Silently analyze the user's latest context and memory. If there is a highly actionable insight, smart recommendation, or something critical they forgot, output a SHORT 1-2 sentence message. 

CRITICAL INSTRUCTION: Be EXTREMELY RELUCTANT to speak. If the user doesn't strictly need to be interrupted right now, YOU MUST RETURN THE EXACT STRING "SILENT" AND ABSOLUTELY NOTHING ELSE. DO NOT EXPLAIN YOUR REASONING. DO NOT OUTPUT ANY OTHER TEXT. JUST "SILENT".`;

    try {
        const rawResponse = await runAgentLoop(prompt);

        // If the agent decides silence is better, do nothing (strip whitespace/markdown)
        const cleanResponse = rawResponse.replace(/`/g, "").trim().toUpperCase();

        // Do not send if it's an internal error fallback message
        if (cleanResponse.includes("ERROR INTERACTING WITH INTELLIGENCE ENGINE") || cleanResponse.includes("ERROR:")) {
            console.log(`[Scheduler] Heartbeat suppressed: API error.`);
            return;
        }

        if (cleanResponse.includes("SILENT") || cleanResponse === "") {
            console.log(`[Scheduler] 🤫 Heartbeat determined no action was needed.`);
            return;
        }

        await executeProactivePush(prompt, "💓 *Heartbeat Alert*\n\n", rawResponse);
    } catch (error) {
        console.error(`[Scheduler] Heartbeat processing error:`, error);
    }
}

// Helper function to execute the push to all whitelisted users
export async function executeProactivePush(systemPrompt: string, prefix: string, preGeneratedText?: string) {
    try {
        const textToSend = preGeneratedText || await runAgentLoop(systemPrompt);

        // Do not send if it's an internal error fallback message
        const cleanText = textToSend.replace(/`/g, "").trim().toUpperCase();
        if (cleanText.includes("ERROR INTERACTING WITH INTELLIGENCE ENGINE") || cleanText.includes("ERROR:")) {
            console.log(`[Scheduler] Proactive push suppressed: API error detected.`);
            return;
        }

        // Generate the Voice Note via ElevenLabs
        console.log(`[Scheduler] Generating TTS Voice Note for push...`);
        const audioBuffer = await generateSpeech(textToSend);

        // Broadcast to all whitelisted users
        for (const userId of config.TELEGRAM_USER_ID_WHITELIST) {
            console.log(`[Scheduler] Sending push to user ${userId}...`);
            try {
                await bot.api.sendMessage(userId, `${prefix}${textToSend}`, { parse_mode: "Markdown" });
                await bot.api.sendVoice(userId, new InputFile(audioBuffer, "proactive_audio.mp3"));
            } catch (sendErr) {
                console.error(`[Scheduler] Failed to send push to ${userId}:`, sendErr);
            }
        }
        console.log(`[Scheduler] Push complete.`);
    } catch (error) {
        console.error(`[Scheduler] Error during proactive execution:`, error);
    }
}
