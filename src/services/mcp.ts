import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";

export interface OpenAITool {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: any;
    }
}

export class McpBridge {
    private client: Client | null = null;
    private transport: StdioClientTransport | null = null;
    private serverName: string;
    private command: string;
    private args: string[];

    constructor(serverName: string, command: string, args: string[] = []) {
        this.serverName = serverName;
        this.command = command;
        this.args = args;
    }

    async connect() {
        console.log(`[MCP] Starting server '${this.serverName}' via ${this.command} ${this.args.join(" ")}...`);
        this.transport = new StdioClientTransport({
            command: this.command,
            args: this.args,
        });

        this.client = new Client(
            {
                name: "gravity-claw-client",
                version: "1.0.0",
            },
            {
                capabilities: {},
            }
        );

        await this.client.connect(this.transport);
        console.log(`[MCP] Connected to ${this.serverName} server.`);
    }

    async getTools(): Promise<OpenAITool[]> {
        if (!this.client) throw new Error("MCP client not connected");

        const response = await this.client.listTools();
        const mcpTools: McpTool[] = response.tools || [];

        console.log(`[MCP] Found ${mcpTools.length} tools from ${this.serverName}`);

        return mcpTools.map(tool => {
            return {
                type: "function",
                function: {
                    name: `${this.serverName}_${tool.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
                    description: tool.description || `Tool ${tool.name} from ${this.serverName}`,
                    parameters: {
                        type: "object",
                        properties: this.convertJsonSchemaProperties(tool.inputSchema?.properties || {}),
                        required: tool.inputSchema?.required || []
                    }
                }
            } as OpenAITool;
        });
    }

    ownsTool(name: string): boolean {
        return name.startsWith(`${this.serverName}_`);
    }

    async executeTool(name: string, args: any): Promise<any> {
        if (!this.client) throw new Error("MCP client not connected");
        if (!this.ownsTool(name)) return undefined;

        const originalName = name.substring(`${this.serverName}_`.length);
        console.log(`[MCP] Executing ${originalName} with args:`, args);

        try {
            const result = await this.client.callTool({
                name: originalName,
                arguments: args
            });
            return result;
        } catch (error: any) {
            console.error(`[MCP] Tool execution failed:`, error);
            // MCP tools can return error objects instead of throwing
            return { isError: true, error: error.message || String(error) };
        }
    }

    // Helper to map JSON schema types to pure JSON schemas
    private convertJsonSchemaProperties(properties: any): Record<string, any> {
        const result: Record<string, any> = {};

        for (const [key, prop] of Object.entries(properties)) {
            const propData = prop as any;
            let jsonType = "string";

            if (propData.type === 'string') jsonType = "string";
            else if (propData.type === 'number' || propData.type === 'integer') jsonType = "number";
            else if (propData.type === 'boolean') jsonType = "boolean";
            else if (propData.type === 'array') jsonType = "array";
            else if (propData.type === 'object') jsonType = "object";

            result[key] = {
                type: jsonType,
                description: propData.description || ""
            };
        }

        return result;
    }
}
