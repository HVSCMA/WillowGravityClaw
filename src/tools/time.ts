import { OpenAITool } from "../services/mcp.js";

export const currentTimeDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "get_current_time",
        description: "Get the current local time.",
        parameters: { type: "object", properties: {} },
    }
};

export async function executeCurrentTime(args: any): Promise<any> {
    return { time: new Date().toISOString() };
}
