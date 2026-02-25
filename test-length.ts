import dotenv from 'dotenv';
import { generateEmbedding } from './src/memory/embeddings.js';

dotenv.config();

async function testLength() {
    try {
        const result = await generateEmbedding("Verify dimensions.");
        console.log("Returned dimensions length: " + result.length);
    } catch (e) {
        console.error(e);
    }
}
testLength();
