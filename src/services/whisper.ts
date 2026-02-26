import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { config } from "../config.js";
import fs from "fs";

export async function transcribeAudio(filePath: string): Promise<string> {
    console.log(`[Gemini Whisper Fallback] Transcribing ${filePath}...`);
    try {
        if (!config.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not defined in the environment.");
        }

        const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
        const fileManager = new GoogleAIFileManager(config.GEMINI_API_KEY);

        const ext = filePath.split('.').pop()?.toLowerCase();
        let mimeType = "audio/ogg"; // Telegram default
        if (ext === "webm") mimeType = "audio/webm";
        else if (ext === "mp3") mimeType = "audio/mp3";
        else if (ext === "mp4") mimeType = "audio/mp4";
        else if (ext === "wav") mimeType = "audio/wav";

        // Upload the file to Gemini API
        const uploadResponse = await fileManager.uploadFile(filePath, {
            mimeType: mimeType,
            displayName: "Sensory Audio Input",
        });

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: uploadResponse.file.mimeType,
                    fileUri: uploadResponse.file.uri
                }
            },
            { text: "Please transcribe this audio exactly as spoken. Do not add any commentary, just provide the raw transcription." },
        ]);

        return result.response.text();

    } catch (error: any) {
        console.error("Gemini Transcription Error:", error);
        throw new Error(`Failed to transcribe audio: ${error.message || error}`);
    }
}
