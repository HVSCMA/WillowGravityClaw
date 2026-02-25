import { execSync } from 'child_process';
import fs from 'fs';

try {
    execSync('npx tsx test-rpc.ts > rpc-clean2.log 2>&1');
} catch (err) {
}

const log = fs.readFileSync('rpc-clean2.log', 'utf-8');
console.log("=== RAW RPC LOG ===");
console.log(log);
console.log("===================");
