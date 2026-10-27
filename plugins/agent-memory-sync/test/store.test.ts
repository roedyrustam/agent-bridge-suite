import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { MemoryStore } from '../src/store.js';

describe('MemoryStore with BM25 Ranking and Serialization', () => {
  let tempDir: string;
  let store: MemoryStore;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-memory-test-'));
    store = new MemoryStore({
      baseDir: tempDir,
      filePath: path.join(tempDir, 'memories.json'),
      driver: 'json',
    });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('records memories and initializes fields properly', () => {
    const item = store.record({
      category: 'gotchas',
      title: 'Prisma Connection Pool Exhaustion',
      content: 'Serverless functions open too many connections without PgBouncer.',
      tags: ['Prisma', 'Postgres', 'Serverless'],
      projectScope: 'my-app',
    });

    expect(item.id).toMatch(/^mem_\d+_[a-z0-9]+$/);
    expect(item.category).toBe('gotchas');
    expect(item.title).toBe('Prisma Connection Pool Exhaustion');
    expect(item.tags).toEqual(['prisma', 'postgres', 'serverless']);
    expect(item.projectScope).toBe('my-app');
    expect(item.accessCount).toBe(0);
  });

  it('accurately ranks results using BM25 scoring', () => {
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

  it('filters by projectScope and includes global scope', () => {
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

    // Query under project-alpha scope should match global and project-alpha, but NOT project-beta
    const alphaResults = store.recall('rule', 10, 'project-alpha');
    const titles = alphaResults.map((r) => r.item.title);
    expect(titles).toContain('Project Alpha Private Rule');
    expect(titles).not.toContain('Project Beta Private Rule');
  });

  it('increments accessCount and lastRecalledAt upon recall', () => {
    const item = store.record({
      category: 'gotchas',
      title: 'React Hydration Mismatch',
      content: 'Date.now() inside JSX causes mismatch.',
      tags: ['react', 'ssr'],
    });

    expect(item.accessCount).toBe(0);
    expect(item.lastRecalledAt).toBeUndefined();

    store.recall('React hydration mismatch');

    const updatedList = store.list();
    const updated = updatedList.find((i) => i.id === item.id);
    expect(updated?.accessCount).toBe(1);
    expect(updated?.lastRecalledAt).toBeDefined();
  });

  it('computes accurate memory statistics', () => {
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
    expect(stats.total).toBe(2);
    expect(stats.byCategory.gotchas).toBe(1);
    expect(stats.byCategory.architecture).toBe(1);
    expect(stats.byScope['scope-a']).toBe(2);
    expect(stats.topTags[0].tag).toBe('ts');
    expect(stats.topTags[0].count).toBe(2);
  });

  it('exports and imports memories in JSON format', () => {
    store.record({
      category: 'gotchas',
      title: 'Exportable Bug',
      content: 'Critical detail',
      tags: ['export'],
    });

    const exported = store.exportJson();
    expect(exported).toContain('Exportable Bug');

    // Create a new fresh store and import
    const newTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-memory-import-'));
    const newStore = new MemoryStore({
      baseDir: newTempDir,
      filePath: path.join(newTempDir, 'memories.json'),
      driver: 'json',
    });

    const importResult = newStore.importJson(exported);
    expect(importResult.imported).toBe(1);
    expect(newStore.list().length).toBe(1);
    expect(newStore.list()[0].title).toBe('Exportable Bug');

    try {
      fs.rmSync(newTempDir, { recursive: true, force: true });
    } catch {}
  });

  it('deletes memories by ID correctly', () => {
    const item = store.record({
      category: 'gotchas',
      title: 'Obsolete Gotcha',
      content: 'No longer applies.',
    });

    expect(store.list().length).toBe(1);
    const deleted = store.delete(item.id);
    expect(deleted).toBe(true);
    expect(store.list().length).toBe(0);
  });
});
