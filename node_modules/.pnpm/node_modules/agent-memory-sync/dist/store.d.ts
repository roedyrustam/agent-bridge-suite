import { MemoryItem, RecallResult, MemoryCategory, MemoryStats, MemoryStoreOptions } from './types.js';
export declare class MemoryStore {
    private baseDir;
    private filePath;
    private memories;
    constructor(options?: MemoryStoreOptions);
    private ensureInitialized;
    private flush;
    record(params: {
        category: MemoryCategory;
        title: string;
        content: string;
        tags?: string[];
        projectScope?: string;
    }): MemoryItem;
    /**
     * Tokenizes text into normalized keywords.
     */
    private tokenize;
    /**
     * High-accuracy BM25 ranking algorithm with field-specific weighting.
     */
    recall(query: string, limit?: number, projectScope?: string): RecallResult[];
    list(category?: MemoryCategory, projectScope?: string): MemoryItem[];
    delete(id: string): boolean;
    getStats(): MemoryStats;
    exportJson(): string;
    exportMarkdown(): string;
    importJson(jsonString: string, mergeMode?: 'skip' | 'overwrite'): {
        imported: number;
        updated: number;
        skipped: number;
    };
}
