import { describe, it, expect } from 'vitest';
import { sanitizeInput, safeParseComparisonQuery, buildComparisonUrl } from '../sanitizer';

describe('Sanitizer & URL Utilities', () => {
  it('sanitizes malicious script tags and HTML injection', () => {
    const malicious = '<script>alert("xss")</script>Hello & World';
    const sanitized = sanitizeInput(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('&lt;script&gt;');
  });

  it('safely parses comparison query string with integer ranks', () => {
    const search = '?compare=1,2,5,9999';
    const parsed = safeParseComparisonQuery(search, 1000, 4);
    expect(parsed).toEqual([1, 2, 5]);
    expect(parsed.length).toBeLessThanOrEqual(4);
  });

  it('rejects invalid, negative, or NaN values in compare parameter', () => {
    const search = '?compare=abc,-5,0,42,foo';
    const parsed = safeParseComparisonQuery(search, 1000, 4);
    expect(parsed).toEqual([42]);
  });

  it('builds comparison URL accurately with valid ranks', () => {
    const url = buildComparisonUrl([1, 2, 3]);
    expect(url).toContain('compare=1%2C2%2C3');
  });

  it('returns empty comparison string when array is empty', () => {
    const url = buildComparisonUrl([]);
    expect(url).not.toContain('compare=');
  });
});
