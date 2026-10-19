import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface UserQuotaRecord {
  userHash: string;
  availableTokens: number;
  maxTokensQuota: number;
  refillRatePerMinute: number;
  lastRefillTimestamp: number;
  totalTokensConsumed: number;
  totalRequestsCount: number;
  recentRequestTimestamps: number[];
  createdAt: number;
  updatedAt: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  userHash: string;
  currentAvailableTokens: number;
  maxQuota: number;
  refillRatePerMinute: number;
  estimatedCost: number;
  retryAfterSeconds?: number;
  nextReplenishIso?: string;
  reason?: string;
}

export interface QuotaLimiterConfig {
  maxTokensQuota?: number;          // Default: 50,000 tokens capacity
  refillRatePerMinute?: number;     // Default: 2,500 tokens refilled per minute (continuous)
  maxRequestsPerMinute?: number;    // Default: 30 requests/min sliding window
  minTokensPerRequest?: number;     // Default: 50 tokens
  storageDir?: string;
}

/**
 * Creates a cryptographically safe one-way pseudonymized SHA-256 hash
 * for privacy-preserving client tracking compliant with OWASP & GDPR standards.
 */
export function hashUserIdentifier(rawIdentifier: string, pepper = 'ai-directory-quota-salt'): string {
  if (!rawIdentifier) return 'anonymous_client';
  return crypto
    .createHash('sha256')
    .update(`${pepper}:${rawIdentifier.trim()}`, 'utf8')
    .digest('hex')
    .substring(0, 32);
}

/**
 * Estimates token count from a raw text prompt based on the standard 4-char per token rule.
 */
export function estimatePromptTokens(text: string): number {
  if (!text || typeof text !== 'string') return 10;
  const charCount = text.length;
  // Estimate ~4 characters per token + base buffer for system framing
  return Math.max(10, Math.ceil(charCount / 3.8));
}

/**
 * Advanced Sliding-Window Continuous Refill Quota & Rate-Limiting Engine.
 * Implements a Leaky Token Bucket algorithm with smooth sub-second replenishment,
 * ensuring fair resource distribution and zero cliff-edge 24-hour lockouts.
 */
export class SlidingWindowQuotaEngine {
  private usersMap = new Map<string, UserQuotaRecord>();
  private readonly defaultMaxQuota: number;
  private readonly defaultRefillPerMin: number;
  private readonly maxRequestsPerMin: number;
  private readonly dbFilePath: string;

