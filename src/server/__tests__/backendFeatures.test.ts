import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalSemanticCacheEngine,
  normalizePrompt,
  computePromptHash,
  computeJaccardSimilarity
} from '../semanticCache';
import {
  SlidingWindowQuotaEngine,
  hashUserIdentifier,
  estimatePromptTokens
} from '../quotaRateLimiter';
import {
  getLiveSearchGroundingConfig,
  extractGroundingMetadata
} from '../geminiGrounding';
import { sanitizeLogData } from '../logger';

describe('Local Semantic Cache Engine', () => {
  let cache: LocalSemanticCacheEngine;

  beforeEach(() => {
    cache = new LocalSemanticCacheEngine();
    cache.clear();
  });

  it('normalizes prompt text consistently', () => {
    const raw = '   What   is   Quantum Computing?   \n\n ';
    const normalized = normalizePrompt(raw);
    expect(normalized).toBe('what is quantum computing?');
  });

  it('computes deterministic SHA-256 hash', () => {
    const hash1 = computePromptHash('openai', 'gpt-4o', 'hello world');
    const hash2 = computePromptHash('openai', 'gpt-4o', 'hello world');
    const hash3 = computePromptHash('gemini', 'gemini-3.7-flash', 'hello world');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(64);
  });

  it('computes accurate Jaccard token similarity for fuzzy matches', () => {
    const textA = 'Explain machine learning algorithms in simple terms';
    const textB = 'Explain machine learning algorithm in simple terms';
    const textC = 'How to cook Italian pizza at home';

    const similarityAB = computeJaccardSimilarity(textA, textB);
    const similarityAC = computeJaccardSimilarity(textA, textC);

    expect(similarityAB).toBeGreaterThanOrEqual(0.85);
    expect(similarityAC).toBeLessThan(0.3);
  });

  it('stores and retrieves cache entries with exact hash match', async () => {
    const provider = 'anthropic';
    const model = 'claude-3-5-sonnet';
    const prompt = 'What is the speed of light?';
    const answer = 'The speed of light in vacuum is approximately 299,792,458 m/s.';

    await cache.set(provider, model, prompt, answer, { promptTokens: 10, completionTokens: 25, totalTokens: 35 });

    const check = await cache.get(provider, model, prompt);
    expect(check.hit).toBe(true);
    expect(check.matchType).toBe('EXACT_HASH');
    expect(check.entry?.responseText).toBe(answer);
    expect(check.entry?.tokensUsed.totalTokens).toBe(35);
  });

  it('triggers semantic similarity cache hit within threshold', async () => {
    const provider = 'openai';
    const model = 'gpt-4o';
    const promptOriginal = 'Give me a brief history of artificial intelligence in 3 points';
    const promptSimilar = 'Give me a brief history of artificial intelligence in 3 points.';
    const answer = '1. 1950s Dartmouth Workshop\n2. AI Winters\n3. Deep Learning Revolution';

    await cache.set(provider, model, promptOriginal, answer, { promptTokens: 15, completionTokens: 40, totalTokens: 55 });

    // Query with minor punctuation/formatting difference
    const result = await cache.get(provider, model, promptSimilar, 0.90);
    expect(result.hit).toBe(true);
    expect(result.entry?.responseText).toBe(answer);
    expect(result.similarityScore).toBeGreaterThanOrEqual(0.90);
  });

  it('returns cache miss when no match or low similarity', async () => {
    const result = await cache.get('gemini', 'gemini-3.7-flash', 'Totally unindexed question');
    expect(result.hit).toBe(false);
    expect(result.entry).toBeUndefined();
  });
});

