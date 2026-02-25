import { execSync } from 'child_process';
import fs from 'fs';

try {
    execSync('npx tsx test-supabase.ts > test-clean.log 2>&1');
} catch (err) {
    // It's expected to fail if the script throws
}

const log = fs.readFileSync('test-clean.log', 'utf-8');
console.log("=== RAW TEST LOG ===");
console.log(log);
console.log("====================");
