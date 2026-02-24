# Project Constitution (Gravity Claw)

## 1. Discovery Answers
- **North Star:** A 51-feature autonomous, self-healing, multi-modal Telegram agent with deep memory, multi-LLM routing, and an open connectivity ecosystem.
- **Integrations:** Telegram (grammY), ElevenLabs, OpenRouter, Supabase/pgvector, Gmail (Pub/Sub), DuckDuckGo, MCP bridges.
- **Source of Truth:** Local SQLite (current) migrating to Supabase PostgreSQL + pgvector. Markdown files for persistence.
- **Delivery Payload:** Telegram Bot messages, audio voice notes, and webhook triggers.
- **Behavioral Rules:** Deterministic logic via B.L.A.S.T protocol (SOPs in `architecture/`, singular tools in `tools/`). Probabilistic logic handled ONLY by LLM. No generic marketplace skills; all tools built locally and verified.

## 2. JSON Data Schemas

### Payload Shape: Telegram Message
```json
{
  "chatId": "number",
  "text": "string",
  "parse_mode": "Markdown",
  "mediaUrl": "string (optional)",
  "audioBuffer": "Buffer (optional)"
}
```

### Tool Payload Shape
```json
{
  "type": "function",
  "function": {
    "name": "string",
    "description": "string",
    "parameters": "object JSON schema"
  }
}
```

### OS Automation Payload Shapes

**Shell Execution**
- Input: `{"command": "string", "cwd": "string (optional)"}`
- Output: `{"stdout": "string", "stderr": "string", "exitCode": "number"}`

**File Operations**
- `read_file` Input: `{"path": "string"}` -> Output: `{"content": "string"}`
- `write_file` Input: `{"path": "string", "content": "string"}` -> Output: `{"success": "boolean"}`
- `list_directory` Input: `{"path": "string"}` -> Output: `{"files": ["string"]}`

**Browser Automation (Puppeteer)**
- `browser_navigate` Input: `{"url": "string"}` -> Output: `{"success": "boolean", "title": "string"}`
- `browser_click` Input: `{"selector": "string"}` -> Output: `{"success": "boolean"}`
- `browser_type` Input: `{"selector": "string", "text": "string"}` -> Output: `{"success": "boolean"}`
- `browser_extract` Input: `{"selector": "string"}` -> Output: `{"content": "string"}`
- `browser_close` Input: `{}` -> Output: `{"success": "boolean"}`

**Markdown Skill File Format (`/skills/*.md`)**
Frontmatter:
```yaml
---
name: "Skill Name"
description: "High-level description of what the skill does"
tools: ["execute_shell_command", "read_file"] 
---
```
Body: Markdown instructions on how the agent should behave or execute the skill.

## 3. Dashboard Payload Shapes (Master Dashboard)

**WebSocket Payload: `canvas_update`**
- Output: `{"type": "string", "content": "string", "widgetType": "string (optional)"}`

**GET `/api/dashboard/status`**
- Output: `{"uptime": "number", "memoryUsage": "string", "activeIntegrations": ["string"]}`

**GET `/api/dashboard/logs`**
- Output: `[{"timestamp": "string", "level": "string", "message": "string"}]`

**GET `/api/dashboard/setup`**
- Output: `{"missingKeys": [{"key": "string", "feature": "string", "status": "string"}], "isFullyArmed": "boolean"}`

## 4. Behavioral Rules & Invariants
- **Data-First:** No tool development until the Input/Output JSON schema is defined here.
- **3-Layer Separation:** 
  - Layer 1: Architecture (`architecture/*.md`) - Markdown SOPs.
  - Layer 2: Navigation - Agent Tool Loop (`src/agent/loop.ts`).
  - Layer 3: Tools (`src/tools/*.ts`) - Atomic and testable execution logic.
- **Self-Annealing:** If an error occurs, analyze the stack trace, patch the tool, test it, and update the SOP in `architecture/`.
