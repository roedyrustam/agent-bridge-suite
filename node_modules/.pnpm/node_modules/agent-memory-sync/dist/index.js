#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { MemoryStore } from './store.js';
const store = new MemoryStore();
const server = new Server({
    name: 'agent-memory-sync',
    version: '0.2.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Register Available Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'memory_record',
                description: 'Persist an architectural decision, debugging gotcha, performance finding, or user preference into cross-IDE episodic memory.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        category: {
                            type: 'string',
                            enum: ['gotchas', 'architecture', 'user_preferences', 'performance'],
                            description: 'The category of the memory insight.',
                        },
                        title: {
                            type: 'string',
                            description: 'A concise summary title (e.g. "Prisma Connection Pool Starvation in Serverless").',
                        },
                        content: {
                            type: 'string',
                            description: 'Detailed explanation, root cause analysis, or rule guidelines.',
                        },
                        tags: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Keywords and technology tags (e.g. ["prisma", "postgres", "nextjs"]).',
                        },
                        projectScope: {
                            type: 'string',
                            description: 'Workspace / project identifier, or "global" for rules that apply anywhere.',
                        },
                    },
                    required: ['category', 'title', 'content'],
                },
            },
            {
                name: 'memory_recall',
                description: 'Retrieve relevant historical insights, gotchas, and conventions using BM25 semantic ranking before planning or executing tasks.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search terms or natural language description of the current task/bug.',
                        },
                        limit: {
                            type: 'number',
                            description: 'Max number of results to return (default: 5).',
                        },
                        projectScope: {
                            type: 'string',
                            description: 'Scope search to a specific project or include global knowledge.',
                        },
                    },
                    required: ['query'],
                },
            },
            {
                name: 'memory_list',
                description: 'List all recorded memories with optional filtering by category or project scope.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        category: {
                            type: 'string',
                            enum: ['gotchas', 'architecture', 'user_preferences', 'performance'],
                            description: 'Filter memories by category.',
                        },
                        projectScope: {
                            type: 'string',
                            description: 'Filter memories by project scope.',
                        },
                    },
                },
            },
            {
                name: 'memory_stats',
                description: 'Get telemetry and aggregate statistics of stored memories (counts, scopes, top tags, most accessed).',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'memory_export',
                description: 'Export all memories into either JSON or formatted Markdown for external backups or documentation.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        format: {
                            type: 'string',
                            enum: ['json', 'markdown'],
                            description: 'Output format (default: markdown).',
                        },
                    },
                },
            },
            {
                name: 'memory_import',
                description: 'Import previously exported memory records from a JSON string.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        jsonData: {
                            type: 'string',
                            description: 'Raw JSON string containing an array of MemoryItem objects.',
                        },
                        mergeMode: {
                            type: 'string',
                            enum: ['skip', 'overwrite'],
                            description: 'How to handle existing memory IDs ("skip" or "overwrite", default: "skip").',
                        },
                    },
                    required: ['jsonData'],
                },
            },
            {
                name: 'memory_delete',
                description: 'Delete an outdated or obsolete memory entry by its unique ID.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Unique memory ID (e.g. mem_1710000000_abcde).',
                        },
                    },
                    required: ['id'],
                },
            },
        ],
    };
});
// Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        if (name === 'memory_record') {
            const { category, title, content, tags, projectScope } = args;
            const item = store.record({ category, title, content, tags, projectScope });
            return {
                content: [
                    {
                        type: 'text',
                        text: `✅ Memory recorded successfully!\nID: ${item.id}\nCategory: [${item.category}]\nTitle: ${item.title}\nScope: ${item.projectScope}\nTags: ${item.tags.join(', ') || 'none'}`,
                    },
                ],
            };
        }
        if (name === 'memory_recall') {
            const { query, limit, projectScope } = args;
            const results = store.recall(query, limit || 5, projectScope);
            if (results.length === 0) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `No prior episodic memories found matching: "${query}".`,
                        },
                    ],
                };
            }
            const formatted = results
                .map((r, idx) => {
                return `${idx + 1}. [${r.item.category.toUpperCase()}] ${r.item.title} (BM25 Score: ${r.score}, Scope: ${r.item.projectScope})
${r.item.content}
Matched Terms: ${r.matchedTerms.join(', ')} | Tags: ${r.item.tags.join(', ')} | Recalled: ${r.item.accessCount} times | ID: ${r.item.id}`;
            })
                .join('\n\n---\n\n');
            return {
                content: [
                    {
                        type: 'text',
                        text: `🧠 Found ${results.length} relevant memories (ranked by BM25):\n\n${formatted}`,
                    },
                ],
            };
        }
        if (name === 'memory_list') {
            const { category, projectScope } = (args || {});
            const items = store.list(category, projectScope);
            if (items.length === 0) {
                return {
                    content: [{ type: 'text', text: 'Memory store is currently empty.' }],
                };
            }
            const summary = items
                .map((i) => `- [${i.category}] **${i.title}** (Scope: ${i.projectScope}, ID: ${i.id}, Access: ${i.accessCount})`)
                .join('\n');
            return {
                content: [
                    {
                        type: 'text',
                        text: `📋 Stored Memories (${items.length} total):\n\n${summary}`,
                    },
                ],
            };
        }
        if (name === 'memory_stats') {
            const stats = store.getStats();
            const catSummary = Object.entries(stats.byCategory)
                .map(([c, count]) => `  - ${c}: ${count}`)
                .join('\n');
            const scopeSummary = Object.entries(stats.byScope)
                .map(([s, count]) => `  - ${s}: ${count}`)
                .join('\n');
            const topTagsSummary = stats.topTags.length > 0
                ? stats.topTags.map((t) => `${t.tag} (${t.count})`).join(', ')
                : 'none';
            const mostAccessedSummary = stats.mostAccessed.length > 0
                ? stats.mostAccessed.map((m) => `  - ${m.title} (${m.accessCount} recalls)`).join('\n')
                : '  - none';
            const output = `📊 **Episodic Memory Statistics**:
- Total Memories: **${stats.total}**
- By Category:
${catSummary}
- By Project Scope:
${scopeSummary}
- Top Tags: ${topTagsSummary}
- Most Accessed Insights:
${mostAccessedSummary}`;
            return {
                content: [{ type: 'text', text: output }],
            };
        }
        if (name === 'memory_export') {
            const { format = 'markdown' } = (args || {});
            const output = format === 'json' ? store.exportJson() : store.exportMarkdown();
            return {
                content: [{ type: 'text', text: output }],
            };
        }
        if (name === 'memory_import') {
            const { jsonData, mergeMode = 'skip' } = args;
            const result = store.importJson(jsonData, mergeMode);
            return {
                content: [
                    {
                        type: 'text',
                        text: `📥 **Import Finished**: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped.`,
                    },
                ],
            };
        }
        if (name === 'memory_delete') {
            const { id } = args;
            const success = store.delete(id);
            return {
                content: [
                    {
                        type: 'text',
                        text: success
                            ? `🗑️ Memory entry ${id} deleted successfully.`
                            : `⚠️ Memory entry ${id} not found.`,
                    },
                ],
            };
        }
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: 'text', text: `❌ Error in memory tool: ${message}` }],
            isError: true,
        };
    }
});
// Start Server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[agent-memory-sync] MCP Server v0.2.0 running on stdio');
}
main().catch((err) => {
    console.error('[agent-memory-sync] Fatal startup error:', err);
    process.exit(1);
});
