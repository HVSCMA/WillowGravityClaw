import { runAgentLoop } from "./src/agent/loop.js";

async function run() {
    try {
        console.log("Running agent loop to trigger a tool call...");
        const result = await runAgentLoop("Call the list_directory tool right now to show me the files in this directory.");
        console.log("Result:", result);
    } catch (e) {
        console.error("Caught unhandled error:", e);
    }
}

run();
