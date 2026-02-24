import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/index.mjs";
import { config } from "../config.js";
import { getTools, executeTool } from "./tools.js";
import { getRecentMessages, saveMessage, clearRecentMessages } from "../db/memory.js";
import { loadSystemSkills, buildSkillsPrompt, SystemSkill } from "../tools/skills.js";
import { updateLiveCanvas } from "../server.js";

export function resetContext() {
    clearRecentMessages();
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

// Cache for loaded skills
let loadedSkills: SystemSkill[] | null = null;

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
    media?: { buffer: Buffer; mimeType: string }[]
): Promise<string> {

    const messageLog = media ? `[Attachments: ${media.map(m => m.mimeType).join(', ')}] ${userMessage} ` : userMessage;
    saveMessage("user", messageLog);

    const recentDbMessages = getRecentMessages(10);

    const conversationHistory: ChatCompletionMessageParam[] = recentDbMessages.map(msg => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
    }));

    // Inject system instructions and thinking levels
    let systemPrompt = "You are Gravity Claw, a personal AI agent. You have access to tools that you can use to answer questions or use your memory.";
    if (currentThinkLevel === "high") {
        systemPrompt += "\nCRITICAL: Think deeply and step-by-step before answering. Exhaustively analyze the user's intent.";
    } else if (currentThinkLevel === "low") {
        systemPrompt += "\nCRITICAL: Be extremely concise and fast. Do not use tools unless absolutely necessary.";
    }

    // Load skills once and cache them
    if (loadedSkills === null) {
        loadedSkills = await loadSystemSkills();
    }
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
            const dataUrl = `data:${item.mimeType}; base64, ${b64} `;
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
                    updateLiveCanvas({ type: "markdown", content: `*Agent is using tool:* \`${toolName}\`...` });

                    const result = await executeTool(toolName, args);

                    // ROI GATE: Detect tool errors
                    const resultStr = typeof result === "string" ? result : JSON.stringify(result);
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
                saveMessage("model", finalAns);
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
    const recentDbMessages = getRecentMessages(50);

    if (recentDbMessages.length < 2) {
        return "Context is already small, nothing to compact.";
    }

    const conversationHistory: ChatCompletionMessageParam[] = recentDbMessages.map(msg => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
    }));

    conversationHistory.push({
        role: "user",
        content: "CRITICAL SYSTEM INSTRUCTION: Summarize the entire conversation above into a concise, dense paragraph of core facts, context, and the current state of tasks. Exclude pleasantries and verbosity. This summary will replace the actual conversation history in the database, so ensure absolutely nothing critical or factual is lost."
    });

    console.log("[Agent] Compacting context window...");

    try {
        const response = await ai.chat.completions.create({
            model: currentModel,
            messages: conversationHistory
        });

        const summary = response.choices[0]?.message?.content || "Failed to generate summary.";

        clearRecentMessages();
        saveMessage("model", `[COMPACTED CONTEXT] ${summary} `);

        return "🧠 *Context Compacted:*\nYour conversation history has been successfully compressed into a dense summary, freeing up working memory.";
    } catch (error) {
        console.error("Compaction error:", error);
        return "Failed to compact context due to an API error.";
    }
}
