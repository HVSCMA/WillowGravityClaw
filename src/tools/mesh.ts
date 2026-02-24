import fs from "fs/promises";
import path from "path";
import yaml from "yaml";
import { OpenAITool } from "../services/mcp.js";
import { executeSwarmDelegation } from "./swarm.js";

export const meshDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "execute_mesh_workflow",
        description: "Execute a predefined Directed Acyclic Graph (DAG) of multi-agent subroutines defined in a YAML file. Passes the output of one sub-agent as the input to the next.",
        parameters: {
            type: "object",
            properties: {
                workflow_name: {
                    type: "string",
                    description: "The name of the YAML file in the workflows directory (without the .yaml extension). Example: 'deep_research'"
                },
                initial_input: {
                    type: "string",
                    description: "The raw string data or goal to feed into the first step of the workflow."
                }
            },
            required: ["workflow_name", "initial_input"]
        }
    }
};

export async function executeMeshWorkflow(args: any): Promise<any> {
    const workflowPath = path.join(process.cwd(), "workflows", `${args.workflow_name}.yaml`);

    console.log(`[Mesh] Starting Workflow: ${args.workflow_name}`);

    try {
        const fileContent = await fs.readFile(workflowPath, "utf-8");
        const workflow = yaml.parse(fileContent);

        if (!workflow.steps || !Array.isArray(workflow.steps)) {
            return { error: "Invalid workflow format. Must contain a 'steps' array." };
        }

        const context: Record<string, string> = {
            input: args.initial_input
        };

        for (const step of workflow.steps) {
            console.log(`[Mesh] Running Step: ${step.id} (${step.action})`);

            // Resolve variables in args
            const resolvedArgs: Record<string, any> = {};
            for (const [key, value] of Object.entries(step.args || {})) {
                if (typeof value === "string") {
                    resolvedArgs[key] = value.replace(/\{\{([\w.]+)\}\}/g, (match, varName) => {
                        return context[varName] !== undefined ? context[varName] : match;
                    });
                } else {
                    resolvedArgs[key] = value;
                }
            }

            let stepResult = null;

            if (step.action === "delegate_to_subagent") {
                const subAgentResult = await executeSwarmDelegation(resolvedArgs);
                if (subAgentResult.error) {
                    throw new Error(`Sub-agent error in step ${step.id}: ${subAgentResult.error}`);
                }
                stepResult = subAgentResult.result;
            } else {
                throw new Error(`Unsupported action in step ${step.id}: ${step.action}`);
            }

            // Save result to context for downstream steps
            context[`${step.id}.result`] = stepResult;
            console.log(`[Mesh] Step ${step.id} Complete.`);
        }

        // Return the context of the final step automatically
        const finalStepId = workflow.steps[workflow.steps.length - 1].id;
        return {
            success: true,
            final_result: context[`${finalStepId}.result`],
            trace: context
        };

    } catch (error: any) {
        console.error(`[Mesh] Workflow Failed:`, error.message);
        return { error: `Workflow failed: ${error.message}` };
    }
}
