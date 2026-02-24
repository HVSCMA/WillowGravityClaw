import { Context, NextFunction } from "grammy";
import { config } from "../config.js";

export async function whitelistMiddleware(ctx: Context, next: NextFunction) {
    const userId = ctx.from?.id;
    if (userId && config.TELEGRAM_USER_ID_WHITELIST.includes(userId)) {
        await next();
    } else {
        // Silently ignore unauthorized users
        console.log(`Blocked message from unauthorized user ID: ${userId}`);
    }
}
