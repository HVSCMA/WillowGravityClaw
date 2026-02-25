import { searchSimilarMessages } from './src/memory/supabaseMemory.js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function testRPC() {
    // Passing matchThreshold=0.0 instead of default 0.5 to see what exactly is coming back
    const results = await searchSimilarMessages("favorite animal", 0.0, 20, 'CROSS_DEVICE_TEST');

    fs.writeFileSync('rpc-results.json', JSON.stringify({ matches: results.length, data: results }, null, 2), 'utf8');
}

testRPC().catch(console.error);
