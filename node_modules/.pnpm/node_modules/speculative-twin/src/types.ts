export type CritiqueSeverity = 'P0' | 'P1' | 'P2';

export interface CritiqueIssue {
  severity: CritiqueSeverity;
  location?: string;
  description: string;
  recommendation: string;
}

export interface CritiqueResponse {
  verdict: 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED';
  confidence: number;
  issues: CritiqueIssue[];
  summary: string;
  adversarialChecklist: {
    raceConditions: boolean;
    typeSafety: boolean;
    errorHandling: boolean;
    memoryEfficiency: boolean;
    secretProtection: boolean;
  };
  providerUsed?: 'anthropic' | 'gemini' | 'openai' | 'local_heuristic';
}

export interface SpeculateCandidate {
  id: string;
  paradigm: string;
  code: string;
  pros: string[];
  cons: string[];
  complexityScore: number;
}

export interface TwinEngineOptions {
  anthropicApiKey?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  preferredModel?: string;
}
