import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
export class MemoryStore {
    baseDir;
    filePath;
    memories = new Map();
    constructor(options) {
        this.baseDir = options?.baseDir || path.join(os.homedir(), '.agent-memory');
        this.filePath = options?.filePath || path.join(this.baseDir, 'memories.json');
        this.ensureInitialized();
    }
    ensureInitialized() {
        try {
            if (!fs.existsSync(this.baseDir)) {
                fs.mkdirSync(this.baseDir, { recursive: true });
            }
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                const parsed = JSON.parse(raw);
                for (const item of parsed) {
                    this.memories.set(item.id, item);
                }
            }
            else {
                this.flush();
            }
        }
        catch (err) {
            console.error('[MemoryStore] Failed to initialize store:', err);
        }
    }
    flush() {
        try {
            const items = Array.from(this.memories.values());
            const tempPath = `${this.filePath}.tmp_${Date.now()}`;
            fs.writeFileSync(tempPath, JSON.stringify(items, null, 2), 'utf-8');
            fs.renameSync(tempPath, this.filePath);
        }
        catch (err) {
            console.error('[MemoryStore] Failed to flush memories to disk:', err);
        }
    }
    record(params) {
        const now = new Date().toISOString();
        const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const item = {
            id,
            category: params.category,
            title: params.title.trim(),
            content: params.content.trim(),
            tags: (params.tags || []).map((t) => t.toLowerCase().trim()),
            projectScope: (params.projectScope || 'global').toLowerCase().trim(),
            createdAt: now,
            updatedAt: now,
            accessCount: 0,
        };
        this.memories.set(id, item);
        this.flush();
        return item;
    }
    /**
     * Tokenizes text into normalized keywords.
     */
    tokenize(text) {
        return text
            .toLowerCase()
            .split(/[\s,._\-/:;!?'"()[\]{}<>@#$%^&*+=~`|\\]+/)
            .filter((t) => t.length >= 2);
    }
    /**
     * High-accuracy BM25 ranking algorithm with field-specific weighting.
     */
    recall(query, limit = 5, projectScope) {
        const terms = this.tokenize(query);
        if (terms.length === 0) {
            return [];
        }
        const scopeFilter = projectScope?.toLowerCase().trim();
        const items = Array.from(this.memories.values()).filter((item) => {
            if (scopeFilter && item.projectScope !== 'global' && item.projectScope !== scopeFilter) {
                return false;
            }
            return true;
        });
        if (items.length === 0) {
            return [];
        }
        const N = items.length;
        const k1 = 1.2;
        const b = 0.75;
        // Precompute document field tokens and lengths
        const docData = items.map((item) => {
            const titleTokens = this.tokenize(item.title);
            const tagTokens = item.tags.flatMap((t) => this.tokenize(t));
            const contentTokens = this.tokenize(item.content);
            const totalLen = titleTokens.length + tagTokens.length + contentTokens.length;
            return {
                item,
                titleTokens,
                tagTokens,
                contentTokens,
                totalLen: Math.max(totalLen, 1),
            };
        });
        const avgdl = docData.reduce((acc, d) => acc + d.totalLen, 0) / Math.max(N, 1);
        // Compute document frequency (DF) for each query term
        const dfMap = new Map();
        for (const term of terms) {
            let df = 0;
            for (const d of docData) {
                const inDoc = d.titleTokens.includes(term) ||
                    d.tagTokens.includes(term) ||
                    d.contentTokens.includes(term);
                if (inDoc) {
                    df++;
                }
            }
            dfMap.set(term, df);
        }
        const results = [];
        const queryLower = query.toLowerCase().trim();
        for (const d of docData) {
            let score = 0;
            const matchedTerms = [];
            for (const term of terms) {
                const df = dfMap.get(term) || 0;
                if (df === 0)
                    continue;
                // Count weighted term frequency in document:
                // Title weight = 3.5, Tags weight = 2.5, Content weight = 1.0
                const titleCount = d.titleTokens.filter((t) => t === term || t.includes(term)).length;
                const tagCount = d.tagTokens.filter((t) => t === term || t.includes(term)).length;
                const contentCount = d.contentTokens.filter((t) => t === term || t.includes(term)).length;
                const tf = titleCount * 3.5 + tagCount * 2.5 + contentCount * 1.0;
                if (tf > 0) {
                    matchedTerms.push(term);
                    // Standard BM25 IDF formulation
                    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
                    const num = tf * (k1 + 1);
                    const denom = tf + k1 * (1 - b + b * (d.totalLen / avgdl));
                    score += idf * (num / denom);
                }
            }
            // Bonus for exact multi-token query matches in title or tags
            if (d.item.title.toLowerCase().includes(queryLower)) {
                score += 5.0;
            }
            if (d.item.tags.some((t) => t.includes(queryLower) || queryLower.includes(t))) {
                score += 3.5;
            }
            // Recency / access frequency bonus (capped)
            score += Math.min(d.item.accessCount * 0.2, 3.0);
            if (score > 0 && matchedTerms.length > 0) {
                results.push({
                    item: d.item,
                    score: Math.round(score * 100) / 100,
                    matchedTerms: Array.from(new Set(matchedTerms)),
                });
            }
        }
        results.sort((a, b) => b.score - a.score);
        const topResults = results.slice(0, limit);
        // Update telemetry
        const now = new Date().toISOString();
        for (const res of topResults) {
            res.item.accessCount += 1;
            res.item.lastRecalledAt = now;
            this.memories.set(res.item.id, res.item);
        }
        if (topResults.length > 0) {
            this.flush();
        }
        return topResults;
    }
    list(category, projectScope) {
        let items = Array.from(this.memories.values());
        if (category) {
            items = items.filter((i) => i.category === category);
        }
        if (projectScope) {
            const scope = projectScope.toLowerCase().trim();
            items = items.filter((i) => i.projectScope === 'global' || i.projectScope === scope);
        }
        return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    delete(id) {
        if (this.memories.has(id)) {
            this.memories.delete(id);
            this.flush();
            return true;
        }
        return false;
    }
    getStats() {
        const items = Array.from(this.memories.values());
        const byCategory = {
            gotchas: 0,
            architecture: 0,
            user_preferences: 0,
            performance: 0,
        };
        const byScope = {};
        const tagCountMap = new Map();
        for (const item of items) {
            byCategory[item.category] = (byCategory[item.category] || 0) + 1;
            byScope[item.projectScope] = (byScope[item.projectScope] || 0) + 1;
            for (const tag of item.tags) {
                tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
            }
        }
        const topTags = Array.from(tagCountMap.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        const mostAccessed = [...items]
            .sort((a, b) => b.accessCount - a.accessCount)
            .slice(0, 5)
            .map((i) => ({ id: i.id, title: i.title, accessCount: i.accessCount }));
        return {
            total: items.length,
            byCategory,
            byScope,
            topTags,
            mostAccessed,
        };
    }
    exportJson() {
        const items = Array.from(this.memories.values());
        return JSON.stringify(items, null, 2);
    }
    exportMarkdown() {
        const items = this.list();
        if (items.length === 0) {
            return '# Agent Episodic Memory Store\n\nNo memories recorded yet.';
        }
        const sections = ['# Agent Episodic Memory Store\n'];
        for (const item of items) {
            sections.push(`## [${item.category.toUpperCase()}] ${item.title}
- **ID**: \`${item.id}\`
- **Scope**: \`${item.projectScope}\`
- **Tags**: ${item.tags.map((t) => `\`${t}\``).join(', ') || 'none'}
- **Created**: ${item.createdAt} | **Access Count**: ${item.accessCount}

${item.content}
`);
        }
        return sections.join('\n---\n\n');
    }
    importJson(jsonString, mergeMode = 'skip') {
        const parsed = JSON.parse(jsonString);
        if (!Array.isArray(parsed)) {
            throw new Error('Import data must be a JSON array of MemoryItem objects.');
        }
        let imported = 0;
        let updated = 0;
        let skipped = 0;
        for (const item of parsed) {
            if (!item.id || !item.title || !item.category || !item.content) {
                skipped++;
                continue;
            }
            if (this.memories.has(item.id)) {
                if (mergeMode === 'overwrite') {
                    this.memories.set(item.id, item);
                    updated++;
                }
                else {
                    skipped++;
                }
            }
            else {
                this.memories.set(item.id, item);
                imported++;
            }
        }
        this.flush();
        return { imported, updated, skipped };
    }
}
