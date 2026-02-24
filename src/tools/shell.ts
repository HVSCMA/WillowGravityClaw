import { exec } from "child_process";
import { promisify } from "util";
import { OpenAITool } from "../services/mcp.js";
import { config } from "../config.js";

const execAsync = promisify(exec);

export const shellDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "execute_shell_command",
        description: "Execute an arbitrary shell command on the host operating system. Useful for reading environment states, compiling code, or managing processes.",
        parameters: {
            type: "object",
            properties: {
                command: {
                    type: "string",
                    description: "The shell command to execute."
                },
                cwd: {
                    type: "string",
                    description: "Optional working directory path."
                }
            },
            required: ["command"]
        }
    }
};

export async function executeShellCommand(args: any): Promise<any> {
    console.log(`[Shell] Requested execution: ${args.command} (cwd: ${args.cwd || process.cwd()})`);

    // --- SECURITY ALLOWLIST CHECK ---
    const baseCommand = args.command.split(" ")[0].trim();
    if (!config.ALLOWED_SHELL_COMMANDS.includes(baseCommand) && !config.ALLOWED_SHELL_COMMANDS.includes("*")) {
        console.warn(`[Security] BLOCKING unauthorized shell command: ${baseCommand}`);
        return {
            stdout: "",
            stderr: `SECURITY BLOCK: The command '${baseCommand}' is not in the ALLOWED_SHELL_COMMANDS list. Add it to .env if required.`,
            exitCode: 403
        };
    }
    // --------------------------------

    try {
        const { stdout, stderr } = await execAsync(args.command, {
            cwd: args.cwd || process.cwd(),
            timeout: 30000 // 30 second max execution time to prevent hanging
        });

        return {
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: 0
        };
    } catch (error: any) {
        console.error("[Shell] Execution failed:", error.message);
        return {
            stdout: error.stdout?.toString().trim() || "",
            stderr: error.stderr?.toString().trim() || error.message,
            exitCode: error.code || 1
        };
    }
}