  constructor(config: QuotaLimiterConfig = {}) {
    this.defaultMaxQuota = config.maxTokensQuota ?? 50000;
    this.defaultRefillPerMin = config.refillRatePerMinute ?? 2500;
    this.maxRequestsPerMin = config.maxRequestsPerMinute ?? 30;

    const storageDir = config.storageDir ?? path.join(process.cwd(), '.cache_db');
    if (!fs.existsSync(storageDir)) {
      try {
        fs.mkdirSync(storageDir, { recursive: true });
      } catch {
        // Fallback to memory
      }
    }
    this.dbFilePath = path.join(storageDir, 'quota_store_journal.json');
    this.loadFromDisk();
    this.startPeriodicCleanup();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.records)) {
            for (const record of parsed.records) {
              this.usersMap.set(record.userHash, record);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[QuotaEngine] Journal load note:', err);
    }
  }

  private syncToDisk(): void {
    try {
      const payload = {
        version: '1.0.0',
        updatedAt: Date.now(),
        records: Array.from(this.usersMap.values())
      };
      const tempPath = `${this.dbFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(payload), 'utf8');
      fs.renameSync(tempPath, this.dbFilePath);
    } catch (err) {
      console.warn('[QuotaEngine] Disk flush warning:', err);
    }
  }

  /**
   * Refreshes a user's token balance continuously according to elapsed wall-clock time.
   */
  private replenishUserTokens(record: UserQuotaRecord, now: number): void {
    const elapsedMs = Math.max(0, now - record.lastRefillTimestamp);
    if (elapsedMs <= 0) return;

    // Tokens replenished = (elapsed seconds) * (refill rate per second)
    const tokensToAdd = (elapsedMs / 1000) * (record.refillRatePerMinute / 60);

    record.availableTokens = Math.min(
      record.maxTokensQuota,
      record.availableTokens + tokensToAdd
    );
    record.lastRefillTimestamp = now;
  }

  /**
   * Retrieves or initializes a quota record for a pseudonymized user.
   */
  public getOrCreateUserRecord(userHash: string, now = Date.now()): UserQuotaRecord {
    let record = this.usersMap.get(userHash);
    if (!record) {
      record = {
        userHash,
        availableTokens: this.defaultMaxQuota,
        maxTokensQuota: this.defaultMaxQuota,
        refillRatePerMinute: this.defaultRefillPerMin,
        lastRefillTimestamp: now,
        totalTokensConsumed: 0,
        totalRequestsCount: 0,
        recentRequestTimestamps: [],
        createdAt: now,
        updatedAt: now
      };
      this.usersMap.set(userHash, record);
    } else {
      this.replenishUserTokens(record, now);
    }
    return record;
  }

  /**
   * Checks whether the user has sufficient available quota and request velocity to execute an AI request.
   * If permitted, reserves the estimated tokens.
   */
  public checkAndReserveQuota(
    rawIdentifier: string,
    estimatedTokens: number,
    now = Date.now()
  ): QuotaCheckResult {
    const userHash = hashUserIdentifier(rawIdentifier);
    const record = this.getOrCreateUserRecord(userHash, now);

    // 1. Sliding-Window Request Velocity Rate Check (Max requests per minute)
    const oneMinuteAgo = now - 60 * 1000;
    record.recentRequestTimestamps = record.recentRequestTimestamps.filter(t => t > oneMinuteAgo);

    if (record.recentRequestTimestamps.length >= this.maxRequestsPerMin) {
      const oldest = record.recentRequestTimestamps[0];
      const waitMs = Math.max(1000, 60000 - (now - oldest));
      const retryAfterSeconds = Math.ceil(waitMs / 1000);
      const nextReplenishIso = new Date(now + waitMs).toISOString();

      return {
        allowed: false,
        userHash,
        currentAvailableTokens: Math.floor(record.availableTokens),
        maxQuota: record.maxTokensQuota,
        refillRatePerMinute: record.refillRatePerMinute,
        estimatedCost: estimatedTokens,
        retryAfterSeconds,
        nextReplenishIso,
        reason: `تم تجاوز الحد الأقصى لتكرار الطلبات (${this.maxRequestsPerMin} طلب/دقيقة).`
      };
    }

    // 2. Token Balance Verification
    if (record.availableTokens < estimatedTokens) {
      const deficit = estimatedTokens - record.availableTokens;
      const tokensPerSecond = record.refillRatePerMinute / 60;
      const secondsNeeded = Math.ceil(deficit / tokensPerSecond);
      const waitMs = secondsNeeded * 1000;
      const nextReplenishIso = new Date(now + waitMs).toISOString();

      return {
        allowed: false,
        userHash,
        currentAvailableTokens: Math.max(0, Math.floor(record.availableTokens)),
        maxQuota: record.maxTokensQuota,
        refillRatePerMinute: record.refillRatePerMinute,
        estimatedCost: estimatedTokens,
        retryAfterSeconds: Math.max(1, secondsNeeded),
        nextReplenishIso,
        reason: `رصيد التوكنز المتاح (${Math.floor(record.availableTokens)}) غير كافٍ لتنفيذ هذا الطلب المقدر بـ (${estimatedTokens} توكن).`
      };
    }

    // 3. Grant Request & Deduct Estimated Tokens
    record.availableTokens -= estimatedTokens;
    record.recentRequestTimestamps.push(now);
    record.totalRequestsCount++;
    record.updatedAt = now;

    this.syncToDisk();

    return {
      allowed: true,
      userHash,
      currentAvailableTokens: Math.floor(record.availableTokens),
      maxQuota: record.maxTokensQuota,
      refillRatePerMinute: record.refillRatePerMinute,
      estimatedCost: estimatedTokens
    };
  }

  /**
   * Adjusts the user's token balance once the actual token usage from the AI provider is known.
   */
  public settleActualTokenUsage(
    rawIdentifier: string,
    estimatedReserved: number,
    actualTokensUsed: number,
    now = Date.now()
  ): void {
    const userHash = hashUserIdentifier(rawIdentifier);
    const record = this.usersMap.get(userHash);
    if (!record) return;

    this.replenishUserTokens(record, now);

    // Difference between what was reserved upfront vs what was actually spent
    const adjustment = estimatedReserved - actualTokensUsed;
    record.availableTokens = Math.min(
      record.maxTokensQuota,
      Math.max(0, record.availableTokens + adjustment)
    );
    record.totalTokensConsumed += actualTokensUsed;
    record.updatedAt = now;

    this.syncToDisk();
  }

  /**
   * Retrieves the current live quota state for HTTP response headers.
   */
  public getQuotaHeaders(rawIdentifier: string, now = Date.now()): Record<string, string> {
    const userHash = hashUserIdentifier(rawIdentifier);
    const record = this.getOrCreateUserRecord(userHash, now);

    const secondsUntilFull = Math.ceil(
      ((record.maxTokensQuota - record.availableTokens) / (record.refillRatePerMinute / 60))
    );

    return {
      'X-RateLimit-Limit-Tokens': String(record.maxTokensQuota),
      'X-RateLimit-Remaining-Tokens': String(Math.floor(record.availableTokens)),
      'X-RateLimit-Refill-Rate': `${record.refillRatePerMinute} tokens/min`,
      'X-RateLimit-Reset-Seconds': String(Math.max(0, secondsUntilFull)),
      'X-RateLimit-User-Hash': userHash.substring(0, 8)
    };
  }

  /**
   * Resets all user quota records (useful for test isolation or admin resets).
   */
  public clear(): void {
    this.usersMap.clear();
    this.syncToDisk();
  }

  private startPeriodicCleanup(): void {
    // Purge records inactive for more than 7 days every hour
    setInterval(() => {
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      let removed = 0;

      for (const [hash, record] of this.usersMap.entries()) {
        if (record.updatedAt < sevenDaysAgo) {
          this.usersMap.delete(hash);
          removed++;
        }
      }

      if (removed > 0) {
        this.syncToDisk();
      }
    }, 60 * 60 * 1000).unref();
  }
}

// Export singleton instance
export const globalSlidingQuotaLimiter = new SlidingWindowQuotaEngine();
