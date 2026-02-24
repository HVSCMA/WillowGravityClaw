# Browser Automation Tool

## 1. Goal
Enable the agent to navigate the web interactively, performing tasks like logging in, filling forms, and extracting rendered DOM content that standard HTTP scrapers like DuckDuckGo cannot reach.

## 2. Tools & Input Schemas

### `browser_navigate`
```json
{
  "url": "string (The URL to navigate to)"
}
```

### `browser_click`
```json
{
  "selector": "string (A valid CSS selector representing the element to click)"
}
```

### `browser_type`
```json
{
  "selector": "string (A valid CSS selector for the input field)",
  "text": "string (The text to type into the field)"
}
```

### `browser_extract`
```json
{
  "selector": "string (A valid CSS selector to extract innerText from, or 'body' for everything)"
}
```

### `browser_close`
```json
{}
```

## 3. Tool Logic
- **Execution:** Uses `puppeteer`. A single global browser and page instance is maintained in memory across tool calls so that state (like cookies) is preserved across steps.
- **Workflow:** The LLM will call `browser_navigate`, then subsequent steps like `browser_click` or `browser_extract` on the same page, and finally `browser_close` to free memory.

## 4. Edge Cases & Error Handling
- **Timeouts:** Navigation and generic waits must have a timeout (e.g., 10s) to prevent hanging.
- **Missing Elements:** Operations like click, type, and extract must gracefully catch "selector not found" errors and return them to the LLM so it can retry or try a different approach.
- **Dangling instances:** Ensure `browser_close` checks if an instance exists before trying to close it, and provide a way to forcefully close on unexpected termination.
