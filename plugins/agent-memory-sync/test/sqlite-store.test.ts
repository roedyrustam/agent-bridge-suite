import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SqliteMemoryStore } from '../src/sqlite-store.js';

describe('SqliteMemoryStore with Native FTS5 and BM25 Ranking', () => {
  let tempDir: string;
  let sqlitePath: string;
  let store: SqliteMemoryStore;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-memory-sqlite-test-'));
    sqlitePath = path.join(tempDir, 'memories.sqlite');
    store = new SqliteMemoryStore({
      baseDir: tempDir,
      sqlitePath,
      autoMigrate: false,
    });
  });

  afterEach(() => {
    try {
      store.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('records memories into SQLite with automatic schema and triggers', () => {
    const item = store.record({
      category: 'architecture',
      title: 'CQRS Event Sourcing Pattern',
      content: 'Separate read and write paths for high write scalability.',
      tags: ['cqrs', 'architecture', 'scalability'],
      projectScope: 'payment-service',
    });

    expect(item.id).toMatch(/^mem_\d+_[a-z0-9]+$/);
    expect(item.category).toBe('architecture');
    expect(item.title).toBe('CQRS Event Sourcing Pattern');
    expect(item.tags).toEqual(['cqrs', 'architecture', 'scalability']);
    expect(item.projectScope).toBe('payment-service');

    const list = store.list();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(item.id);
  });

  it('performs native FTS5 search with BM25 ranking', () => {
    store.record({
      category: 'gotchas',
      title: 'Node 22 TLS Socket Timeout',
      content: 'TLS connections drop under heavy traffic when keepAlive is false.',
      tags: ['node', 'tls', 'network'],
      projectScope: 'global',
    });

    store.record({
      category: 'architecture',
      title: 'Zustand State Store Conventions',
      content: 'Keep slices atomic and avoid nested selectors.',
      tags: ['react', 'state', 'zustand'],
      projectScope: 'global',
    });

    store.record({
      category: 'performance',
      title: 'Postgres Connection Pooling',
      content: 'Always configure connection pooling in serverless environments.',
      tags: ['database', 'postgres', 'pooling'],
      projectScope: 'global',
    });

    const results = store.recall('TLS socket node timeout');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.title).toBe('Node 22 TLS Socket Timeout');
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].matchedTerms).toContain('tls');
  });

  it('filters by projectScope and includes global scope in SQLite', () => {
    store.record({
      category: 'architecture',
      title: 'Global Convention',
      content: 'Always use strict TypeScript types.',
      tags: ['typescript'],
      projectScope: 'global',
    });

    store.record({
      category: 'architecture',
      title: 'Project Alpha Private Rule',
      content: 'Specific to Project Alpha only.',
      tags: ['alpha'],
      projectScope: 'project-alpha',
    });

    store.record({
      category: 'architecture',
      title: 'Project Beta Private Rule',
      content: 'Specific to Project Beta only.',
      tags: ['beta'],
      projectScope: 'project-beta',
    });

    const alphaResults = store.recall('rule', 10, 'project-alpha');
    const titles = alphaResults.map((r) => r.item.title);
    expect(titles).toContain('Project Alpha Private Rule');
    expect(titles).not.toContain('Project Beta Private Rule');
  });

  it('tracks accessCount and updates lastRecalledAt', () => {
    const item = store.record({
      category: 'gotchas',
      title: 'NextJS Static Generation Bailout',
      content: 'cookies() function causes entire route to be dynamic.',
      tags: ['nextjs', 'ssr'],
    });

    expect(item.accessCount).toBe(0);

    store.recall('NextJS static cookies');

    const updated = store.list().find((i) => i.id === item.id);
    expect(updated?.accessCount).toBe(1);
    expect(updated?.lastRecalledAt).toBeDefined();
  });

  it('aggregates memory statistics using SQLite queries', () => {
    store.record({
      category: 'gotchas',
      title: 'Bug 1',
      content: 'Content 1',
      tags: ['ts', 'docker'],
      projectScope: 'scope-a',
    });

    store.record({
      category: 'architecture',
      title: 'Arch 1',
      content: 'Content 2',
      tags: ['ts', 'react'],
      projectScope: 'scope-a',
    });

    const stats = store.getStats();
    expect(stats.engine).toBe('sqlite');
    expect(stats.total).toBe(2);
    expect(stats.byCategory.gotchas).toBe(1);
    expect(stats.byCategory.architecture).toBe(1);
    expect(stats.byScope['scope-a']).toBe(2);
    expect(stats.topTags.some((t) => t.tag === 'ts')).toBe(true);
  });

  it('exports and imports memories in SQLite store', () => {
    store.record({
      category: 'performance',
      title: 'V8 Inline Cache Optimization',
      content: 'Maintain stable object shapes in hot loops.',
      tags: ['v8', 'perf'],
    });

    const exportedJson = store.exportJson();
    expect(exportedJson).toContain('V8 Inline Cache Optimization');

    const newTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-memory-sqlite-import-'));
    const newStore = new SqliteMemoryStore({
      baseDir: newTempDir,
      sqlitePath: path.join(newTempDir, 'imported.sqlite'),
      autoMigrate: false,
    });

    const res = newStore.importJson(exportedJson);
    expect(res.imported).toBe(1);
    expect(newStore.list().length).toBe(1);
    expect(newStore.list()[0].title).toBe('V8 Inline Cache Optimization');

    newStore.close();
    try {
      fs.rmSync(newTempDir, { recursive: true, force: true });
    } catch {}
  });

  it('auto-migrates existing memories.json to SQLite on initialization', () => {
    const migrateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-memory-migrate-'));
    const jsonPath = path.join(migrateDir, 'memories.json');
    const existingMemories = [
      {
        id: 'mem_legacy_1',
        category: 'gotchas',
        title: 'Legacy JSON Memory',
        content: 'Preserved during SQLite upgrade.',
        tags: ['legacy', 'migration'],
        projectScope: 'global',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        accessCount: 3,
      },
    ];
    fs.writeFileSync(jsonPath, JSON.stringify(existingMemories, null, 2), 'utf-8');

    const migratingStore = new SqliteMemoryStore({
      baseDir: migrateDir,
      filePath: jsonPath,
      sqlitePath: path.join(migrateDir, 'memories.sqlite'),
      autoMigrate: true,
    });

    const list = migratingStore.list();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('mem_legacy_1');
    expect(list[0].title).toBe('Legacy JSON Memory');
    expect(list[0].accessCount).toBe(3);

    migratingStore.close();
    try {
      fs.rmSync(migrateDir, { recursive: true, force: true });
    } catch {}
  });

  it('deletes entries by ID from SQLite and FTS virtual table', () => {
    const item = store.record({
      category: 'gotchas',
      title: 'Temporary Gotcha',
      content: 'Will be deleted soon.',
    });

    expect(store.list().length).toBe(1);
    const success = store.delete(item.id);
    expect(success).toBe(true);
    expect(store.list().length).toBe(0);
  });
});
