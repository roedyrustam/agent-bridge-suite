import { MemoryItem, RecallResult, MemoryCategory, MemoryStats, MemoryStoreOptions } from './types.js';
import { SqliteMemoryStore } from './sqlite-store.js';
export { SqliteMemoryStore };
export declare class JsonMemoryStore {
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
    private tokenize;
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
/**
 * Unified MemoryStore that defaults to high-scale SQLite with automatic
 * graceful fallback to JsonMemoryStore if SQLite is disabled or unavailable.
 */
export declare class MemoryStore {
    private backend;
    constructor(options?: MemoryStoreOptions);
    record(params: {
        category: MemoryCategory;
        title: string;
        content: string;
        tags?: string[];
        projectScope?: string;
    }): MemoryItem;
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
