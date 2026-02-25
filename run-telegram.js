import { execSync } from 'child_process';
import fs from 'fs';

try {
    execSync('npx tsx simulate-telegram.ts > telegram-clean.log 2>&1');
} catch (err) {
}

const log = fs.readFileSync('telegram-clean.log', 'utf-8');
console.log("=== RAW TEST LOG ===");
console.log(log);
console.log("====================");
