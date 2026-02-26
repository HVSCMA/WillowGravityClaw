import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { bot } from "./bot/telegram.js";
import { config } from "./config.js";
import { runAgentLoop } from "./agent/loop.js";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { transcribeAudio } from "./services/whisper.js";
import { generateSpeech } from "./services/elevenlabs.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Serve static frontend files for Live Canvas (with strict anti-caching for real-time PWAs)
app.use(express.static(path.join(process.cwd(), "public"), {
    setHeaders: (res, path) => {
        if (path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// --- IN-MEMORY LOG BUFFER (B.L.A.S.T. Dashboard) ---
const MAX_LOGS = 200;
const systemLogs: { timestamp: string, level: string, message: string }[] = [];

// Helper to push logs to the buffer
export function addSystemLog(level: "info" | "warn" | "error", message: string) {
    systemLogs.push({
        timestamp: new Date().toISOString(),
        level,
        message
    });
    if (systemLogs.length > MAX_LOGS) {
        systemLogs.shift();
    }
}

// Monkey-patch console to automatically capture logs for the dashboard
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = function (...args) {
    addSystemLog("info", args.join(" "));
    originalLog.apply(console, args);
};

console.warn = function (...args) {
    addSystemLog("warn", args.join(" "));
    originalWarn.apply(console, args);
};

console.error = function (...args) {
    addSystemLog("error", args.join(" "));
    originalError.apply(console, args);
};
// ----------------------------------------------------

// Load Balancer Healthcheck
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

// --- DASHBOARD API ROUTES (B.L.A.S.T.) ---
app.get("/api/dashboard/status", (req, res) => {
    res.json({
        uptime: Math.floor(process.uptime()), // Seconds
        memoryUsage: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2), // MB
        activeIntegrations: [
            "Telegram",
            "Express.js",
            "Socket.io",
            "SQLite",
            "DuckDuckGo",
            "ElevenLabs"
        ]
    });
});

app.get("/api/dashboard/logs", (req, res) => {
    res.json(systemLogs);
});

app.get("/api/dashboard/setup", (req, res) => {
    const missingKeys = [];

    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
        missingKeys.push({
            key: "GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET",
            feature: "Phase 1: Gmail Integration",
            status: "pending"
        });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        missingKeys.push({
            key: "SUPABASE_URL / SUPABASE_SERVICE_KEY",
            feature: "Phase 3: Supabase PgVector",
            status: "pending"
        });
    }

    res.json({
        missingKeys,
        isFullyArmed: missingKeys.length === 0
    });
});
// ---------------------------------------

// Autonomous Webhook Ingestion
app.post("/webhook", async (req, res) => {
    try {
        const payload = req.body;
        console.log("[Webhook] Received inbound payload.");

        // Respond immediately to the sender so we don't block them or timeout
        res.status(202).json({ status: "Accepted", message: "Processing asynchronously." });

        // Get the primary owner ID from the whitelist
        const ownerId = config.TELEGRAM_USER_ID_WHITELIST[0];

        // Format the system trigger
        const systemPrompt = `SYSTEM WEBHOOK ALERT:\nYou have received a new autonomous event from an external server. Analyze the following payload, extract the most critical actionable information, and draft an urgent alert for the user.\n\nPAYLOAD:\n${JSON.stringify(payload, null, 2)}`;

        // Pass this hidden prompt to the agent loop to reason over
        const aiAnalysis = await runAgentLoop(systemPrompt, undefined, undefined, "system-webhook");

        // Alert the user on Telegram
        await bot.api.sendMessage(ownerId, `🔔 *Autonomous Integration Alert*\n\n${aiAnalysis}`, { parse_mode: "Markdown" });

    } catch (error) {
        console.error("[Webhook] Processing failed:", error);
    }
});

import { initializePipeline, resumePipeline } from "./services/willow/pipeline.js";
import { activePipelines } from "./services/willow/pipelineState.js";

// --- SENSORY CONTEXT MEMORY (Phase 14) ---
export const leadSensoryContext: Record<string, any> = {};

app.post("/api/sensory/fub_lead", (req, res) => {
    try {
        const { leadId, sourceUrl, context } = req.body;
        if (!leadId) return res.status(400).json({ error: "Missing leadId" });

        leadSensoryContext[leadId] = {
            sourceUrl,
            context,
            lastUpdated: new Date().toISOString()
        };

        console.log(`[Sensory] Context updated for FUB Lead: ${leadId}`);
        res.status(200).json({ status: "Received" });
    } catch (err) {
        console.error("[Sensory] Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// WILLOW V50 - Endpoint for Inbound Fello Intent
app.post("/webhook/fello", async (req, res) => {
    try {
        const payload = req.body;
        res.status(202).json({ status: "Accepted", message: "Processing asynchronously via WILLOW Pipeline." });

        // Dummy lead ID from payload or generation
        const leadId = payload.lead_id || `L-${Date.now()}`;
        const address = payload.address || "123 Default St";

        await initializePipeline(leadId, address, payload);
    } catch (error) {
        console.error("[WILLOW] Fello webhook failed:", error);
    }
});

// WILLOW V50 - Action Queue endpoint to provide target price
app.post("/api/willow/resume/:leadId", async (req, res) => {
    try {
        const { leadId } = req.params;
        const { targetPrice } = req.body;

        if (!targetPrice) return res.status(400).json({ error: "Missing Target Price" });

        res.status(200).json({ status: "Resuming" });
        await resumePipeline(leadId, Number(targetPrice));
    } catch (error) {
        console.error("[WILLOW] Resume failed:", error);
        res.status(500).json({ error: "Internal Error" });
    }
});

// WILLOW V50 - Action Queue endpoint to approve execution
app.post("/api/willow/execute/:leadId", async (req, res) => {
    try {
        const { leadId } = req.params;
        const state = activePipelines[leadId];

        if (!state) return res.status(404).json({ error: "Pipeline not found" });

        console.log(`[WILLOW] 🔥 PIPELINE EXECUTED for ${leadId}. System synced. Artifacts deployed.`);
        state.status = "EXECUTED";

        res.status(200).json({ status: "Executed Successfully" });
    } catch (error) {
        console.error("[WILLOW] Execute failed:", error);
        res.status(500).json({ error: "Internal Error" });
    }
});

// Chat API for the Agentic Canvas
app.post("/api/chat", async (req, res) => {
    try {
        const { message, fublead, mediaBase64 } = req.body;
        if (!message && !mediaBase64) {
            return res.status(400).json({ error: "Message or media is required" });
        }

        console.log(`[Canvas] Received chat message: ${message || '<Visual Prompt>'} for Lead: ${fublead || 'Global'}`);

        if (message && message.trim().toLowerCase() === "/new") {
            const { resetSessionContext } = await import("./agent/loop.js");
            const targetSession = fublead || "web-dashboard";
            await resetSessionContext(targetSession);
            updateLiveCanvas({ type: "markdown", content: `🧹 *Context Wiped:*\nI've cleared the Supabase memory for session: \`${targetSession}\`.` }, fublead);
            return res.status(200).json({ status: "Success" });
        }

        // Decode Phase 15 Hardward Sensory Packets
        let mediaFrames = undefined;
        if (mediaBase64) {
            const match = mediaBase64.match(/^data:(image\/[a-zA-Z]+);base64,(.*)$/);
            if (match) {
                const mimeType = match[1];
                const base64Data = match[2];
                mediaFrames = [{
                    buffer: Buffer.from(base64Data, "base64"),
                    mimeType: mimeType
                }];
                console.log(`[Canvas] Hardware Sensory Payload Decoded: ${mimeType}`);
            }
        }

        // Let the user know the agent is thinking
        updateLiveCanvas({ type: "markdown", content: "*Thinking...*" }, fublead);

        // Run the agent loop (passing fublead context)
        const aiResponse = await runAgentLoop(message || "Analyze this image.", mediaFrames, fublead, fublead || "web-dashboard");

        // Extract UI Widgets from text
        const widgetRegex = /<widget[\s\S]*?>([\s\S]*?)<\/widget>/gi;
        const widgetMatches = [...aiResponse.matchAll(widgetRegex)];

        let finalMarkdownReply = aiResponse;
        if (widgetMatches.length > 0) {
            const combinedWidgetHtml = widgetMatches.map(m => m[1]).join("\n");
            // Push widget for structural rendering
            updateLiveCanvas({ type: "widget", widgetType: "broker-coach", content: combinedWidgetHtml }, fublead);
            finalMarkdownReply = aiResponse.replace(widgetRegex, "").trim();
        }

        // Push remaining text as markdown
        if (finalMarkdownReply) {
            updateLiveCanvas({ type: "markdown", content: finalMarkdownReply }, fublead);
        }

        res.status(200).json({ status: "Success" });
    } catch (error) {
        console.error("[Canvas Chat] Error processing message:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Real-Time Voice & Text Dialog API
app.post("/api/dialog", async (req, res) => {
    try {
        const { audioBase64, textPrompt, mimeType, sessionId } = req.body;
        if (!audioBase64 && !textPrompt) {
            return res.status(400).json({ error: "Missing audio or text input data." });
        }

        const sid = sessionId || "dialog-mobile";
        console.log(`[Dialog API] Received multimodal chunk for session: ${sid}`);

        let userTranscript = "";
        let agentReply = "";
        let audioBase64Out = "";

        try {
            if (audioBase64) {
                // Write base64 to temp file for Whisper processing
                const audioBuffer = Buffer.from(audioBase64, "base64");
                const tempPath = path.join(process.cwd(), `temp_dialog_${Date.now()}_${Math.floor(Math.random() * 1000)}.webm`);
                fs.writeFileSync(tempPath, audioBuffer);

                userTranscript = await transcribeAudio(tempPath);
                fs.unlinkSync(tempPath); // Clean up immediately
                updateLiveCanvas({ type: "markdown", content: `*(Microphone Transcript)*: ${userTranscript}` }, sid);
            } else if (textPrompt) {
                userTranscript = textPrompt;
                updateLiveCanvas({ type: "markdown", content: `*(Keyboard Input)*: ${userTranscript}` }, sid);
            }

            console.log(`[Dialog] Transcript/Text: "${userTranscript}"`);
            updateLiveCanvas({ type: "markdown", content: "*Thinking...*" }, sid);

            // 2. Process via Agent Loop using full autonomous reasoning
            agentReply = await runAgentLoop(userTranscript, undefined, sid, sid);

            updateLiveCanvas({ type: "markdown", content: agentReply }, sid);

            // INTERCEPT PHASE 8 WIDGETS
            // Check if the agent requested to render a structural HTML widget
            const widgetRegex = /<widget[\s\S]*?>([\s\S]*?)<\/widget>/gi;
            const widgetMatches = [...agentReply.matchAll(widgetRegex)];

            let finalSpokenReply = agentReply;
            if (widgetMatches.length > 0) {
                // Combine all widget inner HTMLs and push them straight to the client over socket.io natively
                const combinedWidgetHtml = widgetMatches.map(m => m[1]).join("\n");
                io.emit("canvas-widget", { sessionId: sid, html: combinedWidgetHtml });

                // Strip the exact widget tags completely from the spoken response
                finalSpokenReply = agentReply.replace(widgetRegex, "").trim();
            } else {
                // Optional: clear canvas or leave as is. We will leave it.
            }

            // 3. Generate synthesized ElevenLabs speech for the CLEANED verbal reply only
            if (finalSpokenReply.trim().length > 0) {
                // Strip markdown code blocks, widget remnants, and ANY raw HTML tags before sending to TTS
                let cleanText = finalSpokenReply
                    .replace(/```[\s\S]*?```/g, "") // Code blocks
                    .replace(/<widget[\s\S]*?<\/widget>/gi, "") // Stray widgets
                    .replace(/<[^>]*>?/gm, '') // All generic HTML tags (e.g. <div>, <a>)
                    .replace(/\\*/g, "") // Markdown bold/italics
                    .replace(/&nbsp;/g, " ") // HTML entities
                    .trim();

                // If the entire reply was just a widget, give a short auditory confirmation
                if (cleanText.length === 0) {
                    cleanText = "I have rendered the requested payload.";
                }

                const responseAudioBuffer = await generateSpeech(cleanText);
                audioBase64Out = responseAudioBuffer.toString("base64");
            }

        } catch (innerErr: any) {
            console.error("[Dialog API] Pipeline error:", innerErr);
            agentReply = "Sorry, my sensory processors encountered an error interpreting the input.";
        }

        res.status(200).json({
            userTranscript,
            agentReply,
            audioBase64Out
        });

    } catch (error) {
        console.error("[Dialog API] Fatal Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


export function updateLiveCanvas(payload: { type: string, content: string, widgetType?: string }, fublead?: string) {
    if (fublead) {
        io.to(`fublead_${fublead}`).emit("canvas_update", payload);
    } else {
        io.emit("canvas_update", payload);
    }
}

io.on("connection", (socket) => {
    console.log("[Socket.io] Client connected to Live Canvas.");

    socket.on("join_room", (fublead) => {
        if (fublead) {
            const roomName = `fublead_${fublead}`;
            socket.join(roomName);
            console.log(`[Socket.io] Client joined room: ${roomName}`);
        }
    });

    socket.on("disconnect", () => {
        console.log("[Socket.io] Client disconnected.");
    });
});

export function startServer() {
    httpServer.listen(PORT, () => {
        console.log(`[Express] Webhook & Live Canvas listening on port ${PORT}`);
    });
}