describe('Sliding-Window Continuous Refill Quota Engine', () => {
  let quotaLimiter: SlidingWindowQuotaEngine;

  beforeEach(() => {
    quotaLimiter = new SlidingWindowQuotaEngine({
      maxTokensQuota: 10000,
      refillRatePerMinute: 600,
      maxRequestsPerMinute: 20
    });
    quotaLimiter.clear();
  });

  it('hashes user identifiers safely with SHA-256 for privacy', () => {
    const ip = '192.168.1.105';
    const hash = hashUserIdentifier(ip);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(32);
    expect(hash).not.toContain(ip);
  });

  it('estimates prompt tokens properly', () => {
    const shortPrompt = 'Hello world';
    const longPrompt = 'A'.repeat(400);

    expect(estimatePromptTokens(shortPrompt)).toBeGreaterThanOrEqual(10);
    expect(estimatePromptTokens(longPrompt)).toBeGreaterThanOrEqual(100);
  });

  it('allows requests within available quota and reserves balance', () => {
    const userIp = '10.0.0.1';
    const check1 = quotaLimiter.checkAndReserveQuota(userIp, 1000);

    expect(check1.allowed).toBe(true);
    expect(check1.currentAvailableTokens).toBe(9000);
    expect(check1.maxQuota).toBe(10000);
  });

  it('rejects requests when token balance is depleted and returns exact replenishment ISO timestamp', () => {
    const smallLimiter = new SlidingWindowQuotaEngine({
      maxTokensQuota: 500,
      refillRatePerMinute: 60, // 1 token per second
      maxRequestsPerMinute: 10
    });
    smallLimiter.clear();

    const userIp = '10.0.0.2';
    // Consume almost all tokens
    smallLimiter.checkAndReserveQuota(userIp, 450);

    // Request exceeding remaining 50 tokens
    const check2 = smallLimiter.checkAndReserveQuota(userIp, 200);

    expect(check2.allowed).toBe(false);
    expect(check2.retryAfterSeconds).toBeDefined();
    expect(check2.retryAfterSeconds).toBeGreaterThan(0);
    expect(check2.nextReplenishIso).toBeDefined();
    expect(new Date(check2.nextReplenishIso!).getTime()).toBeGreaterThan(Date.now());
  });

  it('settles actual token usage accurately after API response', () => {
    const customLimiter = new SlidingWindowQuotaEngine({
      maxTokensQuota: 5000,
      refillRatePerMinute: 100
    });
    customLimiter.clear();

    const userIp = '10.0.0.3';
    // Estimated 500 tokens
    customLimiter.checkAndReserveQuota(userIp, 500);

    // Actual spent only 200 tokens
    customLimiter.settleActualTokenUsage(userIp, 500, 200);

    const headers = customLimiter.getQuotaHeaders(userIp);
    // Should have refunded the 300 unused reserved tokens
    expect(parseInt(headers['X-RateLimit-Remaining-Tokens'], 10)).toBe(4800);
  });
});

describe('Live Search Grounding & Metadata Extraction', () => {
  it('generates standard googleSearch tool config', () => {
    const config = getLiveSearchGroundingConfig({ temperature: 0.5 });
    expect(config.tools).toBeDefined();
    expect(config.tools).toEqual([{ googleSearch: {} }]);
    expect(config.temperature).toBe(0.5);
  });

  it('extracts web queries and sources from Gemini response', () => {
    const mockResponse = {
      candidates: [
        {
          groundingMetadata: {
            webSearchQueries: ['AI models directory 2026', 'Google Gemini 3.7 flash'],
            groundingChunks: [
              {
                web: {
                  title: 'DeepMind AI Directory',
                  uri: 'https://deepmind.google/models'
                }
              }
            ]
          }
        }
      ]
    };

    const extracted = extractGroundingMetadata(mockResponse);
    expect(extracted.isGrounded).toBe(true);
    expect(extracted.webSearchQueries?.length).toBe(2);
    expect(extracted.sources?.length).toBe(1);
    expect(extracted.sources?.[0].title).toBe('DeepMind AI Directory');
  });

  it('handles ungrounded responses gracefully', () => {
    const mockEmpty = { candidates: [{}] };
    const extracted = extractGroundingMetadata(mockEmpty);
    expect(extracted.isGrounded).toBe(false);
    expect(extracted.sources).toBeUndefined();
  });
});

describe('Structured Logger & Security Sanitization', () => {
  it('redacts sensitive API keys and authorization tokens', () => {
    const sensitive = 'API key AIzaSyD1234567890abcdefghijklmnopqrstuv and sk-1234567890abcdef1234567890abcdef';
    const sanitized = sanitizeLogData(sensitive);
    expect(sanitized).not.toContain('AIzaSyD1234567890abcdefghijklmnopqrstuv');
    expect(sanitized).not.toContain('sk-1234567890abcdef1234567890abcdef');
  });

  it('redacts sensitive object keys', () => {
    const obj = {
      apiKey: 'secret_key_12345',
      userToken: 'token_abc',
      safeData: 'public info'
    };
    const sanitized = sanitizeLogData(obj) as Record<string, unknown>;
    expect(sanitized.apiKey).toBe('[REDACTED]');
    expect(sanitized.userToken).toBe('[REDACTED]');
    expect(sanitized.safeData).toBe('public info');
  });
});

