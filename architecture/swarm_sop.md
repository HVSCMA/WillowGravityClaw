# Agent Swarms & Delegation SOP

## 1. Goal
Provide the primary Gravity Claw agent the ability to spin up specialized "Sub-Agents" (Swarms) to handle complex, parallel, or deep-reasoning tasks without bloating the primary context window or losing the conversational thread with the user. This establishes Agent-to-Agent communication.

## 2. Tools & Input Schemas

### `delegate_to_subagent`
Spins up a lightweight, stateless Gemini (or OpenRouter) instance with a strict system prompt and returns its final string output.

```json
{
  "role_description": "string (The system prompt/persona for the sub-agent. E.g., 'You are an expert Python debugger.')",
  "task": "string (The specific objective or raw data the sub-agent needs to process)",
  "model": "string (Optional: E.g., 'gemini-2.5-pro' or 'anthropic/claude-3-haiku'. Defaults to the current active model if omitted)"
}
```

## 3. Tool Logic
- **Execution:** Uses `runAgentLoop` internally, but bypasses the SQLite memory persistence to keep sub-agent thoughts ephemeral and isolated. We don't want the sub-agent's scratchpad bleeding into the user's chat history.
- **Model Routing:** Uses the existing OpenRouter/Gemini failover system. A sub-agent can be explicitly requested to use a faster/cheaper model (like Haiku or Flash) for simple sorting tasks, saving compute.
- **Return Value:** Returns a JSON object containing `{ "result": "The final output..." }`.

## 4. Edge Cases & Constraints
- **Infinite Recursion:** A sub-agent MUST NOT be given access to the `delegate_to_subagent` tool natively, to prevent infinite looping or out-of-control API spend. Sub-agents are restricted to native OS tools (Shell, File, Browser) ONLY if explicitly granted by the primary agent wrapper.
- **Timeout & Failure:** If a sub-agent fails or times out, the tool should gracefully return the error string to the primary agent so it can decide whether to retry or inform the user.
