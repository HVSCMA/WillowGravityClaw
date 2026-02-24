# OS Shell Automation Tool

## 1. Goal
Enable the agent to execute arbitrary shell commands on the local host OS, capture the output streams, and return them for autonomous environment interaction.

## 2. Tools & Input Schemas

### `execute_shell_command`
```json
{
  "command": "string (The shell command to execute)",
  "cwd": "string (Optional working directory path)"
}
```

## 3. Tool Logic
- **Execution:** Uses Node.js `child_process.exec` encapsulated in a Promise.
- **Environment:** Defaults to the project root directory unless `cwd` is specified.
- **Output Mapping:** Captures `stdout` and `stderr` and the `exitCode`. Returns them in a structured JSON payload so the LLM can interpret success or failure conditions.

## 4. Edge Cases & Security constraints
- **Timeouts:** Long-running commands must be bound by a timeout (e.g., 30 seconds) to prevent the agent thread from hanging indefinitely.
- **Security:** Since the agent runs locally, it executes with the user's local permissions. As instructed by Phase 7 backlog, a command allowlist may be required later, but for now, full terminal access is granted to emulate the "Builder" identity.
