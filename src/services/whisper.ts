import OpenAI from "openai";
import { config } from "../config.js";
import fs from "fs";

const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY,
});

export async function transcribeAudio(filePath: string): Promise<string> {
    console.log(`[Whisper] Transcribing ${filePath}...`);
    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-1",
        });
        return transcription.text;
    } catch (error: any) {
        console.error("Whisper API Error:", error);
        throw new Error(`Failed to transcribe audio: ${error.message || error}`);
    }
}
