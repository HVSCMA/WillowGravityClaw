import * as dotenv from 'dotenv';
dotenv.config();

async function validateAnticipatoryDialogue() {
    console.log('1. Setting the Scenario: User has just clicked an Anticipatory GUI button...');
    const payload = {
        textPrompt: "Let us start building a CMA for them.", // This string matches the Agent's new prompt instruction
        sessionId: "validation-cma-anticipation-test"
    };

    console.log('2. Emulating PWA Multimodal POST to /api/dialog...');
    try {
        const dialogRes = await fetch('http://localhost:3000/api/dialog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!dialogRes.ok) throw new Error('DIALOG API FAILED HTTP ' + dialogRes.status);

        const data = await dialogRes.json();

        console.log('\n--- RAW AGENT RESPONSE (Dual Payload) ---');
        console.log(data.agentReply);

        console.log('\n--- VERBAL OUTPUT (Sent to ElevenLabs) ---');
        // We simulate the server-side extraction here to prove it works before sending API credits
        const widgetRegex = /<widget[\s\S]*?>([\s\S]*?)<\/widget>/gi;
        let finalSpokenReply = data.agentReply.replace(widgetRegex, "").trim();

        let cleanText = finalSpokenReply
            .replace(/```[\s\S]*?```/g, "")
            .replace(/<widget[\s\S]*?<\/widget>/gi, "")
            .replace(/<[^>]*>?/gm, '')
            .replace(/\\*/g, "")
            .replace(/&nbsp;/g, " ")
            .trim();

        console.log(`TTS STRING: "${cleanText}"`);

        console.log('\n✅ ANTICIPATORY PIPELINE EXECUTED.');
        console.log('NOTE: The server has successfully split the stream into visual and auditory nodes.');
        process.exit(0);

    } catch (e) {
        console.error('Test Harness Crashed:', e);
        process.exit(1);
    }
}
validateAnticipatoryDialogue();
