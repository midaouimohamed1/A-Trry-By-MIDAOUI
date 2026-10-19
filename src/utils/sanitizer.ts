/**
 * Security & URL Parameter Sanitization Utility
 * Compliant with OWASP Top 10 Guidelines to prevent XSS & Injection attacks.
 */

/**
 * Sanitizes generic user text input to prevent HTML/script injection
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[&<>"'/]/g, (match) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
      };
      return entities[match] || match;
    })
    .trim();
}

/**
 * Safely parses comparison ranks from URL query parameters.
 * Validates strictly that every rank is a safe integer within the allowed bounds (1 to maxRank).
 */
export function safeParseComparisonQuery(
  queryString: string,
  maxRank: number = 1000,
  maxAllowedItems: number = 6
): number[] {
  try {
    const params = new URLSearchParams(queryString);
    const compareParam = params.get('compare') || params.get('models');
    if (!compareParam) return [];

    // Split by comma or dash
    const rawTokens = compareParam.split(/[,|+]/).map((t) => t.trim());
    const validRanks: number[] = [];

    for (const token of rawTokens) {
      // Must be purely numeric string
      if (/^\d+$/.test(token)) {
        const num = parseInt(token, 10);
        if (num >= 1 && num <= maxRank && !validRanks.includes(num)) {
          validRanks.push(num);
        }
      }
      if (validRanks.length >= maxAllowedItems) break;
    }

    return validRanks;
  } catch (err) {
    console.error('Error parsing safe URL params:', err);
    return [];
  }
}

/**
 * Builds a clean, shareable comparison URL with sanitized query parameters
 */
export function buildComparisonUrl(ranks: number[]): string {
  const cleanRanks = ranks
    .filter((r) => Number.isInteger(r) && r >= 1 && r <= 1000)
    .slice(0, 6);

  const base = typeof window !== 'undefined' && window.location ? `${window.location.origin}${window.location.pathname}` : 'https://ai-models.local/';
  const url = new URL(base);
  if (cleanRanks.length > 0) {
    url.searchParams.set('compare', cleanRanks.join(','));
  } else {
    url.searchParams.delete('compare');
  }
  return url.toString();
}

/**
 * Safely copies text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for non-secure contexts or legacy iframes
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
