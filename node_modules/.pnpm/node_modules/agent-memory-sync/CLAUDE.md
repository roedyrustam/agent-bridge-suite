# Claude Code Setup for Agent-Memory-Sync

To enable persistent cross-IDE memory in Claude Code CLI:

1. Build the MCP server:
   ```bash
   pnpm install && pnpm build
   ```
2. Register the MCP server in Claude Code:
   ```bash
   claude mcp add agent-memory-sync node ./dist/index.js
   ```

## Agent Directives for Claude
- Whenever you encounter or solve a challenging bug, persist the root cause using the `memory_record` tool.
- At the beginning of complex multi-step reasoning, query `memory_recall` to retrieve past architecture lessons.
