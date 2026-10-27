import { describe, it, expect } from 'vitest';
import { TwinEngine } from '../src/engine.js';

describe('TwinEngine Adversarial Critique and Consensus Synthesis', () => {
  const engine = new TwinEngine();

  it('detects active provider as local_heuristic when no external API keys are present', () => {
    const freshEngine = new TwinEngine({
      anthropicApiKey: undefined,
      geminiApiKey: undefined,
      openaiApiKey: undefined,
    });
    expect(freshEngine.getActiveProvider()).toBe('local_heuristic');
  });

  it('approves robust and clean code', async () => {
    const cleanCode = `
export interface User {
  id: string;
  name: string;
}

export async function fetchUserSafe(id: string): Promise<User | null> {
  try {
    const response = await fetch(\`/api/users/\${encodeURIComponent(id)}\`);
    if (!response.ok) {
      return null;
    }
    const data: unknown = await response.json();
    return data as User;
  } catch (err) {
    console.error('Failed to fetch user:', err);
    return null;
  }
}
`;
    const critique = await engine.critique(cleanCode, 'User service module');
    expect(critique.verdict).toBe('APPROVED');
    expect(critique.issues.length).toBe(0);
    expect(critique.adversarialChecklist.errorHandling).toBe(true);
    expect(critique.adversarialChecklist.secretProtection).toBe(true);
    expect(critique.providerUsed).toBe('local_heuristic');
  });

  it('rejects P0 hardcoded API secrets and tokens', async () => {
    const leakedCode = `
export const client = new Client({
  apiKey: "sk-proj1234567890abcdef1234567890",
});
`;
    const critique = await engine.critique(leakedCode);
    expect(critique.verdict).toBe('REJECTED');
    expect(critique.issues.some((i) => i.severity === 'P0')).toBe(true);
    expect(critique.adversarialChecklist.secretProtection).toBe(false);
  });

  it('rejects P0 silent empty catch blocks', async () => {
    const silentCatchCode = `
async function saveData(payload) {
  try {
    await db.save(payload);
  } catch (e) {}
}
`;
    const critique = await engine.critique(silentCatchCode);
    expect(critique.verdict).toBe('REJECTED');
    expect(critique.issues.some((i) => i.description.includes('Silent catch block'))).toBe(true);
    expect(critique.adversarialChecklist.errorHandling).toBe(false);
  });

  it('rejects P0 raw SQL string interpolation', async () => {
    const sqlInjectionCode = `
async function getUser(id: string) {
  return await db.query(\`SELECT * FROM users WHERE id = '\${id}'\`);
}
`;
    const critique = await engine.critique(sqlInjectionCode);
    expect(critique.verdict).toBe('REJECTED');
    expect(critique.issues.some((i) => i.description.includes('SQL interpolation'))).toBe(true);
  });

  it('flags P1 for loose any types without bypass comments', async () => {
    const looseTypeCode = `
export function parseConfig(raw: any) {
  return raw.value;
}
`;
    const critique = await engine.critique(looseTypeCode);
    expect(critique.verdict).toBe('NEEDS_REVISION');
    expect(critique.issues.some((i) => i.severity === 'P1')).toBe(true);
    expect(critique.adversarialChecklist.typeSafety).toBe(false);
  });

  it('flags P1 for non-atomic async state mutations', async () => {
    const raceCode = `
let activeCount = 0;
async function processTask() {
  activeCount++;
  await doWork();
  activeCount--;
}
`;
    const critique = await engine.critique(raceCode);
    expect(critique.verdict).toBe('NEEDS_REVISION');
    expect(critique.adversarialChecklist.raceConditions).toBe(false);
  });

  it('flags P2 for sequential await in loops', async () => {
    const loopCode = `
async function batchSend(items: string[]) {
  for (const item of items) {
    await send(item);
  }
}
`;
    const critique = await engine.critique(loopCode);
    expect(critique.issues.some((i) => i.severity === 'P2')).toBe(true);
    expect(critique.adversarialChecklist.memoryEfficiency).toBe(false);
  });

  it('generates speculative implementation candidates across archetypes', async () => {
    const candidates = await engine.speculate('Bounded worker queue with retry backoff');
    expect(candidates.length).toBeGreaterThanOrEqual(3);
    const paradigms = candidates.map((c) => c.paradigm);
    expect(paradigms.some((p) => p.includes('Immutable'))).toBe(true);
    expect(paradigms.some((p) => p.includes('Concurrent'))).toBe(true);
    expect(paradigms.some((p) => p.includes('Zero-Allocation'))).toBe(true);
  });

  it('synthesizes unified consensus from two competing drafts', () => {
    const draftA = 'export const safeExecute = () => ({ ok: true });';
    const draftB = 'export const highThroughput = async function* () { yield 1; };';
    const synthesized = engine.synthesize(draftA, draftB, 'Production payments API');
    expect(synthesized).toContain('SPECULATIVE-TWIN HARDENED SYNTHESIS');
    expect(synthesized).toContain(draftA);
    expect(synthesized).toContain(draftB);
  });
});
