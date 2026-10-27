# Contributing to Agent Bridge Suite

Thank you for your interest in contributing to **Agent Bridge Suite**! We welcome contributions, whether it's reporting bugs, improving documentation, submitting feature proposals, or authoring code.

---

## 🛠️ Development Setup

1. **Fork and Clone the Repository**:
   ```bash
   git clone https://github.com/roedyrustam/agent-bridge-suite.git
   cd agent-bridge-suite
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install
   ```

3. **Build the Suite**:
   ```bash
   pnpm build
   ```

4. **Run Unit Tests**:
   ```bash
   pnpm test
   ```

---

## 🧪 Testing Guidelines

Before opening a pull request, ensure all tests pass:
```bash
pnpm test
```
- If adding new features to `agent-memory-sync`, add test coverage in `plugins/agent-memory-sync/test/store.test.ts`.
- If adding new heuristics or providers to `speculative-twin`, add test coverage in `plugins/speculative-twin/test/engine.test.ts`.

---

## 🚀 Pull Request Workflow

1. Create a descriptive feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Commit your changes using Conventional Commits (`feat: ...`, `fix: ...`, `docs: ...`, `test: ...`).
3. Ensure formatting and TypeScript builds pass without errors.
4. Push your branch and open a Pull Request against the `main` branch.

---

## 📄 Code of Conduct

Be welcoming, respectful, and collaborative. We are committed to providing a harassment-free environment for everyone.
