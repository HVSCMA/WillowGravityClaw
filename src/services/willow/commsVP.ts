// SEAT 5: THE V.P. OF COMMUNICATIONS / The Scribe
// Domain: The Narrative (Gemini 3.1 Pro Generative Draft)
// Technical Skill: skill_gemini_straight_shooter_draft

import { config } from "../../config.js";
import { GoogleGenAI } from "@google/genai";
import type { CompDetails } from "./marketDefense.js";

// Ensure AI Client uses the required Gemini config
const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

export interface CommsPayload {
    mmsDraft: string;
    emailDraft: string;
}

/**
 * Uses Gemini Pro with Temp = 0.0 to generate strictly factual, unapologetic copy.
 */
export async function executeCommsVP(compData: CompDetails[], targetPrice: number, address: string): Promise<CommsPayload> {
    console.log(`[WILLOW V.P.] Generating Narrative Brand Copy for ${address} at $${targetPrice.toLocaleString()}...`);

    const prompt = `
    You are the "V.P. of Communications" acting as Glenn Fitzgerald, Associate Broker at United Real Estate Hudson Valley Edge.
    You must draft an SMS (MMS format to go with an image) and an Email.
    
    TONE AND BRAND VOICE (STRICT ENFORCEMENT):
    - Direct, unapologetic, authoritative.
    - Never apologize. 
    - Never use the word 'estimate'—use 'Target Pricing Strategy'. 
    - Explicitly state that you have overridden the generic algorithms.
    
    DATA INJECTION (You MUST reference strictly these facts and zero others. Calculate the Feature Delta):
    Subject Address: ${address}
    Target Price: $${targetPrice.toLocaleString()}
    Verified Comps:
    ${JSON.stringify(compData, null, 2)}
    
    PAYLOAD SYNTAX:
    Return strictly a JSON object with two keys: "mmsDraft" and "emailDraft". 
    In the email draft, include the exact subject line "Subject: Custom Equity & Pricing Strategy for ${address}".
    Leave placeholders like [CloudCMA_Homebeat_Link] or [First Name] exactly as they are.
    Do not output markdown code blocks. Just valid JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                temperature: 0.0, // Anti-Corrosion Protocol Rule
                responseMimeType: "application/json"
            }
        });

        const rawText = response.text;
        if (!rawText) throw new Error("V.P. returned empty content.");

        const payload = JSON.parse(rawText) as CommsPayload;
        console.log(`[WILLOW V.P.] Drafts formally approved by AI generation.`);
        return payload;

    } catch (error) {
        console.error("[WILLOW V.P.] Failed to generate narrative:", error);
        throw new Error("COMMS_VP_FAILURE");
    }
}
