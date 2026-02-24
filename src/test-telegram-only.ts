import { bot } from "./bot/telegram.js";
import { config } from "./config.js";

async function testTelegramConnection() {
    console.log("Testing Telegram Bot Connection...");

    try {
        // 1. Verify Bot Token (getMe)
        const me = await bot.api.getMe();
        console.log(`✅ Success! Authenticated as bot: @${me.username} (ID: ${me.id})`);

        // 2. Try sending a message to the whitelisted user
        const userId = config.TELEGRAM_USER_ID_WHITELIST[0];
        console.log(`Attempting to send a test message to whitelisted user ID: ${userId}...`);

        await bot.api.sendMessage(
            userId,
            `🟢 **Gravity Claw Connection Test**\n\nYour Telegram bot is successfully connected and able to send messages!\n\n*(Note: The Anthropic API account currently needs credits to process actual conversations).*`,
            { parse_mode: "Markdown" }
        );

        console.log("✅ Message sent successfully!");
        console.log("\nTELEGRAM INTEGRATION IS FULLY CONFIRMED.");

    } catch (error: any) {
        console.error("❌ Telegram Test Failed:", error.description || error.message);
    }

    process.exit(0);
}

testTelegramConnection();
