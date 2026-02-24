import { OpenAITool } from "../services/mcp.js";

export const webSearchDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "search_web",
        description: "Search the live internet for up-to-date real world information and news. Use this to break out of your training data constraints.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The search query to search duckduckgo for."
                }
            },
            required: ["query"]
        }
    }
};

export async function executeWebSearch(args: any): Promise<any> {
    console.log(`[WebSearch] Querying: ${args.query}`);
    try {
        const dds = await import("duck-duck-scrape");
        const searchResults = await dds.search(args.query);
        // Return top 4 results to save tokens
        return {
            results: searchResults.results.slice(0, 4).map(r => ({
                title: r.title,
                description: r.description,
                url: r.url
            }))
        };
    } catch (error: any) {
        console.error("Web Search error:", error);
        return { error: "Failed to search the web." };
    }
}
