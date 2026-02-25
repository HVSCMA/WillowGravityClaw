import { runAgentLoop } from './src/agent/loop.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

// Create a simple red 1x1 pixel JPEG explicitly for testing without relying on external CDNs
const base64Image = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
const buffer = Buffer.from(base64Image, 'base64');

async function testVision() {
    console.log("Simulating a user sending a photo via Telegram...");

    try {
        const reply = await runAgentLoop(
            "What color is this exact single pixel image? Be as precise as possible.",
            [{ buffer, mimeType: "image/jpeg" }],
            undefined,
            "VISION_TEST_SESSION"
        );

        console.log("\n=== AGENT RESPONSE ===");
        console.log(reply);
        console.log("======================");

    } catch (e) {
        console.error("Vision test failed:", e);
    }

    process.exit(0);
}

testVision();
