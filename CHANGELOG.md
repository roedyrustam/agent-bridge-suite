# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-28 (Stable Release)

### Added
- **Native SQLite Storage Engine (`agent-memory-sync`)**:
  - Embedded zero-dependency SQLite storage powered by Node.js native `node:sqlite` (`DatabaseSync`).
  - High-concurrency WAL mode (`PRAGMA journal_mode = WAL`).
  - FTS5 virtual table (`memories_fts`) with C-level BM25 ranking (`bm25(f, 5.0, 1.0, 3.5)`).
  - Synchronized via SQLite triggers (`AFTER INSERT`, `AFTER DELETE`, `AFTER UPDATE`).
  - Seamless auto-migration from legacy `memories.json` on initial database boot.
- **Git Pre-commit Guardrail Hook (`agent-bridge hook`)**:
  - Automated pre-commit hook installer (`agent-bridge hook install` / `uninstall` / `status`).
  - Automatically audits staged TypeScript/JavaScript files with Speculative-Twin before git commits, blocking P0 vulnerabilities and credential leaks.
- **GitHub Release Automation**:
  - Automated GitHub Actions release pipeline (`.github/workflows/release.yml`) triggered on tag pushes.
- **Community Standards**:
  - Added `CONTRIBUTING.md`, `SECURITY.md`, Issue templates (Bug Report, Feature Request), Pull Request template, and `dependabot.yml`.

### Changed
- Promoted all packages and MCP server protocols to version `1.0.0`.
- Expanded Vitest automated test suite to 25 passing unit tests across SQLite FTS5, JSON fallback, and adversarial heuristics.
- Completely rewritten English documentation with badges, installation matrices, and tool reference in `README.md`.

---

## [0.2.0] - 2026-10-27

### Added
- **BM25 Search Algorithm**: Replaced naive substring search with multi-field tokenized BM25 ranking.
- **Multi-Provider Twin Adapter**: Added Anthropic Claude, Google Gemini, OpenAI-compatible APIs, and offline static heuristics.
- **Unified Terminal CLI (`bin/agent-bridge.mjs`)**: Direct terminal access to episodic memory and twin review commands.
- **Telemetry & Stats**: Added `memory_stats`, `memory_export`, `memory_import`, and `twin_status` tools.
- **Automated Vitest Suite**: 17 unit tests verifying store and twin engine invariants.

---

## [0.1.0] - 2026-10-26

### Added
- Initial monorepo workspace for `agent-memory-sync` and `speculative-twin`.
- MCP v1.x stdio server architecture.
- Core rules and skills for Antigravity and Claude Code.
