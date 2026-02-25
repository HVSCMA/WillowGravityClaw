import { McpBridge, OpenAITool } from "../services/mcp.js";
import { webSearchDeclaration, executeWebSearch } from "../tools/webSearch.js";
import { saveToMemoryDeclaration, executeSaveToMemory, searchMemoryDeclaration, executeSearchMemory } from "../tools/memory.js";
import { currentTimeDeclaration, executeCurrentTime } from "../tools/time.js";
import { shellDeclaration, executeShellCommand } from "../tools/shell.js";
import { readFileDeclaration, writeFileDeclaration, listDirectoryDeclaration, executeReadFile, executeWriteFile, executeListDirectory } from "../tools/file.js";
import { browserNavigateDeclaration, browserClickDeclaration, browserTypeDeclaration, browserExtractDeclaration, browserCloseDeclaration, executeBrowserNavigate, executeBrowserClick, executeBrowserType, executeBrowserExtract, executeBrowserClose } from "../tools/browser.js";
import { swarmDeclaration, executeSwarmDelegation } from "../tools/swarm.js";
import { meshDeclaration, executeMeshWorkflow } from "../tools/mesh.js";
import { canvasDeclaration, executeUpdateCanvas } from "../tools/canvas.js";
import { addToGraphDeclaration, queryGraphDeclaration, executeAddToGraph, executeQueryGraph } from "../tools/graph.js";

const mcpBridges: McpBridge[] = [
    new McpBridge("everything", "npx", ["-y", "@modelcontextprotocol/server-everything"])
];

let mcpInitialized = false;

export async function initMcpBridges() {
    if (mcpInitialized) return;
    for (const bridge of mcpBridges) {
        await bridge.connect();
    }
    mcpInitialized = true;
}

export async function getTools(): Promise<OpenAITool[]> {
    await initMcpBridges();

    const nativeDeclarations: OpenAITool[] = [
        currentTimeDeclaration,
        saveToMemoryDeclaration,
        searchMemoryDeclaration,
        webSearchDeclaration,
        shellDeclaration,
        readFileDeclaration,
        writeFileDeclaration,
        listDirectoryDeclaration,
        browserNavigateDeclaration,
        browserClickDeclaration,
        browserTypeDeclaration,
        browserExtractDeclaration,
        browserCloseDeclaration,
        swarmDeclaration,
        meshDeclaration,
        canvasDeclaration,
        addToGraphDeclaration,
        queryGraphDeclaration
    ];

    let allDeclarations = [...nativeDeclarations];

    for (const bridge of mcpBridges) {
        try {
            const bridgeTools = await bridge.getTools();
            allDeclarations.push(...bridgeTools);
        } catch (error) {
            console.error(`Failed to load tools from bridge:`, error);
        }
    }

    return allDeclarations;
}

export async function executeTool(name: string, args: any, sessionId?: string): Promise<any> {
    if (name === "get_current_time") {
        return await executeCurrentTime(args);
    }
    if (name === "save_to_memory") {
        return await executeSaveToMemory(args, sessionId);
    }
    if (name === "search_memory") {
        return await executeSearchMemory(args, sessionId);
    }
    if (name === "search_web") {
        return await executeWebSearch(args);
    }
    if (name === "execute_shell_command") {
        return await executeShellCommand(args);
    }
    if (name === "read_file") {
        return await executeReadFile(args);
    }
    if (name === "write_file") {
        return await executeWriteFile(args);
    }
    if (name === "list_directory") {
        return await executeListDirectory(args);
    }
    if (name === "browser_navigate") return await executeBrowserNavigate(args);
    if (name === "browser_click") return await executeBrowserClick(args);
    if (name === "browser_type") return await executeBrowserType(args);
    if (name === "browser_extract") return await executeBrowserExtract(args);
    if (name === "browser_close") return await executeBrowserClose(args);
    if (name === "delegate_to_subagent") return await executeSwarmDelegation(args);
    if (name === "execute_mesh_workflow") return await executeMeshWorkflow(args);
    if (name === "update_canvas") return await executeUpdateCanvas(args);
    if (name === "add_to_graph") return await executeAddToGraph(args);
    if (name === "query_graph") return await executeQueryGraph(args);

    // Check MCP bridges
    for (const bridge of mcpBridges) {
        if (bridge.ownsTool(name)) {
            return await bridge.executeTool(name, args);
        }
    }

    return { error: `Unknown tool ${name}` };
}
