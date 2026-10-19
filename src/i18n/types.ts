export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

export interface TranslationParams {
  [key: string]: string | number;
}

export interface LanguageContextValue {
  language: Language;
  direction: Direction;
  isRTL: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: TranslationParams) => string;
  formatNumber: (n: number) => string;
  formatCurrency: (n: number, currency?: string) => string;
  formatPercentage: (n: number) => string;
}
