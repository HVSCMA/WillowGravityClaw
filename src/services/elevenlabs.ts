import { config } from "../config.js";

// Using a default conversational voice "Rachel"
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export async function generateSpeech(text: string): Promise<Buffer> {
    console.log(`[ElevenLabs] Synthesizing speech...`);
    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}`, {
            method: "POST",
            headers: {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": config.ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_monolingual_v1",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        console.error("ElevenLabs API Error:", error);
        throw new Error("Failed to generate speech.");
    }
}
