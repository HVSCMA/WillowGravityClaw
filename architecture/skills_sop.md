# Dynamic Skills System

## 1. Goal
Provide a declarative, no-code way for the user to extend the agent's capabilities. The agent will read Markdown files from a `./skills` directory on startup and inject their instructions into its core system prompt, guiding how it uses its existing atomized tools.

## 2. Tools & Input Schemas
This is not an active tool the LLM calls, but a system-level loader that modifies the baseline agent context.

### Skill File Format (`/skills/<skill_name>.md`)
```yaml
---
name: "Skill Name"
description: "High-level description of what the skill does"
---

# Instructions
1. Step 1 ...
2. Step 2 ...
```

## 3. Tool Logic
- **Initialization:** During the `runAgentLoop` bootstrap phase, a utility script (`src/tools/skills.ts`) reads the `./skills` directory.
- **Parsing:** It uses `gray-matter` to extract the YAML frontmatter (metadata) and the raw Markdown body (instructions).
- **Injection:** It concatenates all loaded skills into a structured string block and appends it to the `systemPrompt` before the LLM inference call.

## 4. Edge Cases & Security
- **Missing Directory:** If the `./skills` directory does not exist, the loader should cleanly catch `ENOENT` and return an empty string to prevent startup crashes.
- **Invalid YAML:** If `gray-matter` fails to parse a malformed Markdown file, it should log the error and skip the file rather than corrupting the system prompt.
