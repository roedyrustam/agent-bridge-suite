---
name: agent-memory-sync
description: Cross-IDE episodic memory bridge. Query, record, and maintain persistent insights, gotchas, architecture choices, and user preferences across Antigravity and Claude Code sessions using BM25 ranking.
---

# Agent Memory Sync Skill

Use this skill when you need to store, retrieve, or manage cross-session episodic memory:
- **`memory_recall`**: Query persistent memory for past solutions, architecture decisions, or developer preferences (powered by BM25 ranking).
- **`memory_record`**: Save a durable lesson learned, fixed edge case, or user convention.
- **`memory_list`**: Inspect existing memories filtered by category or workspace.
- **`memory_stats`**: View telemetry, category breakdown, top tags, and most recalled insights.
- **`memory_export`**: Export memories to Markdown or JSON for backup or documentation.
- **`memory_import`**: Import memories from JSON snapshots.
- **`memory_delete`**: Prune outdated or conflicting insights.

## Categories:
1. `gotchas`: Tricky bugs, unexpected library behaviors, breaking changes, or silent failure traps.
2. `architecture`: Structural patterns, data-flow decisions, state management conventions.
3. `user_preferences`: Coding style, formatting guidelines, library choices preferred by the developer.
4. `performance`: Optimization tricks and benchmark findings specific to this codebase.

## Workflow Example:
1. Developer: *"Refactor our payment webhook handler"*
2. Agent calls `memory_recall({ query: "payment webhook idempotency", projectScope: "my-service" })`
3. Agent discovers: *"Remember to check x-idempotency-key header before database transaction"*
4. Agent incorporates this insight directly into the solution.
