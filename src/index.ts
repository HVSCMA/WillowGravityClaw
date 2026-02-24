import { startBot } from "./bot/telegram.js";
import { startScheduler } from "./services/scheduler.js";
import { startServer } from "./server.js";
import { config } from "./config.js";
import { initDb } from "./db/index.js";

console.log("Initializing Gravity Claw Level 1...");
initDb();
console.log(`Whitelisted User IDs: ${config.TELEGRAM_USER_ID_WHITELIST.join(", ")}`);

startServer();
startScheduler();
startBot();

// Basic unhandled rejection handler to avoid crashes
process.on("unhandledRejection", (err) => {
    console.error("Unhandled Promise Rejection:", err);
});
