# SQLite Episodic Memory Tools

## 1. Goal
Enable the agent to actively save and retrieve explicit string/text facts from a persistent SQLite database to remember user preferences across sessions.

## 2. Tools & Input Schemas

### A. save_to_memory
```json
{
  "content": "string (The text content to save and index for future search)"
}
```

### B. search_memory
```json
{
  "query": "string (The search query to match against past documents)"
}
```

## 3. Tool Logic
- **Save:** Executes `saveDocument(content)` which inserts the string into the `documents` table, associating it with an auto-incrementing ID. Returns a success JSON.
- **Search:** Executes `searchDocuments(query)` which performs a SQLite FTS5 MATCH against the indexed `documents` table content. Returns a JSON array of matching text snippets.

## 4. Edge Cases & Future Refactoring (Sprint 2)
- Currently uses FTS5 keyword matching. 
- **Planned Update:** This SOP will change during the Supabase migration to utilize OpenAI embeddings and Cosine Similarity.
