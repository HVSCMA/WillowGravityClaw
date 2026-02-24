# Research & Discoveries

## Existing Project State
- The project is written in TypeScript/Node.js.
- Active capabilities include: OpenRouter multi-LLM integration, SQLite episodic memory, DuckDuckGo webhook ingestion, ElevenLabs TTS, Whisper STT.
- The previous implementation concentrated tools in `src/agent/tools.ts`. To comply with B.L.A.S.T, these must be decoupled into atomic executable scripts with corresponding Markdown SOPs in an `architecture/` directory.

## Constraints
- Python scripts were standardized in the B.L.A.S.T prompt, but given this is a heavily integrated Node.js/Telegram repository, we will construct the `tools/` layer using isolated TypeScript modules to maintain runtime compatibility, ensuring they remain 'Atomic and Testable'.
- Supabase credentials have not been supplied yet. Sprint 2 (Semantic Memory) cannot be fully completed without keys. We will pursue independent features from the 51-feature list (e.g., Morning Briefing, Knowledge Graph, or refactoring existing skills).
