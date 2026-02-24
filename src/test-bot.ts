import { bot } from "./bot/telegram.js";
import { config } from "./config.js";

async function runTest() {
    console.log("Simulating incoming message from whitelisted user...");

    const userId = config.TELEGRAM_USER_ID_WHITELIST[0];

    try {
        // We can just ask the agent loop directly first to make sure Anthropic is working too, 
        // or just send a direct message via Grammy to verify Telegram integration.

        console.log("Testing Telegram API Connection by sending a direct message...");
        await bot.api.sendMessage(
            userId,
            "🟢 Gravity Claw Initialized!\n\nI am testing my Telegram integration and Anthropic API. One moment..."
        );
        console.log("Direct message sent successfully to user.");

        // Now trigger the actual handleUpdate to test the Claude Agent Loop
        const mockUpdate = {
            update_id: 10000,
            message: {
                message_id: 1,
                from: {
                    id: userId,
                    is_bot: false,
                    first_name: "TestUser",
                },
                chat: {
                    id: userId,
                    type: "private",
                },
                date: Math.floor(Date.now() / 1000),
                text: "What time is it locally right now?",
            },
        };

        console.log("Injecting mock user message to trigger Claude Agent Loop...");
        await bot.init();
        await bot.handleUpdate(mockUpdate as any);
        console.log("Mock update processed! You should see Claude's response on your phone.");

    } catch (error: any) {
        if (error.description?.includes("bot can't initiate conversation with a user") || error.description?.includes("bot was blocked")) {
            console.error("\n❌ TELEGRAM ERROR: The bot cannot send messages to you yet.");
            console.error("Please open Telegram, search for your bot, and click the 'Start' button or send a message first.\n");
        } else {
            console.error("Test failed:", error);
        }
        process.exit(1);
    }

    process.exit(0);
}

runTest();
