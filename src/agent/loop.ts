import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/index.mjs";
import { config } from "../config.js";
import { getTools, executeTool } from "./tools.js";
import { getSessionHistory, saveMessage, searchSimilarMessages } from "../memory/supabaseMemory.js";
import { loadSystemSkills, buildSkillsPrompt, SystemSkill } from "../tools/skills.js";
import { updateLiveCanvas } from "../server.js";

export async function resetSessionContext(sessionId: string): Promise<boolean> {
    const { clearSessionHistory } = await import("../memory/supabaseMemory.js");
    return clearSessionHistory(sessionId);
}

// Global state for dynamic model swapping (Sprint 3)
export let currentModel = "google/gemini-2.5-pro";
export let currentThinkLevel = "default";

// Inject helper to change models from telegram.ts
export function setCurrentModel(model: string) {
    currentModel = model;
}

export function setCurrentThinkLevel(level: string) {
    currentThinkLevel = level;
}

// Initialize OpenAI client pointing to OpenRouter
const ai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: config.OPENROUTER_API_KEY || config.OPENAI_API_KEY || "",
    defaultHeaders: {
        "HTTP-Referer": "https://github.com/gravity-claw",
        "X-Title": "Gravity Claw AI",
    }
});

export async function runAgentLoop(
    userMessage: string,
    media?: { buffer: Buffer; mimeType: string }[],
    fublead?: string,
    sessionIdParam?: string
): Promise<string> {
    const sessionId = sessionIdParam || fublead || "default-session";
    const messageLog = media ? `[Attachments: ${media.map(m => m.mimeType).join(', ')}] ${userMessage}` : userMessage;

    // Save User message asynchronously
    saveMessage(sessionId, "user", messageLog);

    // 1. Immediate Chronological Context
    const recentDbMessages = await getSessionHistory(sessionId, 10);

    const conversationHistory: ChatCompletionMessageParam[] = recentDbMessages.map(msg => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
    }));

    // 2. Deep Semantic Context
    let semanticMemoryBlock = "";
    if (userMessage && userMessage.length > 4) {
        const similarMemories = await searchSimilarMessages(userMessage, 0.4, 15, sessionId);
        if (similarMemories.length > 0) {
            semanticMemoryBlock = "\n\n[RELEVANT PAST MEMORIES RETRIEVED VIA SEMANTIC SEARCH]\n" +
                similarMemories.map(m => `[Old Session: ${m.session_id}] ${m.role.toUpperCase()}: ${m.content}`).join("\n");
        }
    }

    // Inject system instructions and thinking levels
    let systemPrompt = "You are Gravity Claw, a personal AI agent. You have access to tools that you can use to answer questions or use your memory.";
    if (semanticMemoryBlock) systemPrompt += semanticMemoryBlock;

    if (currentThinkLevel === "high") {
        systemPrompt += "\nCRITICAL: Think deeply and step-by-step before answering. Exhaustively analyze the user's intent.";
    } else if (currentThinkLevel === "low") {
        systemPrompt += "\nCRITICAL: Be extremely concise and fast. Do not use tools unless absolutely necessary.";
    }

    // Load skills dynamically every time so changes take effect immediately
    const loadedSkills = await loadSystemSkills();
    const skillsPromptBlock = await buildSkillsPrompt(loadedSkills);
    systemPrompt += skillsPromptBlock; // Inject Markdown Skills

    conversationHistory.unshift({ role: "system", content: systemPrompt });

    // Current turn construction
    const currentUserContent: any[] = [];
    if (userMessage) {
        currentUserContent.push({ type: "text", text: userMessage });
    } else if (media && media.length > 0) {
        currentUserContent.push({ type: "text", text: "Look at the attached media." });
    }

    if (media && media.length > 0) {
        for (const item of media) {
            // Convert to base64 Data URL for OpenAI vision
            const b64 = item.buffer.toString("base64");
            const dataUrl = `data:${item.mimeType};base64,${b64}`;
            currentUserContent.push({
                type: "image_url",
                image_url: { url: dataUrl }
            });
        }
    }

    if (currentUserContent.length > 0) {
        conversationHistory.push({
            role: "user",
            content: currentUserContent
        } as ChatCompletionMessageParam);
    }

    let iteration = 0;
    const maxIterations = 5;
    let consecutiveToolErrors = 0; // The ROI Gate Tracker

    while (iteration < maxIterations) {
        console.log(`[Agent] Iteration ${iteration + 1} sending to ${currentModel}...`);

        try {
            const tools = await getTools() as ChatCompletionTool[];

            let activeClient = ai;
            let activeModel = currentModel;

            // Dynamic logic to handle missing OpenRouter keys and fallback cleanly
            if (currentModel === "google/gemini-2.5-pro" || (!config.OPENROUTER_API_KEY && config.GEMINI_API_KEY)) {
                activeClient = new OpenAI({
                    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
                    apiKey: config.GEMINI_API_KEY || ""
                });
                activeModel = "gemini-2.5-pro";
            } else if (!config.OPENROUTER_API_KEY && config.OPENAI_API_KEY) {
                activeClient = new OpenAI({
                    apiKey: config.OPENAI_API_KEY
                });
                activeModel = "gpt-4o-mini"; // Safe fallback
            }

            const response = await activeClient.chat.completions.create({
                model: activeModel,
                messages: conversationHistory,
                tools: tools.length > 0 ? tools : undefined,
            });

            const responseMessage = response.choices[0]?.message;
            if (!responseMessage) {
                return "Error: No response from provider.";
            }

            conversationHistory.push(responseMessage);

            if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                for (const call of responseMessage.tool_calls) {
                    const func = (call as any).function;
                    const toolName = func.name;
                    const args = JSON.parse(func.arguments || "{}");

                    console.log(`[Agent] Calling tool: ${toolName} `);

                    // Broadcast to the PolyMorphic UI that we are using a tool
                    updateLiveCanvas({ type: "markdown", content: `*Agent is using tool:* \`${toolName}\`...` }, fublead);

                    const result = await executeTool(toolName, args, sessionId);

                    // ROI GATE: Detect tool errors
                    const resultStr = typeof result === "string" ? result : JSON.stringify(result);
                    console.log(`[Agent] Tool ${toolName} Returned:`, resultStr.substring(0, 200) + (resultStr.length > 200 ? "..." : ""));
                    if (resultStr.toLowerCase().includes("error")) {
                        consecutiveToolErrors++;
                    } else {
                        consecutiveToolErrors = 0;
                    }

                    if (consecutiveToolErrors >= 2) {
                        console.error("[ROI GATE - THE QUANT] Formally killing recursive processing loop to protect API credits.");
                        return "🚨 *ROI GATE TRIPPED:*\nTHE_QUANT (CFO) detected a recursive processing error and killed the task to protect your API resources. Please check the logs.";
                    }

                    conversationHistory.push({
                        role: "tool",
                        tool_call_id: call.id,
                        content: resultStr
                    });
                }
                iteration++;
            } else {
                const finalAns = responseMessage.content || "No response generated.";
                saveMessage(sessionId, "assistant", finalAns);
                return finalAns;
            }
        } catch (error) {
            console.error("OpenAI/OpenRouter API Error:", error);
            // Auto Fallback logic
            if (currentModel !== "google/gemini-2.5-pro") {
                console.log("[Agent] Triggering fallback to google/gemini-2.5-pro...");
                currentModel = "google/gemini-2.5-pro";
                continue; // Retry with new model
            }
            return "Error interacting with Intelligence Engine.";
        }
    }

    return "Error: Agent reached maximum iterations.";
}

export async function compactContext(): Promise<string> {
    return "🧠 *Context Architecture Upgraded:*\nMemory compaction is no longer required. Gravity Claw now relies on persistent vector database architecture (Supabase + pgvector) for scalable, infinite semantic retrieval.";
}
