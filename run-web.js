import { execSync } from 'child_process';
import fs from 'fs';

try {
    execSync('npx tsx simulate-web.ts > web-clean.log 2>&1');
} catch (err) {
}

const log = fs.readFileSync('web-clean.log', 'utf-8');
console.log("=== RAW WEB TEST LOG ===");
console.log(log);
console.log("========================");
