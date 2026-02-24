import { getRecentMessages } from "./src/db/memory.js";

async function main() {
    console.log("Reading memory...");
    const recentDbMessages = getRecentMessages(10);
    console.log(JSON.stringify(recentDbMessages, null, 2));
    process.exit(0);
}

main();

main();
