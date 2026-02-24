# Mesh Workflows SOP

## 1. Goal
Provide Gravity Claw a declarative system for executing complex, multi-step Directed Acyclic Graphs (DAGs) of AI tasks. This allows the primary agent to trigger a "Mesh Workflow" that orchestrates multiple `delegate_to_subagent` calls or native tool executions in sequence, passing the output of one step as the input to the next.

## 2. Architecture
Mesh Workflows are defined as YAML scripts stored in the `./workflows` directory. The primary agent has a tool (`execute_mesh_workflow`) to trigger them. 

### Workflow Schema (`.yaml`)
```yaml
name: "Research & Summarize"
description: "Searches the web and writes a summary."
steps:
  - id: gather_data
    action: "delegate_to_subagent"
    args:
      role_description: "You are a web researcher."
      task: "Search for info on {{input}}"
  
  - id: summarize
    action: "delegate_to_subagent"
    args:
      role_description: "You are an executive assistant."
      task: "Summarize this raw data: {{gather_data.result}}"
```

## 3. Tool Logic (`execute_mesh_workflow`)
- **Input:** Takes the `workflow_name` (e.g., "research_pipeline") and an initial `input` string.
- **Execution Engine:** 
  1. Parses the YAML file from `src/workflows/${workflow_name}.yaml`.
  2. Iterates through the `steps` array sequentially.
  3. Replaces template variables (e.g., `{{step_id.result}}` or `{{input}}`) with actual data from a runtime context object.
  4. Calls the relevant internal function (e.g., `executeSwarmDelegation`).
  5. Saves the output to the context object.
- **Output:** Returns the `result` of the final step in the array back to the primary agent.

## 4. Edge Cases
- **Missing Variables:** If a step requests `{{step_x.result}}` but `step_x` failed or doesn't exist, the workflow must abort and return a clear error trace.
- **Infinite Loops:** By defining the mesh as an array of sequential steps, we prevent infinite loops inherent to recursive agent prompting.
