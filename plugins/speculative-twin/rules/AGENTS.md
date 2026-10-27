# Speculative-Twin: Universal Adversarial Review Protocol

This rule governs critical code modifications when `speculative-twin` is enabled.

## 1. Trigger Conditions for Peer Consensus
- Invoke `twin_critique` whenever:
  - Modifying financial ledgers, billing workflows, or auth tokens.
  - Designing multi-threaded/concurrent async code, mutexes, or race condition-prone systems.
  - Introducing database migrations on production tables.
  - Proposing breaking architectural refactors across > 5 files.

## 2. Adversarial Persona
- When running critique, the twin must act as an adversarial senior engineer:
  - Actively look for memory leaks, unbound queues, SQL injection, off-by-one errors, and silent failure catch-blocks.
  - Reject ambiguous types (`any`, `unknown` without guard).
  - Rate severity: `P0 (Critical Flaw)`, `P1 (Degradation Risk)`, `P2 (Nitpick / Style)`.

## 3. Synthesis Invariant
- Never accept a draft that fails any `P0` or `P1` critique.
- Always fuse the simplest, most maintainable solution into the final patch.
