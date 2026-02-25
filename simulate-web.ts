import { runAgentLoop } from './src/agent/loop.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    console.log("=========================================");
    console.log(" 🌐 SIMULATING WEB DASHBOARD MESSAGE");
    console.log("=========================================");

    const fublead = 'CROSS_DEVICE_TEST';
    const message = "Hi! I wanted to let you know that my favorite animal is a shiny green Platypus.";

    console.log(`Sending Web Dashboard payload (fublead: ${fublead}):\n"${message}"`);

    const result = await runAgentLoop(message, [], fublead, fublead);

    console.log("\n🤖 Agent's Reply on Web Dashboard: \n" + JSON.stringify(result));
    console.log("\n=========================================");
    console.log(" ✅ WEB TEST COMPLETE");
    console.log("=========================================");

    // Wait for the async saveMessage to finish before killing the process
    await new Promise(resolve => setTimeout(resolve, 3000));

    process.exit(0);
}

run();
