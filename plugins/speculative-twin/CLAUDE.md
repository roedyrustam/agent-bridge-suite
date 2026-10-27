# Claude Code Setup for Speculative-Twin

To enable multi-model peer consensus in Claude Code CLI:

1. Build the MCP server:
   ```bash
   pnpm install && pnpm build
   ```
2. Register the MCP server in Claude Code:
   ```bash
   claude mcp add speculative-twin node ./dist/index.js
   ```

## Agent Directives for Claude
- Use `twin_critique` on mission-critical algorithms or deep schema migrations.
- If an API key for the secondary model (`GEMINI_API_KEY` or `ANTHROPIC_API_KEY`) is set, the tool runs remote cross-model validation. If not, it falls back to a specialized adversarial sub-prompt.
