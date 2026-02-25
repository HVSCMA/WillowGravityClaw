import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function nukeDatabaseAndCheckServer() {
    console.log("💣 NUKING ALL CONVERSATIONAL MEMORY FROM SUPABASE...");

    // Delete all vectors/messages to kill the pirate context loop
    const { error } = await supabase
        .from('messages')
        .delete()
        .neq('role', 'impossible_role_to_match');

    if (error) {
        console.error("❌ Failed to wipe Supabase:", error);
    } else {
        console.log("✅ Supabase 'messages' table completely sanitized.");
    }

    console.log("\n📡 Checking Railway Production Server Status...");
    try {
        const res = await fetch("https://gravity-claw-production-6f74.up.railway.app/api/dashboard/status");
        if (res.ok) {
            const data = await res.json() as any;
            console.log(`✅ Railway Server is ONLINE. Uptime: ${data.uptime} seconds.`);
            if (data.uptime < 1200) {
                console.log("ℹ️ Server was recently restarted, confirming the latest GitHub commit was deployed.");
            } else {
                console.warn("⚠️ Server uptime is high. The deploy may not have restarted the app! We might need to manually trigger a restart if it's still caching the old skills.");
            }
        } else {
            console.error("❌ Railway server returned HTTP", res.status);
        }
    } catch (e: any) {
        console.error("❌ Failed to reach Railway server:", e.message);
    }
}

nukeDatabaseAndCheckServer();
