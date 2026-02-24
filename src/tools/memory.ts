import { saveDocument, searchDocuments } from "../db/memory.js";
import { OpenAITool } from "../services/mcp.js";

export const saveToMemoryDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "save_to_memory",
        description: "Save an important fact or document snippet into the users long term memory database.",
        parameters: {
            type: "object",
            properties: {
                content: {
                    type: "string",
                    description: "The text content to save and index for future search."
                }
            },
            required: ["content"]
        }
    }
};

export async function executeSaveToMemory(args: any): Promise<any> {
    saveDocument(args.content);
    return { success: true, message: "Saved to memory." };
}

export const searchMemoryDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "search_memory",
        description: "Search the users long term memory database for facts.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The search query to match against past documents."
                }
            },
            required: ["query"]
        }
    }
};

export async function executeSearchMemory(args: any): Promise<any> {
    const results = searchDocuments(args.query);
    return { results };
}
