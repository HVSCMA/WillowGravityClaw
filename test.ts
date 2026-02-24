import { runAgentLoop } from "./src/agent/loop.js";

async function run() {
    try {
        console.log("Testing Heartbeat prompt...");
        const result = await runAgentLoop(`DO NOT mention that this is an automated response. This is your Hourly Heartbeat. Silently analyze the user's latest context and memory. If there is a highly actionable insight, smart recommendation, or something critical they forgot, output a SHORT 1-2 sentence message. 

CRITICAL INSTRUCTION: IF THERE IS NOTHING CRITICAL TO SAY, YOU MUST RETURN THE EXACT STRING "SILENT" AND ABSOLUTELY NOTHING ELSE. DO NOT EXPLAIN YOUR REASONING. DO NOT OUTPUT ANY OTHER TEXT. JUST "SILENT".`);
        console.log("Result:", result);
    } catch (e) {
        console.error("Test Error:", e);
    }
}

run();
