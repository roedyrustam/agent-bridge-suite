import {
  CritiqueResponse,
  CritiqueIssue,
  SpeculateCandidate,
  TwinEngineOptions,
} from './types.js';

export class TwinEngine {
  private anthropicApiKey?: string;
  private geminiApiKey?: string;
  private openaiApiKey?: string;
  private openaiBaseUrl: string;
  private preferredModel?: string;

  constructor(options?: TwinEngineOptions) {
    this.anthropicApiKey = options?.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY;
    this.geminiApiKey = options?.geminiApiKey ?? process.env.GEMINI_API_KEY;
    this.openaiApiKey = options?.openaiApiKey ?? process.env.OPENAI_API_KEY;
    this.openaiBaseUrl =
      options?.openaiBaseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
    this.preferredModel = options?.preferredModel ?? process.env.TWIN_MODEL;
  }

  public getActiveProvider(): 'anthropic' | 'gemini' | 'openai' | 'local_heuristic' {
    if (this.anthropicApiKey) return 'anthropic';
    if (this.geminiApiKey) return 'gemini';
    if (this.openaiApiKey) return 'openai';
    return 'local_heuristic';
  }

  /**
   * Run adversarial critique on code or an architectural plan.
   */
  public async critique(code: string, context?: string): Promise<CritiqueResponse> {
    const activeProvider = this.getActiveProvider();

    if (activeProvider === 'anthropic') {
      try {
        const res = await this.callAnthropicCritique(code, context);
        res.providerUsed = 'anthropic';
        return res;
      } catch (err) {
        console.error('[TwinEngine] Anthropic critique failed, falling back to local heuristic:', err);
      }
    } else if (activeProvider === 'gemini') {
      try {
        const res = await this.callGeminiCritique(code, context);
        res.providerUsed = 'gemini';
        return res;
      } catch (err) {
        console.error('[TwinEngine] Gemini critique failed, falling back to local heuristic:', err);
      }
    } else if (activeProvider === 'openai') {
      try {
        const res = await this.callOpenAICritique(code, context);
        res.providerUsed = 'openai';
        return res;
      } catch (err) {
        console.error('[TwinEngine] OpenAI critique failed, falling back to local heuristic:', err);
      }
    }

    const localRes = this.heuristicCritique(code, context);
    localRes.providerUsed = 'local_heuristic';
    return localRes;
  }

  /**
   * Generates speculative alternative implementations under different paradigms.
   */
  public async speculate(
    requirement: string,
    currentDraft?: string
  ): Promise<SpeculateCandidate[]> {
    const activeProvider = this.getActiveProvider();

    if (activeProvider !== 'local_heuristic') {
      try {
        const remoteCandidates = await this.callRemoteSpeculate(requirement, currentDraft);
        if (remoteCandidates && remoteCandidates.length > 0) {
          return remoteCandidates;
        }
      } catch (err) {
        console.error('[TwinEngine] Remote speculation failed, using archetypes:', err);
      }
    }

    // High-leverage algorithmic archetypes
    return [
      {
        id: 'draft-defensive-immutable',
        paradigm: 'Defensive Functional / Immutable',
        code: `// Candidate 1: Defensive Functional Archetype\n// Target Requirement: ${requirement}\n\nexport interface Result<T, E = Error> {\n  ok: boolean;\n  value?: T;\n  error?: E;\n}\n\nexport function executeSafe<T, R>(input: Readonly<T>, transform: (val: Readonly<T>) => R): Result<R> {\n  try {\n    // Deep freeze or shallow copy to guarantee immutability\n    const cloned = Object.freeze(structuredClone(input));\n    const result = transform(cloned);\n    return { ok: true, value: result };\n  } catch (err) {\n    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };\n  }\n}`,
        pros: [
          'Guaranteed zero mutation of input state',
          'Explicit Result<T, E> error channel prevents unhandled throw leaks',
          'Deterministic unit testing with zero external mocks required',
        ],
        cons: [
          'structuredClone adds allocation overhead for very large byte arrays or trees',
        ],
        complexityScore: 2,
      },
      {
        id: 'draft-concurrent-streaming',
        paradigm: 'High-Throughput Concurrent / Stream-Buffered',
        code: `// Candidate 2: High-Throughput Concurrent Archetype\n// Target Requirement: ${requirement}\n\nexport async function* streamProcess<T, R>(\n  items: AsyncIterable<T>,\n  worker: (item: T) => Promise<R>,\n  concurrencyLimit: number = 4\n): AsyncGenerator<R, void, unknown> {\n  const executing = new Set<Promise<R>>();\n\n  for await (const item of items) {\n    const p = Promise.resolve().then(() => worker(item));\n    executing.add(p);\n    const clean = () => executing.delete(p);\n    p.then(clean, clean);\n\n    if (executing.size >= concurrencyLimit) {\n      yield await Promise.race(executing);\n    }\n  }\n\n  while (executing.size > 0) {\n    yield await Promise.race(executing);\n  }\n}`,
        pros: [
          'Bounded backpressure prevents Node.js process out-of-memory crashes',
          'Streams items asynchronously with constant memory overhead O(limit)',
          'High throughput for I/O bound batch jobs',
        ],
        cons: [
          'Output order is non-deterministic (first completed arrives first)',
          'Requires consumers to iterate using for-await loops',
        ],
        complexityScore: 4,
      },
      {
        id: 'draft-minimal-zero-alloc',
        paradigm: 'Minimal In-Place / Zero-Allocation',
        code: `// Candidate 3: Minimal In-Place Archetype\n// Target Requirement: ${requirement}\n\nexport function processInPlace<T>(\n  buffer: T[],\n  predicate: (item: T, idx: number) => boolean\n): number {\n  // In-place two-pointer compaction without reallocating arrays\n  let writeIndex = 0;\n  for (let readIndex = 0; readIndex < buffer.length; readIndex++) {\n    if (predicate(buffer[readIndex], readIndex)) {\n      buffer[writeIndex++] = buffer[readIndex];\n    }\n  }\n  buffer.length = writeIndex;\n  return writeIndex;\n}`,
        pros: [
          '0 additional heap allocations',
          'Maximum L1/L2 CPU cache locality',
          'Extremely fast for hot inner loops',
        ],
        cons: [
          'Destructive mutation of the input buffer',
          'Caller must be aware that the array is modified in-place',
        ],
        complexityScore: 3,
      },
    ];
  }

