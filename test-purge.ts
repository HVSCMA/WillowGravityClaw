import { resetSessionContext } from './src/agent/loop.js';
import dotenv from 'dotenv';
dotenv.config();

async function purgePirateMemory() {
    console.log("Purging all memory for the 'web-dashboard' session to remove the pirate context virus...");
    await resetSessionContext("web-dashboard");
    console.log("Memory purged. The agent should now spawn with a clean, Sovereign Architect persona.");
    process.exit(0);
}

purgePirateMemory();
