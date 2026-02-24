# Local File System Operations

## 1. Goal
Provide the agent complete read/write access to the local filesystem to inspect logs, alter configurations, or write code directly into the workspace.

## 2. Tools & Input Schemas

### `read_file`
```json
{
  "path": "string (Absolute or relative path to the file)"
}
```

### `write_file`
```json
{
  "path": "string (Absolute or relative path to the file)",
  "content": "string (The raw text to write into the file)"
}
```

### `list_directory`
```json
{
  "path": "string (Absolute or relative path to the directory)"
}
```

## 3. Tool Logic
- **Stack:** Built using Node.js native `fs/promises` module (`fs.readFile`, `fs.writeFile`, `fs.readdir`).
- **Formatting:** Returns raw strings for reading, boolean success flags for writing, and string arrays for directory listings.

## 4. Edge Cases & Error Handling
- **Path Resolution:** If a relative path is given, it must resolve from `process.cwd()`.
- **Missing Files:** If `read_file` targets a non-existent file, it should catch `ENOENT` and return a clean error string rather than crashing the node process.
- **Directory Creation:** `write_file` should ideally use recursive directory creation (`mkdir { recursive: true }`) to prevent crashes when writing to deeply nested paths.