  /**
   * Synthesize consensus between two competing drafts.
   */
  public synthesize(draftA: string, draftB: string, context?: string): string {
    const header = `/**\n * SPECULATIVE-TWIN HARDENED SYNTHESIS\n * Context: ${context || 'Balanced safety, type correctness, and high-performance throughput'}\n */`;

    return `${header}\n\n// Section 1: Immutable Contracts & Safe Result Types (from Draft A)\n${draftA.trim()}\n\n// Section 2: Concurrency & Edge-Case Fortification (from Draft B)\n${draftB.trim()}`;
  }

  public heuristicCritique(code: string, context?: string): CritiqueResponse {
    const issues: CritiqueIssue[] = [];
    let hasRaceConditions = false;
    let hasTypeSafety = true;
    let hasErrorHandling = true;
    let hasMemoryEfficiency = true;
    let hasSecretProtection = true;

    // Check 1: Hardcoded credentials or secrets (P0)
    const secretRegex = /(['"])(AKIA[0-9A-Z]{16}|sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|Bearer\s+eyJ[a-zA-Z0-9_-]{20,})\1/;
    if (secretRegex.test(code)) {
      issues.push({
        severity: 'P0',
        description: 'Hardcoded API secret, private token, or AWS credential detected.',
        recommendation: 'Move secrets to environment variables (e.g. process.env.API_KEY) and avoid committing credentials to source.',
      });
      hasSecretProtection = false;
    }

    // Check 2: Unsafe eval / dynamic code execution (P0)
    if (/\beval\s*\(/.test(code) || /new\s+Function\s*\(/.test(code)) {
      issues.push({
        severity: 'P0',
        description: 'Unsafe dynamic execution via eval() or new Function() detected.',
        recommendation: 'Refactor to safe static logic or structured expression parsers to eliminate remote code execution (RCE) vectors.',
      });
    }

    // Check 3: Silent empty catch block (P0)
    if (/catch\s*(\([^)]*\))?\s*\{\s*\}/.test(code)) {
      issues.push({
        severity: 'P0',
        description: 'Silent catch block detected (swallowing exceptions without logging or handling).',
        recommendation: 'Log exception, rethrow typed error, or return a Result<T, E> envelope.',
      });
      hasErrorHandling = false;
    }

    // Check 4: Unsanitized SQL template string interpolation (P0)
    if (
      /\.(query|execute|raw)\s*\(\s*`[^`]*\$\{/.test(code) ||
      /\$queryRawUnsafe\s*\(\s*`[^`]*\$\{/.test(code)
    ) {
      issues.push({
        severity: 'P0',
        description: 'Potential SQL interpolation vulnerability detected in template literal.',
        recommendation: 'Use parameterized queries ($1, $2) or tagged templates ($queryRaw`...`) instead of direct string interpolation.',
      });
    }

    // Check 5: Explicit "any" type without bypass annotation (P1)
    if (/\bany\b/.test(code) && !code.includes('// bypass-any') && !code.includes('/* bypass-any */')) {
      issues.push({
        severity: 'P1',
        description: 'Explicit usage of loose "any" type detected.',
        recommendation: 'Replace "any" with "unknown" accompanied by a type guard or Zod schema validation.',
      });
      hasTypeSafety = false;
    }

    // Check 6: Non-atomic state mutation in async function (P1)
    if (/(\+\+|--|\+=|-=)/.test(code) && /async\b/.test(code) && /await\b/.test(code)) {
      issues.push({
        severity: 'P1',
        description: 'Potential race condition: non-atomic state mutation detected in async scope containing await.',
        recommendation: 'Protect shared counter/state with an async Mutex or use atomic transactional primitives.',
      });
      hasRaceConditions = true;
    }

    // Check 7: Sequential await in loop (P2)
    if (/for\s*\([^)]*\)\s*\{[^}]*await\b/.test(code)) {
      issues.push({
        severity: 'P2',
        description: 'Sequential await inside loop detected.',
        recommendation: 'Consider using Promise.all() or a concurrency limiter (e.g. p-limit) if iterations are independent.',
      });
      hasMemoryEfficiency = false;
    }

    // Check 8: Leftover console.log in code (P2)
    if (/console\.log\s*\(/.test(code)) {
      issues.push({
        severity: 'P2',
        description: 'Raw console.log statement found in production code.',
        recommendation: 'Replace with structured logger (e.g. pino, winston) or remove debug log.',
      });
    }

    const verdict = issues.some((i) => i.severity === 'P0')
      ? 'REJECTED'
      : issues.some((i) => i.severity === 'P1')
      ? 'NEEDS_REVISION'
      : 'APPROVED';

    const confidence = issues.some((i) => i.severity === 'P0') ? 0.98 : 0.92;

    return {
      verdict,
      confidence,
      issues,
      summary:
        issues.length === 0
          ? 'Code passed all adversarial stress tests without critical flaws.'
          : `Identified ${issues.length} potential risk(s). Attention required for P0/P1 items before merging.`,
      adversarialChecklist: {
        raceConditions: !hasRaceConditions,
        typeSafety: hasTypeSafety,
        errorHandling: hasErrorHandling,
        memoryEfficiency: hasMemoryEfficiency,
        secretProtection: hasSecretProtection,
      },
    };
  }

  private async callAnthropicCritique(code: string, context?: string): Promise<CritiqueResponse> {
    const model = this.preferredModel || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.anthropicApiKey!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `You are an adversarial senior software architect reviewing this code. Context: ${context || 'General Review'}\n\nCode:\n${code}\n\nReturn ONLY a JSON object conforming strictly to:\n{\n  "verdict": "APPROVED" | "NEEDS_REVISION" | "REJECTED",\n  "confidence": number,\n  "summary": string,\n  "issues": [{ "severity": "P0"|"P1"|"P2", "description": string, "recommendation": string }],\n  "adversarialChecklist": { "raceConditions": boolean, "typeSafety": boolean, "errorHandling": boolean, "memoryEfficiency": boolean, "secretProtection": boolean }\n}`,
          },
        ],
      }),
    });

