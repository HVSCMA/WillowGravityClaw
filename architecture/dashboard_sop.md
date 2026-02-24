# Dashboard SOP (Gravity Claw Master Dashboard)

## Goal
To provide a real-time, aesthetically pleasing "North Star" command center displaying internal state, uptime, memory usage, and execution logs of the Gravity Claw system using the B.L.A.S.T. framework.

## Architecture Layer
This operates at **Layer 1: Architecture**, defining the deterministic logic for routing data to the dashboard frontend.

## Data Schemas (The "Payload")

### 1. Status Payload
**GET `/api/dashboard/status`**
Provides an overview of the system's current health.
```json
{
  "uptime": 120, // OS uptime in seconds
  "memoryUsage": "45.20", // Process memory usage in MB
  "activeIntegrations": ["Telegram", "SQLite", "DuckDuckGo", "OpenRouter"] // Active services
}
```

### 2. Logs Payload
**GET `/api/dashboard/logs`**
Provides the most recent execution logs.
```json
[
  {
    "timestamp": "2024-05-18T12:00:00.000Z",
    "level": "info",
    "message": "Initializing Gravity Claw Level 1..."
  }
]
```

## Tool Logic (Layer 3)
The Express backend (`src/server.ts`) will:
1.  **Status Endpoint:** Calculate `process.uptime()` and `process.memoryUsage().heapUsed` to generate the Status Payload dynamically on request.
2.  **Logs Endpoint:** We will implement an in-memory ring buffer (e.g., last 100 logs) inside `server.ts` or a new dedicated logger tool. The original `console.log` will be monkey-patched or augmented to push into this buffer, serving the `GET /api/dashboard/logs` array upon request.
3.  **Live Canvas (Socket.io):** The frontend will poll these endpoints or receive direct pushes via existing socket logic to maintain a dynamic, real-time feel.

## Edge Cases & Error Handling
- **Log Buffer Overflow:** The in-memory log array must cap at a fixed limit (e.g., 200 items) using `array.slice(-200)` to prevent a memory leak over extended uptime.
- **Polling Rate Limit:** If the client polls too frequently, it may introduce micro-stutters. Polling should be restricted to every 5-10 seconds, relying on Socket.io for immediate critical updates if necessary.

## Maintenance
If the shape of the Payload needs to change, it **must** be updated in `gemini.md` first, then here in `dashboard_sop.md`, and finally executed in `server.ts`.
