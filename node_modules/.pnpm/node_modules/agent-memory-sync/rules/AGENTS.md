# Agent-Memory-Sync: Universal Episodic Memory Rules

This rule is active whenever `agent-memory-sync` is enabled across Antigravity, Claude Code, and compatible agent environments.

## 1. Proactive Memory Recall
- At the start of any complex refactoring, unfamiliar codebase onboarding, or stubborn debugging session, check stored episodic memory using `memory_recall`.
- Query with key terms relating to the active workspace, framework, or bug symptoms.

## 2. Automatic Insight Capture (Zero Amnesia)
- Whenever a major debugging breakthrough occurs (e.g., resolving a tricky version incompatibility, race condition, or hidden edge case), call `memory_record` with:
  - `category`: `"gotchas"`
  - `title`: Short descriptive title (e.g., `Node 22 fetch TLS socket hangup`)
  - `content`: Root cause and verified fix
  - `tags`: Frameworks/tools involved
- Whenever the user explicitly corrects a coding style or expresses a strong architectural preference:
  - Call `memory_record` with `category`: `"user_preferences"` or `"architecture"`.

## 3. High Signal, Zero Noise
- Never record transient or trivial info (e.g., "created a temp file").
- Record durable, high-leverage lessons that will save developer and agent time in future sessions.
