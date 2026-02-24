import fs from "fs";
import { transcribeAudio } from "./services/whisper.js";

async function testWhisper() {
    try {
        console.log("Mocking a fake .ogg file to trigger the Whisper error path...");
        fs.writeFileSync("dummy.ogg", "totally fake audio data to force an error");

        const res = await transcribeAudio("dummy.ogg");
        console.log(res);

    } catch (e: any) {
        console.error("CAUGHT THE BUG:", e.message);
    } finally {
        if (fs.existsSync("dummy.ogg")) fs.unlinkSync("dummy.ogg");
    }
}

testWhisper();
