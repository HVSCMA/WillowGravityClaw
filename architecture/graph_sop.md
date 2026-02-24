# Knowledge Graph Implementation Plan

## 1. Goal
Provide Gravity Claw with a structured, local Knowledge Graph (KG) stored in SQLite. While the agent already has FTS5 semantic search and conversation context, a Knowledge Graph allows it to track explicit relationships (Triples: Subject -> Predicate -> Object) for complex reasoning (e.g., "User -> likes -> Sci-fi", "User -> lives_in -> New York").

## 2. Architecture & Database
Instead of a complex graph database like Neo4j, we will build a lightweight triple-store on top of the existing SQLite `memory.ts` module.

**New SQLite Table: `knowledge_graph`**
- `id` (INTEGER PRIMARY KEY)
- `subject` (TEXT, e.g., "User", "Project Alpha")
- `predicate` (TEXT, e.g., "likes", "is_due_on")
- `object` (TEXT, e.g., "Coffee", "Friday")
- `confidence` (REAL, default 1.0)
- `timestamp` (DATETIME)

## 3. Agent Tools

### `add_to_graph`
- **Schema**: Takes arrays of `[{subject, predicate, object}]`
- **Logic**: Inserts or updates the triples in the SQLite table.

### `query_graph`
- **Schema**: Takes an `entity` string (e.g., "User" or "Project Alpha").
- **Logic**: Returns all triples where the entity is either the subject or the object. This gives the agent a "1-degree of separation" view of the entity.

## 4. Execution Steps
1. Modify `src/db/index.ts` to add the `knowledge_graph` table creation to the init script.
2. Modify `src/db/memory.ts` to add the execution functions for inserting and querying triples.
3. Modify `src/tools/graph.ts` (new file) to define the `OpenAITool` schemas.
4. Modify `src/agent/tools.ts` to wire the global tools into the agent loop.
5. Create a `graph_sop.md` skill/SOP to teach the agent *how* to use it.
