import { execSync } from 'child_process';
import fs from 'fs';

try {
    execSync('npx tsx test-vision.ts > vision-clean.log 2>&1');
} catch (err) {
}

const log = fs.readFileSync('vision-clean.log', 'utf-8');
console.log("=== RAW VISION LOG ===");
console.log(log.substring(log.length - 2000));
console.log("===================");
