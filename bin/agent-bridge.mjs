#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import { MemoryStore } from '../plugins/agent-memory-sync/dist/store.js';
import { TwinEngine } from '../plugins/speculative-twin/dist/engine.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Terminal color helpers
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function printBanner() {
  console.log(`
${c.cyan}${c.bold}=======================================================
 🚀 AGENT BRIDGE SUITE CLI — v1.0.0 (Stable Release)
 Cross-IDE Memory (SQLite FTS5) & Speculative Adversarial Twin
=======================================================${c.reset}
`);
}

function printHelp() {
  printBanner();
  console.log(`
${c.bold}USAGE:${c.reset}
  $ agent-bridge <command> [subcommand] [arguments] [options]

${c.bold}COMMANDS:${c.reset}
  ${c.green}memory${c.reset}
    recall <query>            Query episodic memory with native SQLite FTS5 / BM25
                              Options: --limit=N, --scope=PROJECT
    record <title> <content>  Store a new architectural lesson or gotcha
                              Options: --category=gotchas|architecture|user_preferences|performance
                                       --tags=tag1,tag2, --scope=PROJECT
    list                      List all stored memories
                              Options: --category=..., --scope=...
    stats                     Display memory metrics, storage engine, and telemetry
    export                    Export all memories to stdout or file
                              Options: --format=json|markdown, --output=PATH
    import <filePath>         Import memories from a JSON backup file
                              Options: --mode=skip|overwrite
    delete <id>               Delete a memory entry by its unique ID

  ${c.magenta}twin${c.reset}
    critique <fileOrCode>     Run adversarial code review for vulnerabilities,
                              silent catches, SQL injections, race conditions, secret leaks.
                              Options: --context="..."
    speculate <requirement>   Generate 3 candidate implementations across paradigms
    synthesize <fileA> <fileB>
                              Synthesize two competing drafts into a unified hardened solution
                              Options: --context="..."
    status                    Show active model provider and capability mode

  ${c.blue}hook${c.reset}
    install                   Install Git pre-commit hook to automatically audit staged files
    uninstall                 Remove Git pre-commit hook
    status                    Check Git pre-commit hook status

${c.bold}GENERAL OPTIONS:${c.reset}
  --help, -h                  Show this help reference
  --version, -v               Display suite version

${c.bold}EXAMPLES:${c.reset}
  $ agent-bridge memory recall "prisma connection pool starvation"
  $ agent-bridge memory stats
  $ agent-bridge twin critique ./src/auth.ts --context="Strict authentication middleware"
  $ agent-bridge twin speculate "Bounded async worker pool with backpressure"
  $ agent-bridge hook install
`);
}

