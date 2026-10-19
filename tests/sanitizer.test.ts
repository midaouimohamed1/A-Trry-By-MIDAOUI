import { describe, it, expect } from 'vitest';
import { sanitizeInput, safeParseComparisonQuery } from '../src/utils/sanitizer';

describe('Security & Sanitization Utilities', () => {
  describe('sanitizeInput()', () => {
    it('should escape malicious HTML and script injection characters', () => {
      const malicious = '<script>alert("xss")</script>';
      const sanitized = sanitizeInput(malicious);
      expect(sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should strip special characters and trim leading/trailing whitespace', () => {
      const input = "  Hello & 'World' > test  ";
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('Hello &amp; &#x27;World&#x27; &gt; test');
    });

    it('should handle non-string inputs safely without throwing', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
      expect(sanitizeInput(123 as any)).toBe('');
    });
  });

  describe('safeParseComparisonQuery()', () => {
    it('should extract valid numeric ranks within bounds', () => {
      const queryString = '?compare=1,5,100,500';
      const ranks = safeParseComparisonQuery(queryString);
      expect(ranks).toEqual([1, 5, 100, 500]);
    });

    it('should discard out-of-bounds ranks or invalid injection payloads', () => {
      const maliciousQuery = '?compare=1,9999,NaN,<script>,42,-5';
      const ranks = safeParseComparisonQuery(maliciousQuery);
      expect(ranks).toEqual([1, 42]);
    });

    it('should enforce the maximum allowed comparison items ceiling (default 6)', () => {
      const largeQuery = '?compare=1,2,3,4,5,6,7,8,9,10';
      const ranks = safeParseComparisonQuery(largeQuery);
      expect(ranks).toHaveLength(6);
      expect(ranks).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });
});
