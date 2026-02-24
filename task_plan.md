# Gravity Claw - 51 Feature Task Plan

## Phase 0: Protocol Compliance
- [x] Refactor `search_web` into B.L.A.S.T architecture.
- [x] Refactor `search_memory` into B.L.A.S.T architecture.
- [x] Refactor `save_to_memory` into B.L.A.S.T architecture.
- [x] Refactor `get_current_time` into B.L.A.S.T architecture.

## Phase 1: Messaging & Channels
- [x] Telegram Bot
- [ ] Gmail Integration (Pub/Sub)
- [ ] Multi-Channel Router

## Phase 2: Voice & Speech
- [x] Voice Transcription
- [ ] Voice Wake Word
- [ ] Talk Mode
- [x] Text-to-Speech
- [x] ElevenLabs Voice
- [x] Telegram Voice Messages

## Phase 3: Memory & Context
- [x] SQLite Memory
- [x] Knowledge Graph
- [x] Context Pruning
- [x] Multimodal Memory
- [ ] Self-Evolving Memory
- [x] Markdown Memory
- [ ] Supabase + pgvector (Blocked: Awaiting Credentials)

## Phase 4: LLM & Models
- [x] Multi-LLM Providers
- [x] Model Failover
- [x] OpenRouter
- [x] Thinking Levels

## Phase 5: Tools & Automation
- [x] Shell Commands
- [x] File Operations
- [x] Browser Automation
- [x] Web Search
- [x] Scheduled Tasks
- [x] Webhook Triggers
- [x] MCP Tool Bridge
- [x] Skills System

## Phase 6: Proactive Behavior
- [x] Morning Briefing
- [x] Evening Recap
- [x] Heartbeat System
- [x] Smart Recommendations

## Phase 7: Security & Isolation
- [x] Command Allowlists

## Phase 8: Agent Architecture
- [x] Agentic Tool Loop
- [x] Agent Swarms
- [x] Agent-to-Agent Comms
- [x] Mesh Workflows
- [x] Plugin System

## Phase 9: Platform & Deployment
- [x] Docker Deploy (Railway adaptation)
- [ ] iOS & Android

## Phase 10: UX & Interaction
- [x] Typing Indicators
- [x] Slash Commands
- [x] Live Canvas
- [x] Usage Tracking
- [x] Group Management

## Phase 11: Master Dashboard (B.L.A.S.T)
- [x] B - Blueprint: Define data schemas and goals
- [x] L - Link: Connect `/api/dashboard/*` routes
- [x] A - Architect: Create `dashboard_sop.md`
- [x] S - Stylize: Render glassmorphism dark mode UI (`public/index.html`)
- [x] T - Trigger: Finalized real-time UI

## Phase 13: Morphing Multimodal UI (Agentic Canvas)
- [x] Defined `canvas_update` payload schema
- [x] Created `canvas_sop.md`
- [x] Added `/api/chat` route to `server.ts`
- [x] Injected Socket.io emissions into `executeTool` flow
- [x] Built the frontend chat layout and tab switching logic
