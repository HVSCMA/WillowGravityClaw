import { OpenAITool } from "../services/mcp.js";
import { updateLiveCanvas } from "../server.js";

export const canvasDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "update_canvas",
        description: "Stream rich markdown, data tables, or raw HTML components directly to the user's Live Canvas web dashboard. Use this for highly visual presentations, code blocks, or data side-by-sides.",
        parameters: {
            type: "object",
            properties: {
                content: {
                    type: "string",
                    description: "The Markdown or HTML content to render on the web UI."
                }
            },
            required: ["content"]
        }
    }
};

export async function executeUpdateCanvas(args: any): Promise<any> {
    try {
        console.log(`[Canvas] Pushing update to frontend (${args.content.length} bytes)...`);

        // Push the payload through the WebSocket emitter in server.ts
        updateLiveCanvas(args.content);

        return "Live Canvas updated successfully.";
    } catch (error: any) {
        console.error(`[Canvas] Failed to update:`, error.message);
        return `Failed to update Live Canvas: ${error.message}`;
    }
}
