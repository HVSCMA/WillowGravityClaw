import { executeHeartbeat } from "./src/services/scheduler.js";

async function main() {
    console.log("--- Starting Heartbeat End-to-End Test ---");
    await executeHeartbeat();
    console.log("--- Heartbeat Test Complete ---");
    process.exit(0);
}

main();