function parseArgs(args) {
  const parsed = {
    _: [],
    options: {},
  };

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const equalIndex = arg.indexOf('=');
      if (equalIndex !== -1) {
        const key = arg.slice(2, equalIndex);
        const value = arg.slice(equalIndex + 1);
        parsed.options[key] = value;
      } else {
        const key = arg.slice(2);
        parsed.options[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      parsed.options[key] = true;
    } else {
      parsed._.push(arg);
    }
  }

  return parsed;
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const { _, options } = parseArgs(rawArgs);

  if (options.help || options.h || _.length === 0) {
    printHelp();
    return;
  }

  if (options.version || options.v) {
    console.log('agent-bridge-suite v1.0.0');
    return;
  }

  const moduleCommand = _[0];
  const subCommand = _[1];

  // ----------------------------------------------------
  // MEMORY COMMANDS
  // ----------------------------------------------------
  if (moduleCommand === 'memory') {
    const store = new MemoryStore();

    if (subCommand === 'recall') {
      const query = _[2];
      if (!query) {
        console.error(`${c.red}Error: Missing query term.${c.reset} Usage: agent-bridge memory recall <query>`);
        process.exit(1);
      }

      const limit = options.limit ? parseInt(options.limit, 10) : 5;
      const scope = options.scope;

      console.log(`${c.dim}Searching episodic memory with BM25 for: "${query}"...${c.reset}\n`);
      const results = store.recall(query, limit, scope);

      if (results.length === 0) {
        console.log(`${c.yellow}No memories matched query: "${query}"${c.reset}`);
        return;
      }

      console.log(`${c.green}${c.bold}Found ${results.length} relevant memories (ranked by BM25):${c.reset}\n`);
      results.forEach((r, idx) => {
        const categoryColor =
          r.item.category === 'gotchas'
            ? c.red
            : r.item.category === 'architecture'
            ? c.blue
            : r.item.category === 'performance'
            ? c.yellow
            : c.magenta;

        console.log(`${c.bold}${idx + 1}. [${categoryColor}${r.item.category.toUpperCase()}${c.reset}${c.bold}] ${r.item.title}${c.reset} (BM25: ${c.cyan}${r.score}${c.reset}, Scope: ${r.item.projectScope})`);
        console.log(`${r.item.content}`);
        console.log(`${c.dim}Tags: ${r.item.tags.join(', ') || 'none'} | Matches: ${r.matchedTerms.join(', ')} | ID: ${r.item.id}${c.reset}`);
        console.log(`${c.dim}-------------------------------------------------------${c.reset}`);
      });
      return;
    }

    if (subCommand === 'record') {
      const title = _[2];
      const content = _[3];
      if (!title || !content) {
        console.error(`${c.red}Error: Title and content required.${c.reset} Usage: agent-bridge memory record <title> <content>`);
        process.exit(1);
      }

      const category = options.category || 'gotchas';
      const validCategories = ['gotchas', 'architecture', 'user_preferences', 'performance'];
      if (!validCategories.includes(category)) {
        console.error(`${c.red}Error: Invalid category "${category}". Must be one of: ${validCategories.join(', ')}${c.reset}`);
        process.exit(1);
      }

      const tags = options.tags ? options.tags.split(',').map((t) => t.trim()) : [];
      const projectScope = options.scope || 'global';

      const item = store.record({
        category,
        title,
        content,
        tags,
        projectScope,
      });

      console.log(`${c.green}✅ Memory insight recorded successfully!${c.reset}`);
      console.log(`ID:       ${c.cyan}${item.id}${c.reset}`);
      console.log(`Category: [${item.category}]`);
      console.log(`Title:    ${item.title}`);
      console.log(`Scope:    ${item.projectScope}`);
      console.log(`Tags:     ${item.tags.join(', ') || 'none'}`);
      return;
    }

    if (subCommand === 'list') {
      const category = options.category;
      const scope = options.scope;
      const items = store.list(category, scope);

      if (items.length === 0) {
        console.log(`${c.yellow}Memory store is empty.${c.reset}`);
        return;
      }

      console.log(`${c.bold}📋 Stored Memories (${items.length} total):${c.reset}\n`);
      for (const item of items) {
        console.log(`• [${c.cyan}${item.category}${c.reset}] ${c.bold}${item.title}${c.reset} (Scope: ${item.projectScope}, ID: ${item.id}, Recalls: ${item.accessCount})`);
      }
      return;
    }

    if (subCommand === 'stats') {
      const stats = store.getStats();
      console.log(`${c.bold}📊 Episodic Memory Statistics:${c.reset}`);
      console.log(`- Storage Engine: ${c.bold}${c.cyan}${stats.engine.toUpperCase()}${c.reset} (${stats.engine === 'sqlite' ? 'Native node:sqlite + FTS5 BM25' : 'In-Memory Map + JSON'})`);
      console.log(`- Total Memories:  ${c.bold}${c.green}${stats.total}${c.reset}`);
      console.log(`- By Category:`);
      for (const [cat, count] of Object.entries(stats.byCategory)) {
        console.log(`    ${cat}: ${count}`);
      }
      console.log(`- By Project Scope:`);
      for (const [scope, count] of Object.entries(stats.byScope)) {
        console.log(`    ${scope}: ${count}`);
      }
      console.log(`- Top Tags: ${stats.topTags.map((t) => `${t.tag} (${t.count})`).join(', ') || 'none'}`);
      console.log(`- Most Recalled Insights:`);
      if (stats.mostAccessed.length === 0) {
        console.log(`    none yet`);
      } else {
        for (const m of stats.mostAccessed) {
          console.log(`    ${m.title} (${m.accessCount} recalls)`);
        }
      }
      return;
    }

    if (subCommand === 'export') {
      const format = options.format || 'markdown';
      const output = format === 'json' ? store.exportJson() : store.exportMarkdown();

      if (options.output) {
        const targetPath = path.resolve(process.cwd(), options.output);
        fs.writeFileSync(targetPath, output, 'utf-8');
        console.log(`${c.green}✅ Exported memories to ${targetPath}${c.reset}`);
      } else {
        console.log(output);
      }
      return;
    }

    if (subCommand === 'import') {
      const filePath = _[2];
      if (!filePath) {
        console.error(`${c.red}Error: Missing backup file path.${c.reset} Usage: agent-bridge memory import <filePath>`);
        process.exit(1);
      }

      const targetPath = path.resolve(process.cwd(), filePath);
      if (!fs.existsSync(targetPath)) {
        console.error(`${c.red}Error: File not found: ${targetPath}${c.reset}`);
        process.exit(1);
      }

      const rawJson = fs.readFileSync(targetPath, 'utf-8');
      const mode = options.mode === 'overwrite' ? 'overwrite' : 'skip';
      const result = store.importJson(rawJson, mode);
      console.log(`${c.green}✅ Import completed:${c.reset} ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped.`);
      return;
    }

    if (subCommand === 'delete') {
      const id = _[2];
      if (!id) {
        console.error(`${c.red}Error: Missing memory ID.${c.reset} Usage: agent-bridge memory delete <id>`);
        process.exit(1);
      }

      const success = store.delete(id);
      if (success) {
        console.log(`${c.green}🗑️ Memory entry ${id} deleted successfully.${c.reset}`);
      } else {
        console.log(`${c.yellow}⚠️ Memory entry ${id} not found.${c.reset}`);
      }
      return;
    }

    console.error(`${c.red}Unknown memory subcommand: "${subCommand}". Run agent-bridge --help for details.${c.reset}`);
    process.exit(1);
  }

  // ----------------------------------------------------
  // TWIN COMMANDS
  // ----------------------------------------------------
  if (moduleCommand === 'twin') {
    const engine = new TwinEngine();

    if (subCommand === 'status') {
      const active = engine.getActiveProvider();
      console.log(`${c.bold}🤖 Speculative-Twin Engine Status:${c.reset}`);
      console.log(`- Active Provider: ${c.bold}${c.green}${active.toUpperCase()}${c.reset}`);
      console.log(`- Mode:            ${active === 'local_heuristic' ? 'Zero-Token Offline Heuristic' : 'Live Frontier Remote API'}`);
      console.log(`- Upstream options: Anthropic Claude, Google Gemini, OpenAI-compatible, Local Heuristics`);
      return;
    }

    if (subCommand === 'critique') {
      const target = _[2];
      if (!target) {
        console.error(`${c.red}Error: Missing file path or code string.${c.reset} Usage: agent-bridge twin critique <fileOrCode>`);
        process.exit(1);
      }

      let codeToAudit = target;
      if (fs.existsSync(target)) {
        codeToAudit = fs.readFileSync(target, 'utf-8');
        console.log(`${c.dim}Auditing file: ${target}...${c.reset}\n`);
      }

      const context = options.context;
      const critique = await engine.critique(codeToAudit, context);

      const verdictColor =
        critique.verdict === 'APPROVED'
          ? c.green
          : critique.verdict === 'NEEDS_REVISION'
          ? c.yellow
          : c.red;

      console.log(`${c.bold}🕵️ Speculative-Twin Adversarial Review [Provider: ${critique.providerUsed}]${c.reset}`);
      console.log(`Verdict:    ${verdictColor}${c.bold}${critique.verdict}${c.reset} (Confidence: ${(critique.confidence * 100).toFixed(0)}%)`);
      console.log(`Summary:    ${critique.summary}\n`);

      console.log(`${c.bold}Adversarial Checklist:${c.reset}`);
      console.log(`- Race Conditions Safe: ${critique.adversarialChecklist.raceConditions ? '✅' : '❌'}`);
      console.log(`- Type Safety:          ${critique.adversarialChecklist.typeSafety ? '✅' : '❌'}`);
      console.log(`- Robust Error Handling:${critique.adversarialChecklist.errorHandling ? '✅' : '❌'}`);
      console.log(`- Memory Efficiency:    ${critique.adversarialChecklist.memoryEfficiency ? '✅' : '❌'}`);
      console.log(`- Secret Protection:    ${critique.adversarialChecklist.secretProtection ? '✅' : '❌'}\n`);

      if (critique.issues.length === 0) {
        console.log(`${c.green}🎉 No adversarial flaws detected! Clean pass.${c.reset}`);
      } else {
        console.log(`${c.bold}Detected Issues:${c.reset}`);
        critique.issues.forEach((iss, i) => {
          const sevColor = iss.severity === 'P0' ? c.red : iss.severity === 'P1' ? c.yellow : c.dim;
          console.log(` ${i + 1}. [${sevColor}${c.bold}${iss.severity}${c.reset}] ${iss.description}`);
          console.log(`    👉 Recommendation: ${iss.recommendation}`);
        });
      }

      if (critique.issues.some((i) => i.severity === 'P0')) {
        process.exit(1);
      }
      return;
    }

    if (subCommand === 'speculate') {
      const requirement = _[2];
      if (!requirement) {
        console.error(`${c.red}Error: Missing requirement description.${c.reset} Usage: agent-bridge twin speculate <requirement>`);
        process.exit(1);
      }

      console.log(`${c.dim}Generating speculative candidates across paradigms for: "${requirement}"...${c.reset}\n`);
      const candidates = await engine.speculate(requirement);

      candidates.forEach((cand) => {
        console.log(`${c.cyan}${c.bold}=== [${cand.id}] Paradigm: ${cand.paradigm} (Complexity: ${cand.complexityScore}/5) ===${c.reset}`);
        console.log(`${c.green}Pros:${c.reset} ${cand.pros.join(' | ')}`);
        console.log(`${c.yellow}Cons:${c.reset} ${cand.cons.join(' | ')}`);
        console.log(`\n${cand.code}\n`);
      });
      return;
    }

    if (subCommand === 'synthesize') {
      const fileA = _[2];
      const fileB = _[3];
      if (!fileA || !fileB) {
        console.error(`${c.red}Error: Two file paths required.${c.reset} Usage: agent-bridge twin synthesize <fileA> <fileB>`);
        process.exit(1);
      }

      const contentA = fs.existsSync(fileA) ? fs.readFileSync(fileA, 'utf-8') : fileA;
      const contentB = fs.existsSync(fileB) ? fs.readFileSync(fileB, 'utf-8') : fileB;
      const context = options.context;

      const unified = engine.synthesize(contentA, contentB, context);
      console.log(`${c.green}${c.bold}⚖️ Consensus Synthesis Generated:${c.reset}\n`);
      console.log(unified);
      return;
    }

    console.error(`${c.red}Unknown twin subcommand: "${subCommand}". Run agent-bridge --help for details.${c.reset}`);
    process.exit(1);
  }

  // ----------------------------------------------------
  // HOOK COMMANDS (Git Pre-Commit Guardrail)
  // ----------------------------------------------------
  if (moduleCommand === 'hook') {
    const gitDir = path.resolve(process.cwd(), '.git');
    if (!fs.existsSync(gitDir)) {
      console.error(`${c.red}Error: No .git directory found in current working directory.${c.reset}`);
      process.exit(1);
    }

    const hooksDir = path.join(gitDir, 'hooks');
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    const preCommitPath = path.join(hooksDir, 'pre-commit');

    if (subCommand === 'install') {
      const hookScript = `#!/usr/bin/env sh
# Speculative-Twin Adversarial Git Hook
echo "🕵️ [Speculative-Twin] Auditing staged files for P0 vulnerabilities & secret leaks..."

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(ts|js|mjs|cjs)$')

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

for FILE in $STAGED_FILES; do
  if [ -f "$FILE" ]; then
    node ./bin/agent-bridge.mjs twin critique "$FILE" --context="Git Pre-commit Hook"
    if [ $? -ne 0 ]; then
      echo "❌ Commit rejected: Adversarial flaws found in $FILE"
      exit 1
    fi
  fi
done

echo "✅ All staged files passed Speculative-Twin audit!"
exit 0
`;
      fs.writeFileSync(preCommitPath, hookScript, { mode: 0o755 });
      console.log(`${c.green}✅ Pre-commit hook installed successfully!${c.reset}`);
      console.log(`Path: ${preCommitPath}`);
      console.log(`Git will now automatically audit staged TypeScript/JavaScript files with Speculative-Twin before every commit.`);
      return;
    }

    if (subCommand === 'uninstall') {
      if (fs.existsSync(preCommitPath)) {
        fs.unlinkSync(preCommitPath);
        console.log(`${c.green}🗑️ Pre-commit hook uninstalled successfully.${c.reset}`);
      } else {
        console.log(`${c.yellow}No pre-commit hook found at ${preCommitPath}.${c.reset}`);
      }
      return;
    }

    if (subCommand === 'status') {
      const exists = fs.existsSync(preCommitPath);
      console.log(`${c.bold}⚓ Git Pre-commit Hook Status:${c.reset}`);
      console.log(`- Installed: ${exists ? c.green + 'ACTIVE ✅' : c.yellow + 'NOT INSTALLED ❌'}${c.reset}`);
      console.log(`- Location:  ${preCommitPath}`);
      return;
    }

    console.error(`${c.red}Unknown hook subcommand: "${subCommand}". Usage: agent-bridge hook install | uninstall | status${c.reset}`);
    process.exit(1);
  }

  console.error(`${c.red}Unknown command: "${moduleCommand}". Run agent-bridge --help for available commands.${c.reset}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(`${c.red}Fatal CLI error: ${err.message}${c.reset}`);
  process.exit(1);
});
