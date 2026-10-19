export type AppTheme = 'cyberpunk' | 'minimal' | 'light';

export interface ThemeOption {
  id: AppTheme;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  badgeBg: string;
  iconName: 'sparkles' | 'moon' | 'sun';
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'cyberpunk',
    nameAr: 'السايبربانك (نيون أرجواني)',
    nameEn: 'Cyberpunk Neon Dark',
    descriptionAr: 'خلفية داكنة فخمة مع توهج نيون باللون الأرجواني والأزرق السماوي',
    descriptionEn: 'Luxury dark theme with vibrant neon purple & cyan glow accents',
    badgeBg: 'from-purple-600 to-indigo-600',
    iconName: 'sparkles'
  },
  {
    id: 'minimal',
    nameAr: 'الليلي الهادئ (Dark Slate)',
    nameEn: 'Minimalist Midnight Dark',
    descriptionAr: 'وضع داكن هادئ لتقليل إجهاد العين أثناء ساعات البرمجة والبحث الطويلة',
    descriptionEn: 'Sleek muted dark palette designed for extended reading & coding',
    badgeBg: 'from-slate-700 to-slate-900',
    iconName: 'moon'
  },
  {
    id: 'light',
    nameAr: 'النهاري الاحترافي (Pro Light)',
    nameEn: 'Professional Clean Light',
    descriptionAr: 'واجهة نهارية عالية التباين وواضحة جداً للقراءة والطباعة',
    descriptionEn: 'High-contrast light interface optimized for daylight clarity',
    badgeBg: 'from-blue-500 to-indigo-400',
    iconName: 'sun'
  }
];

const THEME_STORAGE_KEY = 'ai_models_app_theme_v2';

/**
 * Safely get the stored theme from localStorage
 */
export function getStoredTheme(): AppTheme {
  if (typeof window === 'undefined') return 'cyberpunk';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
    if (stored && (stored === 'cyberpunk' || stored === 'minimal' || stored === 'light')) {
      return stored;
    }
  } catch (e) {
    console.warn('Unable to read theme from localStorage:', e);
  }
  return 'cyberpunk';
}

/**
 * Apply theme to document root (<html> and <body>)
 */
export function applyThemeToDocument(theme: AppTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Remove existing theme classes
  root.classList.remove('theme-cyberpunk', 'theme-minimal', 'theme-light', 'light', 'dark');

  // Set data-theme attribute
  root.setAttribute('data-theme', theme);

  if (theme === 'light') {
    root.classList.add('theme-light', 'light');
  } else if (theme === 'minimal') {
    root.classList.add('theme-minimal', 'dark');
  } else {
    root.classList.add('theme-cyberpunk', 'dark');
  }
}

/**
 * Save theme to localStorage and apply globally
 */
export function setAppTheme(theme: AppTheme): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      console.warn('Unable to save theme to localStorage:', e);
    }
    applyThemeToDocument(theme);
    window.dispatchEvent(new CustomEvent('app-theme-changed', { detail: { theme } }));
  }
}
