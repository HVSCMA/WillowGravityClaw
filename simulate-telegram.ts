import dotenv from 'dotenv';
import { runAgentLoop } from './src/agent/loop.js';

dotenv.config();

async function simulateTelegramMessage() {
    console.log("=========================================");
    console.log(" 📱 SIMULATING TELEGRAM MESSAGE ARRIVAL");
    console.log("=========================================");
    console.log("Simulating user asking a question from their phone via Telegram.");
    console.log("Using session_id (chat.id) = 'CROSS_DEVICE_TEST'");

    try {
        const reply = await runAgentLoop(
            "Do you remember what my favorite animal is? I told you on the Web Dashboard a second ago.",
            undefined,
            undefined,
            "CROSS_DEVICE_TEST"
        );

        console.log("\n🤖 Agent's Reply on Telegram: ");
        console.log(reply);

        console.log("\n=========================================");
        console.log(" ✅ TEST COMPLETE");
        console.log("=========================================");
    } catch (err) {
        console.error("Error during simulation:", err);
    }

    process.exit(0);
}

simulateTelegramMessage();
