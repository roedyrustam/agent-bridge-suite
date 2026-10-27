---
name: speculative-twin
description: Multi-model peer consensus and adversarial critique. Invokes an autonomous peer twin (Claude Code / Anthropic / Gemini / OpenAI / Local Heuristics) to stress-test drafts, find blindspots, and synthesize optimal code patches.
---

# Speculative Twin Skill

Use this skill when you want peer-model validation and multi-draft consensus:
- **`twin_critique`**: Submit a code patch or design plan for rigorous adversarial review by the twin model (checks P0/P1/P2 vulnerabilities: secret leaks, silent catch, SQL injection, loose types, race conditions).
- **`twin_speculate`**: Generate multiple candidate implementations across different algorithmic paradigms (Defensive Immutable, Concurrent Streaming, Zero-Alloc In-Place).
- **`twin_synthesize`**: Combine two competing drafts into a unified, hardened solution.
- **`twin_status`**: Inspect active model provider and capability mode.

## When to Use:
1. Hard concurrency/lock problems and async state manipulation.
2. Security-sensitive modules (JWT verification, secret management, RBAC, payment webhooks).
3. Complex algorithmic optimizations where hallucination risk or regression risk is high.
