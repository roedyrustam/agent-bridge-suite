#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { TwinEngine } from './engine.js';

const engine = new TwinEngine();

const server = new Server(
  {
    name: 'speculative-twin',
    version: '0.2.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register Available Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'twin_critique',
        description:
          'Submit a code draft or architectural proposal to the adversarial peer twin model (Claude / Gemini / OpenAI / Local Heuristics) to detect security vulnerabilities, secret leaks, race conditions, edge cases, and type safety issues.',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The code implementation or architectural plan to be stress-tested.',
            },
            context: {
              type: 'string',
              description: 'Context, system constraints, or intended behavior.',
            },
          },
          required: ['code'],
        },
      },
      {
        name: 'twin_speculate',
        description:
          'Generate speculative alternative implementations under different algorithmic paradigms (defensive immutable vs high-throughput streaming vs zero-alloc) before picking an approach.',
        inputSchema: {
          type: 'object',
          properties: {
            requirement: {
              type: 'string',
              description: 'The feature or bug fix requirement.',
            },
            currentDraft: {
              type: 'string',
              description: 'Optional initial code draft to diverge from.',
            },
          },
          required: ['requirement'],
        },
      },
      {
        name: 'twin_synthesize',
        description:
          'Synthesize two competing drafts into a unified, hardened solution that takes the best invariants of both.',
        inputSchema: {
          type: 'object',
          properties: {
            draftA: {
              type: 'string',
              description: 'First implementation draft.',
            },
            draftB: {
              type: 'string',
              description: 'Second implementation draft.',
            },
            context: {
              type: 'string',
              description: 'Goal or trade-off priority (e.g. "prioritize safety over memory overhead").',
            },
          },
          required: ['draftA', 'draftB'],
        },
      },
      {
        name: 'twin_status',
        description:
          'Inspect the active model provider configuration and capability mode of the speculative-twin engine.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'twin_status') {
      const active = engine.getActiveProvider();
      return {
        content: [
          {
            type: 'text',
            text: `🤖 **Speculative-Twin Status**:
- Active Provider: **${active.toUpperCase()}**
- Mode: ${active === 'local_heuristic' ? 'Offline Zero-Token Heuristics' : 'Live Frontier Cross-Model API'}
- Supported Upstreams: Anthropic (Claude), Google Gemini, OpenAI-compatible endpoints, Local Heuristics`,
          },
        ],
      };
    }

    if (name === 'twin_critique') {
      const { code, context } = args as { code: string; context?: string };
      const result = await engine.critique(code, context);

      const issuesList =
        result.issues.length === 0
          ? 'None 🎉'
          : result.issues
              .map(
                (iss, i) =>
                  `${i + 1}. [${iss.severity}] ${iss.description}\n   👉 Fix: ${iss.recommendation}`
              )
              .join('\n\n');

      const checklist = `
- Race Conditions Safe: ${result.adversarialChecklist.raceConditions ? '✅' : '❌'}
- Type Safety: ${result.adversarialChecklist.typeSafety ? '✅' : '❌'}
- Robust Error Handling: ${result.adversarialChecklist.errorHandling ? '✅' : '❌'}
- Memory Efficiency: ${result.adversarialChecklist.memoryEfficiency ? '✅' : '❌'}
- Secret Protection: ${result.adversarialChecklist.secretProtection ? '✅' : '❌'}`;

      const text = `🕵️ **Speculative-Twin Adversarial Review** [Provider: ${result.providerUsed || 'engine'}]
**Verdict:** ${result.verdict} (Confidence: ${(result.confidence * 100).toFixed(0)}%)

**Summary:** ${result.summary}

**Adversarial Checklist:**
${checklist}

**Issues Detected:**
${issuesList}`;

      return {
        content: [{ type: 'text', text }],
      };
    }

    if (name === 'twin_speculate') {
      const { requirement, currentDraft } = args as { requirement: string; currentDraft?: string };
      const candidates = await engine.speculate(requirement, currentDraft);

      const formatted = candidates
        .map(
          (c) => `### Candidate [${c.id}] — Paradigm: ${c.paradigm} (Complexity: ${c.complexityScore}/5)
**Pros:** ${c.pros.join(', ')}
**Cons:** ${c.cons.join(', ')}

\`\`\`typescript
${c.code}
\`\`\``
        )
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `🧪 **Speculative Draft Candidates for: "${requirement}"**\n\n${formatted}`,
          },
        ],
      };
    }

    if (name === 'twin_synthesize') {
      const { draftA, draftB, context } = args as {
        draftA: string;
        draftB: string;
        context?: string;
      };

      const unified = engine.synthesize(draftA, draftB, context);
      return {
        content: [
          {
            type: 'text',
            text: `⚖️ **Consensus Synthesis Generated**:\n\n\`\`\`typescript\n${unified}\n\`\`\``,
          },
        ],
      };
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `❌ Error in twin tool: ${message}` }],
      isError: true,
    };
  }
});

// Start Server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[speculative-twin] MCP Server v0.2.0 running on stdio');
}

main().catch((err) => {
  console.error('[speculative-twin] Fatal startup error:', err);
  process.exit(1);
});
