import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Language, Direction, LanguageContextValue, TranslationParams } from '../i18n/types';
import {
  translate,
  getDirectionForLanguage,
  formatLocalizedNumber,
  formatLocalizedCurrency,
  formatLocalizedPercentage,
  LANGUAGE_STORAGE_KEY
} from '../i18n';

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'ar' || saved === 'en') {
      return saved;
    }
    // Check browser preference if no stored preference
    if (typeof navigator !== 'undefined' && navigator.language) {
      if (navigator.language.toLowerCase().startsWith('ar')) {
        return 'ar';
      }
    }
  } catch (err) {
    console.warn('Failed to read language from localStorage:', err);
  }
  // Default to Arabic as primary theme
  return 'ar';
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const direction: Direction = useMemo(() => getDirectionForLanguage(language), [language]);
  const isRTL = direction === 'rtl';

  // Synchronize document attributes whenever language changes
  useEffect(() => {
    try {
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        root.lang = language;
        root.dir = direction;
        root.setAttribute('data-lang', language);
        root.setAttribute('data-dir', direction);

        // Update body typography classes
        if (language === 'ar') {
          document.body.classList.remove('font-en');
          document.body.classList.add('font-ar');
        } else {
          document.body.classList.remove('font-ar');
          document.body.classList.add('font-en');
        }
      }
    } catch (err) {
      console.warn('Error updating document attributes:', err);
    }
  }, [language, direction]);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    } catch (err) {
      console.warn('Failed to save language to localStorage:', err);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  }, [language, setLanguage]);

  const t = useCallback(
    (key: string, params?: TranslationParams): string => {
      return translate(language, key, params);
    },
    [language]
  );

  const formatNumber = useCallback(
    (n: number): string => {
      return formatLocalizedNumber(n, language);
    },
    [language]
  );

  const formatCurrency = useCallback(
    (n: number, currency: string = 'USD'): string => {
      return formatLocalizedCurrency(n, language, currency);
    },
    [language]
  );

  const formatPercentage = useCallback(
    (n: number): string => {
      return formatLocalizedPercentage(n, language);
    },
    [language]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      direction,
      isRTL,
      setLanguage,
      toggleLanguage,
      t,
      formatNumber,
      formatCurrency,
      formatPercentage
    }),
    [language, direction, isRTL, setLanguage, toggleLanguage, t, formatNumber, formatCurrency, formatPercentage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Also export useTranslation alias for developer convenience
export const useTranslation = useLanguage;
