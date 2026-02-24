import { transcribeAudio } from "./services/whisper.js";
import { generateSpeech } from "./services/elevenlabs.js";
import { runAgentLoop } from "./agent/loop.js";
import { initDb } from "./db/index.js";
import fs from "fs";

async function runVoiceIntegrationTest() {
    console.log("=== GRAVITY CLAW VOICE INTEGRATION TEST ===");
    initDb();

    // 1. We mock the whisper functionality here because we don't have a real .ogg file handy 
    // on the filesystem yet without Telegram providing one. So we'll skip directly to the 
    // agent loop with a simulated "transcribed" text.
    const simulatedTranscription = "Hello Gravity Claw! What is the current time?";
    console.log(`[Test] Simulated Transcription: "${simulatedTranscription}"`);

    // 2. Feed it to the agent
    console.log(`[Test] Feeding transcription to Gemini Agent...`);
    const agentResponse = await runAgentLoop(simulatedTranscription);
    console.log(`[Test] Agent Response: "${agentResponse}"`);

    // 3. Feed the agent response to ElevenLabs
    console.log(`[Test] Sending response to ElevenLabs TTS...`);
    const audioBuffer = await generateSpeech(agentResponse);

    if (audioBuffer && audioBuffer.length > 0) {
        fs.writeFileSync("test-audio-response.mp3", audioBuffer);
        console.log(`✅ [Test] Success! Generated a ${audioBuffer.length} byte audio file saved as "test-audio-response.mp3".`);
    } else {
        console.error("❌ [Test] Failed to generate valid audio buffer.");
    }
}

runVoiceIntegrationTest();
