import { OpenAITool } from "../services/mcp.js";
import { addToGraph, queryGraph, GraphTriple } from "../db/memory.js";

export const addToGraphDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "add_to_graph",
        description: "Store explicit knowledge, facts, and relationships about entities in the SQLite Knowledge Graph using semantic triples (Subject -> Predicate -> Object). Use this to remember highly specific details (e.g., 'User' -> 'likes' -> 'Sci-Fi' or 'Project X' -> 'is_due' -> 'Friday').",
        parameters: {
            type: "object",
            properties: {
                triples: {
                    type: "array",
                    description: "An array of relationships to insert into the graph.",
                    items: {
                        type: "object",
                        properties: {
                            subject: { type: "string", description: "The actor or primary entity (e.g. 'Glenn', 'The server')" },
                            predicate: { type: "string", description: "The relationship or action (e.g. 'works_at', 'hates', 'requires')" },
                            object: { type: "string", description: "The target or value (e.g. 'Apple', 'Broccoli', 'API Key')" }
                        },
                        required: ["subject", "predicate", "object"]
                    }
                }
            },
            required: ["triples"]
        }
    }
};

export const queryGraphDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "query_graph",
        description: "Query the SQLite Knowledge Graph for relationships involving a specific entity. Returns all triples where the requested entity is either the Subject or the Object.",
        parameters: {
            type: "object",
            properties: {
                entity: {
                    type: "string",
                    description: "The name of the entity to look up (e.g., 'Glenn', 'Project X')."
                }
            },
            required: ["entity"]
        }
    }
};

export async function executeAddToGraph(args: any): Promise<any> {
    try {
        const triples: GraphTriple[] = args.triples;
        if (!triples || triples.length === 0) return "No triples provided.";

        addToGraph(triples);
        return `Successfully added ${triples.length} facts to the Knowledge Graph.`;
    } catch (error: any) {
        console.error(`[Graph] Error adding triples:`, error.message);
        return `Failed to update graph: ${error.message}`;
    }
}

export async function executeQueryGraph(args: any): Promise<any> {
    try {
        const results = queryGraph(args.entity);
        if (results.length === 0) {
            return `No known relationships found in the Knowledge Graph for entity: ${args.entity}`;
        }

        const formatted = results.map(r => `(${r.subject}) -[${r.predicate}]-> (${r.object})`).join("\n");
        return `Knowledge Graph results for '${args.entity}':\n${formatted}`;
    } catch (error: any) {
        console.error(`[Graph] Error querying triples:`, error.message);
        return `Failed to query graph: ${error.message}`;
    }
}
