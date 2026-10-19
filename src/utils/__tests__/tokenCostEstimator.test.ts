import { describe, it, expect } from 'vitest';
import {
  estimateTokensCount,
  getPricingForModel,
  formatUSD,
  calculateSlotCost,
  calculateAggregateRunCost
} from '../tokenCostEstimator';

describe('Token & Cost Estimator', () => {
  it('estimates English tokens with word and character heuristics', () => {
    const text = 'Write a comprehensive algorithm in Python to sort arrays.';
    const result = estimateTokensCount(text);
    expect(result.totalTokens).toBeGreaterThan(0);
    expect(result.isArabicPredominant).toBe(false);
    expect(result.wordCount).toBe(9);
  });

  it('estimates Arabic tokens with BPE subword expansion ratio', () => {
    const text = 'اكتب خوارزمية ذكية بلغة بايثون لحساب المصفوفات بدقة عالية وسرعة فائقة';
    const result = estimateTokensCount(text);
    expect(result.isArabicPredominant).toBe(true);
    expect(result.totalTokens).toBeGreaterThan(result.wordCount);
  });

  it('retrieves accurate pricing rates for standard models', () => {
    const gpt4oPricing = getPricingForModel('gpt-4o', 'openai');
    expect(gpt4oPricing.inputPer1MTokens).toBe(2.5);
    expect(gpt4oPricing.outputPer1MTokens).toBe(10.0);

    const geminiPricing = getPricingForModel('gemini-3.7-flash', 'gemini');
    expect(geminiPricing.isFreeTierAvailable).toBe(true);
    expect(geminiPricing.inputPer1MTokens).toBe(0.10);
  });

  it('calculates slot and aggregate costs with high precision formatting', () => {
    const slot = calculateSlotCost('slot-1', 'openai', 'gpt-4o', 'Hello World', 500);
    expect(slot.inputCostUSD).toBeGreaterThanOrEqual(0);
    expect(slot.totalCostUSD).toBeGreaterThan(0);
    expect(typeof slot.formattedTotalUSD).toBe('string');

    const aggregate = calculateAggregateRunCost(
      [
        { id: '1', provider: 'openai', modelId: 'gpt-4o' },
        { id: '2', provider: 'deepseek', modelId: 'deepseek-chat' }
      ],
      'Test prompt for comparison',
      300
    );
    expect(aggregate.estimates.length).toBe(2);
    expect(aggregate.totalRunCostUSD).toBeGreaterThan(0);
  });

  it('formats micro-transactions cleanly in USD', () => {
    expect(formatUSD(0)).toBe('$0.00');
    expect(formatUSD(0.00005)).toBe('< $0.0001');
    expect(formatUSD(0.005432)).toBe('$0.0054');
    expect(formatUSD(1.2345)).toBe('$1.234');
  });
});
