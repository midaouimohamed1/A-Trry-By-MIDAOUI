import { describe, it, expect } from 'vitest';
import { normalizeAIError } from './errorNormalizer';
import { getUserNoteForModel, saveUserNoteForModel, deleteUserNoteForModel, getAllUserNotes } from './userNotes';
import { applyModelOverlay, getStoredOverlays, saveModelOverlay } from './modelOverlay';
import { sanitizeInput, safeParseComparisonQuery, buildComparisonUrl } from './sanitizer';
import { AIModel } from '../types';

describe('Arabic AI Error Normalizer', () => {
  it('should normalize quota exceeded errors into friendly Arabic', () => {
    const norm = normalizeAIError('Rate limit exceeded: 429 quota exceeded for model', 'openai', 'GPT-4o');
    expect(norm.statusCategory).toBe('quota');
    expect(norm.titleAr).toContain('استهلاك رصيد');
    expect(norm.recoveryActionAr).toContain('رصيد');
  });

  it('should normalize invalid API key errors into Arabic instructions', () => {
    const norm = normalizeAIError('Invalid API Key provided 401 Unauthorized', 'anthropic', 'Claude 3.5');
    expect(norm.statusCategory).toBe('auth');
    expect(norm.titleAr).toContain('غير صالح');
    expect(norm.providerDocUrl).toBe('https://console.anthropic.com/settings/keys');
  });

  it('should normalize cold start warmup errors for Hugging Face', () => {
    const norm = normalizeAIError('Model is currently loading 503 service unavailable', 'huggingface', 'Llama 3.3');
    expect(norm.statusCategory).toBe('maintenance');
    expect(norm.titleAr).toContain('التحميل');
  });
});

describe('User Personal Notes & Rating Persistence', () => {
  it('should save, retrieve, and delete user model notes in localStorage', () => {
    const rank = 999;
    const noteText = 'نموذج رائع وسريع جداً في حل مسائل الرياضيات';
    const rating = 5;

    saveUserNoteForModel(rank, noteText, rating);

    const retrieved = getUserNoteForModel(rank);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.personalRating).toBe(5);
    expect(retrieved?.noteText).toBe(noteText);

    deleteUserNoteForModel(rank);
    const afterDelete = getUserNoteForModel(rank);
    expect(afterDelete).toBeNull();
  });
});

describe('Model Overlay & Badge System', () => {
  it('should apply fallback overlay badges correctly', () => {
    const mockModel: AIModel = {
      rank: 1,
      name: 'Claude 3.5 Sonnet',
      developer: 'Anthropic',
      category: 'Text & Code',
      categoryAr: 'نصوص وبرمجة',
      descriptionEn: 'Flagship model',
      descriptionAr: 'النموذج الأقوى',
      keyFeaturesEn: ['Fast', 'Accurate'],
      keyFeaturesAr: ['سريع', 'دقيق'],
      pricing: 'Paid',
      pricingAr: 'مدفوع',
      releaseYear: '2024',
      popularityScore: 99,
      isTrending: true,
      license: 'Proprietary',
      url: 'https://anthropic.com'
    };

    const enriched = applyModelOverlay(mockModel);
    expect(enriched.name).toBe('Claude 3.5 Sonnet');
    expect(enriched.overlay).toBeDefined();
  });
});

describe('Input Sanitizer & URL Param Parser', () => {
  it('should safely parse comparison query strings', () => {
    const query = '?compare=1,2,3,9999,abc';
    const ranks = safeParseComparisonQuery(query, 1000, 6);
    expect(ranks).toEqual([1, 2, 3]);
  });

  it('should sanitize unsafe script inputs', () => {
    const dirty = '<script>alert("xss")</script>Hello World';
    const clean = sanitizeInput(dirty);
    expect(clean).not.toContain('<script>');
  });

  it('should build valid comparison share URLs', () => {
    const url = buildComparisonUrl([1, 2, 3]);
    expect(url).toContain('compare=1%2C2%2C3');
  });
});
