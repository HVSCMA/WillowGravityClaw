import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

const configSchema = z.object({
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    TELEGRAM_USER_ID_WHITELIST: z.string().transform((val) => val.split(",").map((id) => parseInt(id.trim(), 10))),
    GEMINI_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
    ELEVENLABS_API_KEY: z.string().min(1),
    CRON_MORNING_BRIEFING: z.string().default("0 8 * * *"), // 8:00 AM
    CRON_EVENING_RECAP: z.string().default("0 20 * * *"), // 8:00 PM
    CRON_HEARTBEAT: z.string().default("0 * * * *"), // Every hour on the hour
    ALLOWED_SHELL_COMMANDS: z.string().default("ls,pwd,whoami,echo,cat,git,npm,node,npx").transform(val => val.split(",").map(cmd => cmd.trim())),
    ALLOWED_FILE_PATHS: z.string().default(process.cwd()).transform(val => val.split(",").map(p => p.trim())),

    // Phase 12 Guided Setup (Optional keys, dashboard will warn if missing)
    GMAIL_CLIENT_ID: z.string().optional(),
    GMAIL_CLIENT_SECRET: z.string().optional(),
    SUPABASE_URL: z.string().optional(),
    SUPABASE_SERVICE_KEY: z.string().optional(),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.format());
    process.exit(1);
}

export const config = parsed.data;
