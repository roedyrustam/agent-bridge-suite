import { CritiqueResponse, SpeculateCandidate, TwinEngineOptions } from './types.js';
export declare class TwinEngine {
    private anthropicApiKey?;
    private geminiApiKey?;
    private openaiApiKey?;
    private openaiBaseUrl;
    private preferredModel?;
    constructor(options?: TwinEngineOptions);
    getActiveProvider(): 'anthropic' | 'gemini' | 'openai' | 'local_heuristic';
    /**
     * Run adversarial critique on code or an architectural plan.
     */
    critique(code: string, context?: string): Promise<CritiqueResponse>;
    /**
     * Generates speculative alternative implementations under different paradigms.
     */
    speculate(requirement: string, currentDraft?: string): Promise<SpeculateCandidate[]>;
    /**
     * Synthesize consensus between two competing drafts.
     */
    synthesize(draftA: string, draftB: string, context?: string): string;
    heuristicCritique(code: string, context?: string): CritiqueResponse;
    private callAnthropicCritique;
    private callGeminiCritique;
    private callOpenAICritique;
    private callRemoteSpeculate;
}
