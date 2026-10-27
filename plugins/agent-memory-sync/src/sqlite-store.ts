import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import {
  MemoryItem,
  RecallResult,
  MemoryCategory,
  MemoryStats,
  MemoryStoreOptions,
} from './types.js';

interface RawDbRow {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string;
  project_scope: string;
  created_at: string;
  updated_at: string;
  access_count: number;
  last_recalled_at: string | null;
  fts_rank?: number;
}

export class SqliteMemoryStore {
  private db: DatabaseSync;
  private dbPath: string;
  private baseDir: string;

  constructor(options?: MemoryStoreOptions) {
    this.baseDir = options?.baseDir || path.join(os.homedir(), '.agent-memory');
    this.dbPath = options?.sqlitePath || path.join(this.baseDir, 'memories.sqlite');

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }

    this.db = new DatabaseSync(this.dbPath);
    this.initializeSchema();

    // Auto-migrate from JSON if SQLite database is empty and memories.json exists
    if (options?.autoMigrate !== false) {
      const jsonPath = options?.filePath || path.join(this.baseDir, 'memories.json');
      this.autoMigrateFromJson(jsonPath);
    }
  }

  private initializeSchema(): void {
    // Enable WAL mode for high concurrency & write performance
    this.db.exec(`PRAGMA journal_mode = WAL;`);
    this.db.exec(`PRAGMA synchronous = NORMAL;`);

    // Core structured memories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT NOT NULL,
        project_scope TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        access_count INTEGER NOT NULL DEFAULT 0,
        last_recalled_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_memories_scope ON memories(project_scope);
      CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
      CREATE INDEX IF NOT EXISTS idx_memories_access ON memories(access_count DESC);
    `);

    // FTS5 Virtual Table for full-text BM25 search
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        id UNINDEXED,
        title,
        content,
        tags
      );

      CREATE TRIGGER IF NOT EXISTS trg_memories_fts_insert AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(id, title, content, tags)
        VALUES (new.id, new.title, new.content, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS trg_memories_fts_delete AFTER DELETE ON memories BEGIN
        DELETE FROM memories_fts WHERE id = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS trg_memories_fts_update AFTER UPDATE ON memories BEGIN
        DELETE FROM memories_fts WHERE id = old.id;
        INSERT INTO memories_fts(id, title, content, tags)
        VALUES (new.id, new.title, new.content, new.tags);
      END;
    `);
  }

  private autoMigrateFromJson(jsonPath: string): void {
    try {
      if (fs.existsSync(jsonPath)) {
        const countRow = this.db.prepare('SELECT COUNT(*) as cnt FROM memories').get() as { cnt: number };
        if (countRow && countRow.cnt === 0) {
          const raw = fs.readFileSync(jsonPath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.importJson(raw, 'skip');
          }
        }
      }
    } catch {
      // Ignore migration errors
    }
  }

  private mapRowToItem(row: RawDbRow): MemoryItem {
    let parsedTags: string[] = [];
    try {
      parsedTags = JSON.parse(row.tags);
    } catch {
      parsedTags = row.tags ? row.tags.split(',').map((t) => t.trim()) : [];
    }

    return {
      id: row.id,
      category: row.category as MemoryCategory,
      title: row.title,
      content: row.content,
      tags: parsedTags,
      projectScope: row.project_scope,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      accessCount: row.access_count,
      lastRecalledAt: row.last_recalled_at || undefined,
    };
  }

  public record(params: {
    category: MemoryCategory;
    title: string;
    content: string;
    tags?: string[];
    projectScope?: string;
  }): MemoryItem {
    const now = new Date().toISOString();
    const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tagsArray = (params.tags || []).map((t) => t.toLowerCase().trim());
    const tagsJson = JSON.stringify(tagsArray);
    const scope = (params.projectScope || 'global').toLowerCase().trim();

    const stmt = this.db.prepare(`
      INSERT INTO memories (id, category, title, content, tags, project_scope, created_at, updated_at, access_count, last_recalled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
    `);

    stmt.run(
      id,
      params.category,
      params.title.trim(),
      params.content.trim(),
      tagsJson,
      scope,
      now,
      now
    );

    return {
      id,
      category: params.category,
      title: params.title.trim(),
      content: params.content.trim(),
      tags: tagsArray,
      projectScope: scope,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
    };
  }

  /**
   * High-accuracy BM25 recall powered natively by SQLite FTS5.
   */
  public recall(query: string, limit: number = 5, projectScope?: string): RecallResult[] {
    const rawTokens = query
      .toLowerCase()
      .split(/[\s,._\-/:;!?'"()[\]{}<>@#$%^&*+=~`|\\]+/)
      .filter((t) => t.length >= 2);

    if (rawTokens.length === 0) {
      return [];
    }

    const scopeFilter = projectScope?.toLowerCase().trim();

    // Prepare clean FTS query using OR clauses for high recall
    const ftsQuery = rawTokens.map((t) => `"${t}"`).join(' OR ');

    let rows: RawDbRow[] = [];

    try {
      if (scopeFilter) {
        const stmt = this.db.prepare(`
          SELECT m.*, bm25(f, 5.0, 1.0, 3.5) as fts_rank
          FROM memories_fts f
          JOIN memories m ON m.id = f.id
          WHERE memories_fts MATCH ?
            AND (m.project_scope = 'global' OR m.project_scope = ?)
          ORDER BY fts_rank ASC
          LIMIT ?
        `);
        rows = stmt.all(ftsQuery, scopeFilter, limit * 2) as unknown as RawDbRow[];
      } else {
        const stmt = this.db.prepare(`
          SELECT m.*, bm25(f, 5.0, 1.0, 3.5) as fts_rank
          FROM memories_fts f
          JOIN memories m ON m.id = f.id
          WHERE memories_fts MATCH ?
          ORDER BY fts_rank ASC
          LIMIT ?
        `);
        rows = stmt.all(ftsQuery, limit * 2) as unknown as RawDbRow[];
      }
    } catch {
      // If FTS match fails, fallback to LIKE query
      const likeClause = rawTokens.map(() => `(title LIKE ? OR content LIKE ? OR tags LIKE ?)`).join(' OR ');
      const likeParams: string[] = [];
      for (const t of rawTokens) {
        likeParams.push(`%${t}%`, `%${t}%`, `%${t}%`);
      }

      const sql = scopeFilter
        ? `SELECT *, 0 as fts_rank FROM memories WHERE (${likeClause}) AND (project_scope = 'global' OR project_scope = ?) ORDER BY access_count DESC LIMIT ?`
        : `SELECT *, 0 as fts_rank FROM memories WHERE (${likeClause}) ORDER BY access_count DESC LIMIT ?`;

      const stmt = this.db.prepare(sql);
      const params = scopeFilter ? [...likeParams, scopeFilter, limit] : [...likeParams, limit];
      rows = stmt.all(...params) as unknown as RawDbRow[];
    }

    const results: RecallResult[] = [];
    const now = new Date().toISOString();

    for (const row of rows) {
      const item = this.mapRowToItem(row);
      const matchedTerms: string[] = [];
      const titleLower = item.title.toLowerCase();
      const contentLower = item.content.toLowerCase();
      const tagsLower = item.tags.join(' ');

      for (const token of rawTokens) {
        if (titleLower.includes(token) || contentLower.includes(token) || tagsLower.includes(token)) {
          matchedTerms.push(token);
        }
      }

      // Convert SQLite FTS negative rank into a positive score
      // (FTS rank is negative, closer to -0.0001 is better, plus bonus for exact phrase match)
      const baseScore = Math.abs(row.fts_rank || 0) * 1000 + matchedTerms.length * 2.0;
      const exactTitleBonus = titleLower.includes(query.toLowerCase()) ? 5.0 : 0;
      const accessBonus = Math.min(item.accessCount * 0.2, 3.0);
      const score = Math.round((baseScore + exactTitleBonus + accessBonus) * 100) / 100;

      results.push({
        item,
        score,
        matchedTerms: Array.from(new Set(matchedTerms)),
      });
    }

    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, limit);

    // Update telemetry in SQLite
    const updateStmt = this.db.prepare(`
      UPDATE memories
      SET access_count = access_count + 1, last_recalled_at = ?
      WHERE id = ?
    `);

    for (const res of topResults) {
      res.item.accessCount += 1;
      res.item.lastRecalledAt = now;
      updateStmt.run(now, res.item.id);
    }

    return topResults;
  }

  public list(category?: MemoryCategory, projectScope?: string): MemoryItem[] {
    let sql = 'SELECT * FROM memories WHERE 1=1';
    const params: (string | number)[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (projectScope) {
      sql += ' AND (project_scope = "global" OR project_scope = ?)';
      params.push(projectScope.toLowerCase().trim());
    }

    sql += ' ORDER BY created_at DESC';
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as unknown as RawDbRow[];
    return rows.map((r) => this.mapRowToItem(r));
  }

  public delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
    stmt.run(id);
    // In node:sqlite, check if row was deleted
    const check = this.db.prepare('SELECT id FROM memories WHERE id = ?').get(id);
    return check === undefined;
  }

  public getStats(): MemoryStats {
    const countRow = this.db.prepare('SELECT COUNT(*) as total FROM memories').get() as { total: number };
    const total = countRow?.total || 0;

    const catRows = this.db
      .prepare('SELECT category, COUNT(*) as count FROM memories GROUP BY category')
      .all() as Array<{ category: string; count: number }>;

    const byCategory: Record<MemoryCategory, number> = {
      gotchas: 0,
      architecture: 0,
      user_preferences: 0,
      performance: 0,
    };
    for (const r of catRows) {
      if (r.category in byCategory) {
        byCategory[r.category as MemoryCategory] = r.count;
      }
    }

    const scopeRows = this.db
      .prepare('SELECT project_scope, COUNT(*) as count FROM memories GROUP BY project_scope')
      .all() as Array<{ project_scope: string; count: number }>;

    const byScope: Record<string, number> = {};
    for (const r of scopeRows) {
      byScope[r.project_scope] = r.count;
    }

    // Top tags aggregation
    const allTagsRows = this.db.prepare('SELECT tags FROM memories').all() as Array<{ tags: string }>;
    const tagCountMap = new Map<string, number>();
    for (const r of allTagsRows) {
      try {
        const tags: string[] = JSON.parse(r.tags);
        for (const t of tags) {
          tagCountMap.set(t, (tagCountMap.get(t) || 0) + 1);
        }
      } catch {}
    }

    const topTags = Array.from(tagCountMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const mostAccessedRows = this.db
      .prepare('SELECT id, title, access_count FROM memories ORDER BY access_count DESC LIMIT 5')
      .all() as Array<{ id: string; title: string; access_count: number }>;

    const mostAccessed = mostAccessedRows.map((r) => ({
      id: r.id,
      title: r.title,
      accessCount: r.access_count,
    }));

    return {
      engine: 'sqlite',
      total,
      byCategory,
      byScope,
      topTags,
      mostAccessed,
    };
  }

  public exportJson(): string {
    const items = this.list();
    return JSON.stringify(items, null, 2);
  }

  public exportMarkdown(): string {
    const items = this.list();
    if (items.length === 0) {
      return '# Agent Episodic Memory Store (SQLite)\n\nNo memories recorded yet.';
    }

    const sections: string[] = ['# Agent Episodic Memory Store (SQLite)\n'];
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

  public importJson(
    jsonString: string,
    mergeMode: 'skip' | 'overwrite' = 'skip'
  ): { imported: number; updated: number; skipped: number } {
    const parsed: MemoryItem[] = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      throw new Error('Import data must be a JSON array of MemoryItem objects.');
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    const checkStmt = this.db.prepare('SELECT id FROM memories WHERE id = ?');
    const insertStmt = this.db.prepare(`
      INSERT INTO memories (id, category, title, content, tags, project_scope, created_at, updated_at, access_count, last_recalled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateStmt = this.db.prepare(`
      UPDATE memories
      SET category = ?, title = ?, content = ?, tags = ?, project_scope = ?, updated_at = ?, access_count = ?, last_recalled_at = ?
      WHERE id = ?
    `);

    for (const item of parsed) {
      if (!item.id || !item.title || !item.category || !item.content) {
        skipped++;
        continue;
      }

      const existing = checkStmt.get(item.id);
      const tagsJson = JSON.stringify(item.tags || []);
      const now = new Date().toISOString();

      if (existing) {
        if (mergeMode === 'overwrite') {
          updateStmt.run(
            item.category,
            item.title,
            item.content,
            tagsJson,
            item.projectScope || 'global',
            now,
            item.accessCount || 0,
            item.lastRecalledAt || null,
            item.id
          );
          updated++;
        } else {
          skipped++;
        }
      } else {
        insertStmt.run(
          item.id,
          item.category,
          item.title,
          item.content,
          tagsJson,
          item.projectScope || 'global',
          item.createdAt || now,
          item.updatedAt || now,
          item.accessCount || 0,
          item.lastRecalledAt || null
        );
        imported++;
      }
    }

    return { imported, updated, skipped };
  }

  public close(): void {
    try {
      this.db.close();
    } catch {}
  }
}
