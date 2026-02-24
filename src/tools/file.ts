import fs from "fs/promises";
import path from "path";
import { OpenAITool } from "../services/mcp.js";
import { config } from "../config.js";

// ... Tool declarations remain unchanged ...

export const readFileDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "read_file",
        description: "Read the full contents of a file on the local file system.",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "Absolute or relative path to the file."
                }
            },
            required: ["path"]
        }
    }
};

export const writeFileDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "write_file",
        description: "Write string content to a file on the local file system. If the file or parent directories do not exist, they will be created.",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "Absolute or relative path to the file."
                },
                content: {
                    type: "string",
                    description: "The raw text content to write into the file."
                }
            },
            required: ["path", "content"]
        }
    }
};

export const listDirectoryDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "list_directory",
        description: "List the contents (files and folders) of a directory on the local file system.",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "Absolute or relative path to the directory."
                }
            },
            required: ["path"]
        }
    }
};

// --- SECURITY ALLOWLIST CHECK ---
const resolvePath = (targetPath: string) => {
    const fullPath = path.resolve(process.cwd(), targetPath);
    const isAllowed = config.ALLOWED_FILE_PATHS.some(allowedRoot => fullPath.startsWith(path.resolve(allowedRoot)));

    if (!isAllowed && !config.ALLOWED_FILE_PATHS.includes("*")) {
        console.warn(`[Security] BLOCKING unauthorized file access: ${fullPath}`);
        throw new Error(`SECURITY BLOCK: The path '${fullPath}' is outside the boundaries defined in ALLOWED_FILE_PATHS. Add the directory to .env if required.`);
    }
    return fullPath;
};
// --------------------------------

export async function executeReadFile(args: any): Promise<any> {
    try {
        const fullPath = resolvePath(args.path);
        const content = await fs.readFile(fullPath, "utf-8");
        return { content };
    } catch (error: any) {
        return { error: `Failed to read file: ${error.message}` };
    }
}

export async function executeWriteFile(args: any): Promise<any> {
    try {
        const fullPath = resolvePath(args.path);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, args.content, "utf-8");
        return { success: true };
    } catch (error: any) {
        return { error: `Failed to write file: ${error.message}` };
    }
}

export async function executeListDirectory(args: any): Promise<any> {
    try {
        const fullPath = resolvePath(args.path);
        const files = await fs.readdir(fullPath);
        return { files };
    } catch (error: any) {
        return { error: `Failed to list directory: ${error.message}` };
    }
}
