import { transcribeAudio } from './src/services/whisper.js';
import { generateSpeech } from './src/services/elevenlabs.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const tempFile = path.resolve('test_synthetic_audio.mp3');

async function runTest() {
    try {
        console.log("Synthesizing speech via ElevenLabs...");
        const textToSpeak = "System check. The sensory transcription engine is operational and registering external anomalies. Over.";
        const audioBuffer = await generateSpeech(textToSpeak);

        fs.writeFileSync(tempFile, audioBuffer);
        console.log(`Audio written to ${tempFile}. Size: ${audioBuffer.byteLength} bytes.`);

        console.log("Starting transcript verification...");
        const transcribedText = await transcribeAudio(tempFile);

        console.log("\n=== ORIGINAL TEXT ===");
        console.log(textToSpeak);
        console.log("\n=== TRANSCRIPTION RESULT ===");
        console.log(transcribedText);
        console.log("============================");

    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
}

runTest();
