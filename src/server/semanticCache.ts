import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CachedResponseEntry {
  id: string;
  provider: string;
  modelId: string;
  promptHash: string;
  normalizedPrompt: string;
  originalPrompt: string;
  responseText: string;
  tokensUsed: TokenUsage;
  hitCount: number;
  createdAt: number;
  expiresAt: number;
  similarityThresholdUsed?: number;
}

export interface CacheCheckResult {
  hit: boolean;
  entry?: CachedResponseEntry;
  matchType?: 'EXACT_HASH' | 'NORMALIZED_PROMPT_MATCH';
  similarityScore?: number;
}

export interface CacheEngineStats {
  totalEntries: number;
  totalHits: number;
  totalTokensSaved: number;
  exactHashHits: number;
  fuzzyMatchHits: number;
  databaseType: string;
}

/**
 * Normalizes prompt text for consistent deterministic hashing & comparison.
 * Collapses multiple whitespace characters, trims, strips outer quotes, and lowercases.
 */
export function normalizePrompt(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^["'`]+|["'`]+$/g, '');
}

/**
 * Computes deterministic SHA-256 hash of a normalized prompt scoped by provider & model.
 */
export function computePromptHash(provider: string, modelId: string, normalizedPrompt: string): string {
  return crypto
    .createHash('sha256')
    .update(`${provider.toLowerCase()}:${modelId.toLowerCase()}:${normalizedPrompt}`, 'utf8')
    .digest('hex');
}

/**
 * Computes character N-gram shingles of a string for normalized token overlap comparison.
 */
export function generateCharNgrams(text: string, n = 3): Set<string> {
  const ngrams = new Set<string>();
  const clean = text.replace(/\s+/g, ' ');
  if (clean.length < n) {
    if (clean.length > 0) ngrams.add(clean);
    return ngrams;
  }
  for (let i = 0; i <= clean.length - n; i++) {
    ngrams.add(clean.substring(i, i + n));
  }
  return ngrams;
}

/**
 * Computes Jaccard Similarity index between two normalized prompt texts.
 * Range: [0.0, 1.0]
 */
export function computeJaccardSimilarity(textA: string, textB: string): number {
  const normA = normalizePrompt(textA);
  const normB = normalizePrompt(textB);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const setA = generateCharNgrams(normA, 3);
  const setB = generateCharNgrams(normB, 3);

  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionSize++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

/**
 * High-Performance, Privacy-Respecting In-Memory Response & Prompt Cache Engine.
 * Supports exact SHA-256 hash matching and normalized N-Gram overlap matching.
 * Implements strict TTLs (default 2 hours) and bounded capacity (max 200 items)
 * to avoid indefinite retention of user-generated prompt strings.
 */
export class ResponseCacheEngine {
  private cacheMap = new Map<string, CachedResponseEntry>();
  private entriesByModel = new Map<string, string[]>(); // key: `${provider}:${modelId}` -> array of entry IDs
  private dbFilePath: string;
  private isInitialized = false;
  private readonly MAX_ENTRIES = 200;

  private stats: CacheEngineStats = {
    totalEntries: 0,
    totalHits: 0,
    totalTokensSaved: 0,
    exactHashHits: 0,
    fuzzyMatchHits: 0,
    databaseType: 'In-Memory/Bounded-Journal'
  };

  constructor(storageDir = path.join(process.cwd(), '.cache_db')) {
    if (!fs.existsSync(storageDir)) {
      try {
        fs.mkdirSync(storageDir, { recursive: true });
      } catch {
        // Fallback to memory if directory creation restricted
      }
    }
    this.dbFilePath = path.join(storageDir, 'response_cache_journal.json');
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf8');
        if (raw.trim()) {
          const data = JSON.parse(raw);
          if (Array.isArray(data.entries)) {
            const now = Date.now();
            for (const entry of data.entries) {
              if (entry.expiresAt > now && this.cacheMap.size < this.MAX_ENTRIES) {
                this.cacheMap.set(entry.id, entry);
                const modelKey = `${entry.provider.toLowerCase()}:${entry.modelId.toLowerCase()}`;
                const ids = this.entriesByModel.get(modelKey) || [];
                ids.push(entry.id);
                this.entriesByModel.set(modelKey, ids);
              }
            }
          }
          if (data.stats) {
            this.stats = { ...this.stats, ...data.stats };
          }
        }
      }
      this.stats.totalEntries = this.cacheMap.size;
      this.isInitialized = true;
    } catch (err) {
      console.warn('[ResponseCache] Initialization journal recovery note:', err);
      this.isInitialized = true;
    }
  }

  private syncToDisk(): void {
    try {
      const payload = {
        version: '2.0.0',
        updatedAt: Date.now(),
        stats: this.stats,
        entries: Array.from(this.cacheMap.values()).slice(-this.MAX_ENTRIES)
      };
      const tempPath = `${this.dbFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(payload), 'utf8');
      fs.renameSync(tempPath, this.dbFilePath);
    } catch (err) {
      console.warn('[ResponseCache] Disk flush warning:', err);
    }
  }

  /**
   * Retrieves a cached response by exact hash or normalized prompt match.
   */
  public async get(
    provider: string,
    modelId: string,
    rawPrompt: string,
    similarityThreshold = 0.98
  ): Promise<CacheCheckResult> {
    const normalized = normalizePrompt(rawPrompt);
    if (!normalized) return { hit: false };

    const now = Date.now();
    const promptHash = computePromptHash(provider, modelId, normalized);
    const modelKey = `${provider.toLowerCase()}:${modelId.toLowerCase()}`;

    // 1. Check for Exact Hash Match - O(1)
    for (const entry of this.cacheMap.values()) {
      if (entry.promptHash === promptHash && entry.expiresAt > now) {
        entry.hitCount++;
        this.stats.totalHits++;
        this.stats.exactHashHits++;
        this.stats.totalTokensSaved += (entry.tokensUsed?.totalTokens || 0);

        return {
          hit: true,
          entry,
          matchType: 'EXACT_HASH',
          similarityScore: 1.0
        };
      }
    }

    // 2. Perform Normalized Overlap Match across active cached entries for this model
    const candidateIds = this.entriesByModel.get(modelKey) || [];
    let bestMatch: CachedResponseEntry | null = null;
    let highestSimilarity = 0;

    for (const id of candidateIds) {
      const entry = this.cacheMap.get(id);
      if (!entry || entry.expiresAt <= now) continue;

      const score = computeJaccardSimilarity(normalized, entry.normalizedPrompt);
      if (score >= similarityThreshold && score > highestSimilarity) {
        highestSimilarity = score;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      bestMatch.hitCount++;
      this.stats.totalHits++;
      this.stats.fuzzyMatchHits++;
      this.stats.totalTokensSaved += (bestMatch.tokensUsed?.totalTokens || 0);

      return {
        hit: true,
        entry: bestMatch,
        matchType: 'NORMALIZED_PROMPT_MATCH',
        similarityScore: Math.round(highestSimilarity * 1000) / 1000
      };
    }

    return { hit: false };
  }

  /**
   * Stores a new AI prompt and response into the cache.
   * Default TTL is 2 hours (7200 seconds) to ensure ephemeral data retention.
   */
  public async set(
    provider: string,
    modelId: string,
    rawPrompt: string,
    responseText: string,
    tokensUsed: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    ttlSeconds = 7200
  ): Promise<CachedResponseEntry | null> {
    // If cache reached capacity, purge oldest entries
    if (this.cacheMap.size >= this.MAX_ENTRIES) {
      this.purgeExpired();
      if (this.cacheMap.size >= this.MAX_ENTRIES) {
        // Remove first entry (FIFO eviction)
        const firstKey = this.cacheMap.keys().next().value;
        if (firstKey) this.cacheMap.delete(firstKey);
      }
    }

    const normalized = normalizePrompt(rawPrompt);
    const promptHash = computePromptHash(provider, modelId, normalized);
    const now = Date.now();
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

    const entry: CachedResponseEntry = {
      id,
      provider: provider.toLowerCase(),
      modelId,
      promptHash,
      normalizedPrompt: normalized,
      originalPrompt: rawPrompt.trim(),
      responseText,
      tokensUsed,
      hitCount: 0,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000
    };

    this.cacheMap.set(id, entry);

    const modelKey = `${provider.toLowerCase()}:${modelId.toLowerCase()}`;
    const ids = this.entriesByModel.get(modelKey) || [];
    ids.push(id);
    this.entriesByModel.set(modelKey, ids);

    this.stats.totalEntries = this.cacheMap.size;
    this.syncToDisk();

    return entry;
  }

  /**
   * Cleans up expired cache records to keep storage bounded.
   */
  public purgeExpired(): number {
    const now = Date.now();
    let purgedCount = 0;

    for (const [id, entry] of this.cacheMap.entries()) {
      if (entry.expiresAt <= now) {
        this.cacheMap.delete(id);
        purgedCount++;
      }
    }

    if (purgedCount > 0) {
      this.entriesByModel.clear();
      for (const entry of this.cacheMap.values()) {
        const modelKey = `${entry.provider}:${entry.modelId}`;
        const ids = this.entriesByModel.get(modelKey) || [];
        ids.push(entry.id);
        this.entriesByModel.set(modelKey, ids);
      }
      this.stats.totalEntries = this.cacheMap.size;
      this.syncToDisk();
    }

    return purgedCount;
  }

  /**
   * Retrieves live metrics & statistics for monitoring dashboards.
   */
  public getStats(): CacheEngineStats {
    return {
      ...this.stats,
      totalEntries: this.cacheMap.size
    };
  }

  /**
   * Clears the entire cache store.
   */
  public clear(): void {
    this.cacheMap.clear();
    this.entriesByModel.clear();
    this.stats.totalEntries = 0;
    this.syncToDisk();
  }
}

// Export singleton instance and alias for seamless backward compatibility
export const globalResponseCache = new ResponseCacheEngine();
export const globalSemanticCache = globalResponseCache; // Compatibility alias
export { ResponseCacheEngine as LocalSemanticCacheEngine }; // Compatibility alias