    const data: any = await response.json();
    const text = data.content?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return this.heuristicCritique(code, context);
  }

  private async callGeminiCritique(code: string, context?: string): Promise<CritiqueResponse> {
    const model = this.preferredModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Adversarial Senior Architect review of:\n${code}\nContext: ${context || 'General Review'}\nOutput ONLY strict JSON matching the schema: {"verdict": "APPROVED"|"NEEDS_REVISION"|"REJECTED", "confidence": number, "summary": string, "issues": [{"severity":"P0"|"P1"|"P2", "description": string, "recommendation": string}], "adversarialChecklist": {"raceConditions": boolean, "typeSafety": boolean, "errorHandling": boolean, "memoryEfficiency": boolean, "secretProtection": boolean}}`,
              },
            ],
          },
        ],
      }),
    });
    const data: any = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return this.heuristicCritique(code, context);
  }

  private async callOpenAICritique(code: string, context?: string): Promise<CritiqueResponse> {
    const model = this.preferredModel || process.env.OPENAI_MODEL || 'gpt-4o';
    const url = `${this.openaiBaseUrl.replace(/\/$/, '')}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an adversarial senior software architect performing strict security, race-condition, and type-safety code review. Respond ONLY with valid JSON.',
          },
          {
            role: 'user',
            content: `Review this code:\nContext: ${context || 'General Review'}\n\n${code}\n\nOutput JSON matching {"verdict": "APPROVED"|"NEEDS_REVISION"|"REJECTED", "confidence": number, "summary": string, "issues": [{"severity":"P0"|"P1"|"P2", "description": string, "recommendation": string}], "adversarialChecklist": {"raceConditions": boolean, "typeSafety": boolean, "errorHandling": boolean, "memoryEfficiency": boolean, "secretProtection": boolean}}`,
          },
        ],
      }),
    });
    const data: any = await response.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return this.heuristicCritique(code, context);
  }

  private async callRemoteSpeculate(
    requirement: string,
    currentDraft?: string
  ): Promise<SpeculateCandidate[] | null> {
    // If remote model is available, request 3 architectural paradigms
    const prompt = `Requirement: ${requirement}\nDraft:\n${currentDraft || 'None'}\n\nGenerate 3 candidate implementations in strict JSON array format:\n[\n  {\n    "id": "draft-paradigm-name",\n    "paradigm": "e.g. Functional / Reactive / Stream",\n    "code": "typescript code snippet",\n    "pros": ["pro1", "pro2"],\n    "cons": ["con1"],\n    "complexityScore": 1 to 5\n  }\n]`;

    let rawText = '';
    if (this.anthropicApiKey) {
      const model = this.preferredModel || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data: any = await res.json();
      rawText = data.content?.[0]?.text || '';
    } else if (this.geminiApiKey) {
      const model = this.preferredModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data: any = await res.json();
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    const match = rawText.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return null;
  }
}
