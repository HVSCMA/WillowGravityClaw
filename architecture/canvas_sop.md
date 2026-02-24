# Agentic Canvas SOP

## Objective
The Agentic Canvas is a morphing, multimodal user interface that exists as a universal web application (standalone, embedded, or Chrome extension). Its primary function is to provide real-time visual feedback of the Intelligence Engine's actions without requiring hardcoded frontend updates for every new tool.

## Architectural Flow
1. **The Intelligence Engine (LLM)** decides to use a tool (e.g., `search_web`, `read_file`, `send_email`).
2. **The Tool Execution Router** (`src/agent/loop.ts`) catches the tool call.
3. **Broadcasting state:** Before the tool finishes executing, the router OR the tool itself calls `updateLiveCanvas()` to broadcast a payload via Socket.io.
4. **Polymorphic Rendering:** The frontend (`app.js`) listens for the `canvas_update` event.
    *   If `type === 'markdown'`, the frontend renders the raw markdown string.
    *   If `type === 'widget'`, the frontend checks `widgetType` and injects a pre-styled HTML component injected with the JSON `content`.

## Payload Schema
```json
{
  "type": "markdown | widget | system_alert",
  "content": "string",
  "widgetType": "string (optional)"
}
```

## Rules for Tool Developers
- When creating a new tool in `src/tools/` that produces visually interesting data (like an image table or map), you must emit a `canvas_update` event with `type: 'widget'` and define a `widgetType` that the frontend understands.
- For all other actions, `loop.ts` will automatically emit a `type: 'markdown'` event indicating "Agent is thinking... [Tool Name]".

## The Frontend Chat Loop
The Canvas features a chat input. When the user sends a message, it hits the `POST /api/chat` route. This route pushes the user's message into the global agent message queue and immediately triggers `runAgentLoop()` to process it.
