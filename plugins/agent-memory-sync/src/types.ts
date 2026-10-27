export type MemoryCategory = 'gotchas' | 'architecture' | 'user_preferences' | 'performance';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  tags: string[];
  projectScope: string;
  createdAt: string;
  updatedAt: string;
  accessCount: number;
  lastRecalledAt?: string;
}

export interface RecallResult {
  item: MemoryItem;
  score: number;
  matchedTerms: string[];
}

export interface MemoryStats {
  total: number;
  byCategory: Record<MemoryCategory, number>;
  byScope: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
  mostAccessed: Array<{ id: string; title: string; accessCount: number }>;
}

export interface MemoryStoreOptions {
  baseDir?: string;
  filePath?: string;
}
