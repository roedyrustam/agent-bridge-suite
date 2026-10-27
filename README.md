# Agent Bridge Suite 🚀

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-v1.x-orange.svg?style=flat-square)](https://modelcontextprotocol.io/)
[![Vitest](https://img.shields.io/badge/Tests-17%20Passing-brightgreen.svg?style=flat-square&logo=vitest)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

> Monorepo suite bridging **Antigravity** and **Claude Code** through persistent cross-IDE episodic memory (**BM25 Ranking Engine**) and multi-model adversarial peer review (**Speculative Consensus**).

---

## 📦 Suite Packages

| Package | Description | Protocol | Key Features |
| :--- | :--- | :--- | :--- |
| **`agent-memory-sync`** | Local cross-IDE episodic memory bridge that prevents AI agent amnesia across sessions and editors. | MCP v1.x + Local Storage | • **BM25 Semantic Token Ranking** ($k_1=1.2, b=0.75$)<br>• **Project Scope Isolation** (`global` + private workspace)<br>• **Recall Telemetry & Hotspot Tracking**<br>• **JSON & Markdown Export / Import**<br>• Aggregate health metrics and statistics |
| **`speculative-twin`** | Multi-model adversarial peer consensus engine for stress-testing code drafts, eliminating hallucinations, and hardening systems. | MCP v1.x + Multi-Provider Adapter | • **Multi-Provider Support**: Anthropic Claude, Google Gemini, OpenAI-compatible APIs<br>• **High-Precision Zero-Token Heuristics** (100% offline)<br>• **P0 / P1 / P2 Severity Audit** (secrets, silent catch, SQLi, loose types, race conditions)<br>• **Speculative Paradigm Drafting** (Immutable, Streaming, Zero-Alloc)<br>• Consensus synthesis engine |

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js `>= 20.0.0`
- pnpm `>= 9.0.0`

### Clone & Build
```bash
git clone https://github.com/roedyrustam/agent-bridge-suite.git
cd agent-bridge-suite
pnpm install
pnpm build
```

---

## 🔌 Setup with AI Agents

### 1. Antigravity IDE / CLI
Link the plugins directly into your Antigravity environment:
```bash
agy plugin link ./plugins/agent-memory-sync
agy plugin link ./plugins/speculative-twin
```

### 2. Claude Code CLI
Register both MCP servers in your Claude Code configuration:
```bash
claude mcp add agent-memory-sync node ./plugins/agent-memory-sync/dist/index.js
claude mcp add speculative-twin node ./plugins/speculative-twin/dist/index.js
```

### 3. Standalone Terminal CLI (`agent-bridge`)
Interact with memory or run code audits directly from your terminal without opening an MCP client:
```bash
# Query memories using BM25 ranking
pnpm agent-bridge memory recall "prisma connection pool starvation"

# Inspect memory stats and tag distribution
pnpm agent-bridge memory stats

# Run adversarial code critique (returns exit code 1 on P0 issues)
pnpm agent-bridge twin critique ./src/auth.ts --context="Strict authentication middleware"

# Generate speculative alternative implementations across 3 paradigms
pnpm agent-bridge twin speculate "Bounded async worker pool with backpressure"

# Check active twin provider and capability mode
pnpm agent-bridge twin status
```

---

## ⚙️ Model Provider Configuration (Speculative Twin)

By default, `speculative-twin` operates **100% offline** using high-precision static heuristics with zero token costs. To enable live frontier cross-model reviews, set any of the following environment variables:

```bash
# Option A: Anthropic Claude (default: claude-3-5-sonnet-20241022)
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_MODEL="claude-3-7-sonnet-latest" # optional

# Option B: Google Gemini (default: gemini-2.5-flash)
export GEMINI_API_KEY="..."
export GEMINI_MODEL="gemini-2.5-flash" # optional

# Option C: OpenAI or Custom Local LLM (default: gpt-4o)
export OPENAI_API_KEY="sk-..."
export OPENAI_BASE_URL="http://localhost:11434/v1" # e.g. Ollama or vLLM
export OPENAI_MODEL="deepseek-r1" # optional
```

---

## 🧰 MCP Tools Reference

### `agent-memory-sync`
- **`memory_recall`**: Query historical insights, debugging traps, and user preferences using BM25 semantic scoring.
- **`memory_record`**: Save a durable lesson, bug fix, or architecture rule (`gotchas`, `architecture`, `user_preferences`, `performance`).
- **`memory_list`**: List all stored insights with category and project scope filters.
- **`memory_stats`**: View telemetry metrics (total items, category breakdown, top tags, most recalled items).
- **`memory_export`**: Export knowledge base to Markdown or JSON format.
- **`memory_import`**: Import backup memories with `skip` or `overwrite` merge modes.
- **`memory_delete`**: Delete obsolete memories by ID.

### `speculative-twin`
- **`twin_critique`**: Stress-test code against security flaws, hardcoded credentials, silent catch blocks, SQL injection, loose `any` casts, and race conditions.
- **`twin_speculate`**: Generate candidate implementations across 3 algorithmic archetypes (Defensive Functional, High-Throughput Streaming, Minimal Zero-Alloc).
- **`twin_synthesize`**: Merge two competing code drafts into a unified, hardened solution.
- **`twin_status`**: Inspect active provider and capabilities.

---

## 🧪 Testing & Validation

The test suite is powered by **Vitest** and covers both plugins:

```bash
# Run all unit tests across monorepo packages
pnpm test

# Run build
pnpm build
```

```text
✓ test/store.test.ts (7 tests)
✓ test/engine.test.ts (10 tests)
Test Files  2 passed (2)
Tests       17 passed (17)
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Please feel free to check the [issues page](https://github.com/roedyrustam/agent-bridge-suite/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for more information.
