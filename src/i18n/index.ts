import { ar } from './locales/ar';
import { en } from './locales/en';
import { Language, Direction, TranslationParams } from './types';

export const translations = {
  ar,
  en
} as const;

export const LANGUAGE_STORAGE_KEY = 'ai_directory_preferred_language';

/**
 * Retrieves a nested value by dot path (e.g. 'nav.brandTitle') from a dictionary object.
 */
function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Interpolates variables in format {key} with provided params.
 */
export function interpolateParams(text: string, params?: TranslationParams): string {
  if (!params || !text) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

/**
 * Main translation lookup helper with safe fallback.
 */
export function translate(
  lang: Language,
  key: string,
  params?: TranslationParams
): string {
  const currentDict = translations[lang] || translations.ar;
  let translated = getNestedValue(currentDict, key);

  // Fallback to other language if key missing
  if (translated === undefined) {
    const fallbackDict = lang === 'ar' ? translations.en : translations.ar;
    translated = getNestedValue(fallbackDict, key);
  }

  // If still missing, return the key as fallback
  if (translated === undefined) {
    return key;
  }

  return interpolateParams(translated, params);
}

/**
 * Determines text direction from language.
 */
export function getDirectionForLanguage(lang: Language): Direction {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Formats numbers according to active language locale.
 */
export function formatLocalizedNumber(num: number, lang: Language): string {
  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US').format(num);
  } catch {
    return num.toLocaleString();
  }
}

/**
 * Formats percentage according to active locale.
 */
export function formatLocalizedPercentage(num: number, lang: Language): string {
  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'percent',
      maximumFractionDigits: 1
    }).format(num / 100);
  } catch {
    return `${num}%`;
  }
}

/**
 * Formats currency amounts according to active locale.
 */
export function formatLocalizedCurrency(
  amount: number,
  lang: Language,
  currency: string = 'USD'
): string {
  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: amount < 0.01 && amount > 0 ? 4 : 2
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}
