# Sovereign Sidecar Extension SOP

## Objective
The Sovereign Sidecar is a "Zero-Update" Chrome Extension. It acts as the optic nerve for the Gravity Claw system, reading the Follow Up Boss DOM and injecting a universal web app iframe (`canvas.html`). It relies on URL-based deterministic routing (`?fublead=[ID]`) to synchronize multimodal awareness across multiple tabs and secondary monitors.

## 1. URL-Based Deterministic Routing
The core architectural principle is that the backend and the UI rely on the Follow Up Boss Lead ID as the absolute source of truth for session management.

- When the Chrome Extension loads on `https://hudsonvalleysold.followupboss.com/2/people/view/88762`, it extracts `88762` from the URL.
- The Extension injects the sidecar iframe pointing to `http://localhost:3000/canvas.html?fublead=88762&mode=sidecar`.

## 2. Omnipotent Sensory Webhooks
When the extension detects a lead, it immediately scrapes the DOM for context (Name, Phone, Email, Price) and POSTs this data to the Gravity Claw Brain.

**Endpoint:** `POST /api/sensory/fub_lead`
**Payload:**
```json
{
  "leadId": "88762",
  "sourceUrl": "https://hudsonvalleysold.followupboss.com/2/people/view/88762",
  "context": {
    "name": "Jane Doe",
    "phone": "555-0199",
    "email": "jane@example.com"
  }
}
```

## 3. Persistent State & Socket Rooms
1.  **Node.js Brain:** Receives the `/api/sensory/fub_lead` webhook and updates an internal state dictionary for `Lead ID: 88762`.
2.  **Socket.io Rooms:** When the Agentic Canvas UI (`canvas.html`) loads, it reads its URL parameters. If it sees `?fublead=88762`, it asks the sever to join the Socket.io room specifically named `fublead_88762`.
3.  **Targeted Broadcasts:** When `runAgentLoop` generates a response or uses a tool on behalf of `88762`, it broadcasts `canvas_update` *only* to the `fublead_88762` room. 

## 4. Adaptive UIs
The Agentic Canvas UI (`canvas.html`) reads the `&mode=` parameter.
- `mode=sidecar`: Hides extraneous UI elements, fitting perfectly into a 350px width iframe.
- `mode=full`: Renders the sprawling Command Center. If opened without a lead ID, provides a native Follow Up Boss search bar to jump into a lead context.
