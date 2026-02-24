# Web Search Tool (duck-duck-scrape)

## 1. Goal
Execute a headless, zero-key web search on DuckDuckGo and return the top 4 results to the LLM to provide real-time internet context, bypassing training data cutoffs.

## 2. Input Schema
```json
{
  "query": "string (The search query to search duckduckgo for)"
}
```

## 3. Tool Logic
1. Receive string query.
2. Initialize `duck-duck-scrape` module asynchronously.
3. Call `search(query)`.
4. Slice the raw result array to the top 4 entries to preserve token context limits.
5. Map results to return only `title`, `description`, and `url`.

## 4. Edge Cases & Error Handling
- **Failure to Fetch:** If the Promise rejects or DDG blocks the scrape, catch the exception and return `{ error: "Failed to search the web." }` so the LLM knows the context is missing, preventing a crash.
