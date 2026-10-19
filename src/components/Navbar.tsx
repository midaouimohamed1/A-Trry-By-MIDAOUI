import React, { useState } from 'react';
import {
  Bookmark,
  BarChart2,
  Sparkles,
  Calculator,
  Compass,
  Flame,
  Terminal,
  Sun,
  Moon,
  Palette,
  ChevronDown,
  Globe,
  GitBranch
} from 'lucide-react';
import { AppTheme, THEME_OPTIONS } from '../utils/themeManager';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../hooks/useLanguage';

export const Navbar: React.FC = () => {
  const {
    allModels,
    bookmarkedRanks,
    comparedRanks,
    setIsBookmarksOpen,
    setIsCompareOpen,
    showCalculator,
    setShowCalculator,
    showWizard,
    setShowWizard,
    showPlayground,
    setShowPlayground,
    showRepoLister,
    setShowRepoLister,
    currentTheme,
    setTheme
  } = useApp();

  const { language, setLanguage, direction, isRTL, t, formatNumber } = useLanguage();
  const [showThemeMenu, setShowThemeMenu] = useState<boolean>(false);

  const handleSelectTheme = (theme: AppTheme) => {
    setTheme(theme);
    setShowThemeMenu(false);
  };

  const currentThemeObj = THEME_OPTIONS.find((t) => t.id === currentTheme) || THEME_OPTIONS[0];

  return (
    <header
      id="app-navbar"
      className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md text-white border-b border-slate-800/80 shadow-lg shadow-black/20"
      dir={direction}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className={`absolute -bottom-1 ${isRTL ? '-right-1' : '-left-1'} flex h-3 w-3`}>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5 truncate">
                  <span>{t('nav.brandTitle')}</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-mono">
                    +{formatNumber(allModels.length)}
                  </span>
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full shrink-0">
                  <Flame className="w-2.5 h-2.5 text-blue-400" />
                  {t('common.updatedBadge')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-xl">
                {t('common.appSubtitle')}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* RepoLister-X Tool Button */}
            <button
              onClick={() => setShowRepoLister((prev) => !prev)}
              className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer relative ${
                showRepoLister
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-lg shadow-blue-500/30 ring-1 ring-white/30'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border-cyan-500/40 hover:border-cyan-400'
              }`}
              title="RepoLister-X: Clean-Room Reverse Engineering GitHub Tool"
            >
              <GitBranch className="w-4 h-4 text-cyan-400" />
              <span className="font-mono">RepoLister-X</span>
              <span className="text-[9px] font-bold bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 px-1.5 py-0.2 rounded-full uppercase">
                Tool
              </span>
            </button>

            {/* BYOK Playground Button */}
            <button
              onClick={() => setShowPlayground((prev) => !prev)}
              className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showPlayground
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-blue-300 border-blue-500/30 hover:border-blue-500/60'
              }`}
              title={t('playground.title')}
            >
              <Terminal className="w-4 h-4 text-blue-400" />
              <span className="hidden md:inline">{t('nav.playground')}</span>
            </button>

            {/* Cost Calculator Button */}
            <button
              onClick={() => setShowCalculator((prev) => !prev)}
              className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showCalculator
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/60'
              }`}
              title={t('calculator.title')}
            >
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">{t('nav.calculator')}</span>
            </button>

            {/* AI Model Matcher Wizard Button */}
            <button
              onClick={() => setShowWizard((prev) => !prev)}
              className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showWizard
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30 ring-2 ring-purple-400/20'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-purple-300 border-purple-500/30 hover:border-purple-500/60'
              }`}
              title={t('wizard.title')}
            >
              <Compass className="w-4 h-4 text-purple-400" />
              <span className="hidden lg:inline">{t('nav.wizard')}</span>
            </button>

            {/* Compare Button */}
            {comparedRanks.length > 0 && (
              <button
                onClick={() => setIsCompareOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-blue-600 text-white border border-blue-400 text-xs font-bold shadow-md shadow-blue-500/30 hover:bg-blue-500 transition-all animate-pulse cursor-pointer"
              >
                <BarChart2 className="w-4 h-4" />
                <span>{t('nav.compare', { count: formatNumber(comparedRanks.length) })}</span>
              </button>
            )}

            {/* Bookmarks */}
            <button
              onClick={() => setIsBookmarksOpen(true)}
              className="relative min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title={t('nav.bookmarks')}
            >
              <Bookmark className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">{t('nav.bookmarks')}</span>
              {bookmarkedRanks.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-mono font-bold text-[10px] flex items-center justify-center shadow-xs">
                  {formatNumber(bookmarkedRanks.length)}
                </span>
              )}
            </button>

            {/* Visual Theme Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu((prev) => !prev)}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title={t('nav.theme')}
              >
                {currentTheme === 'cyberpunk' && <Sparkles className="w-4 h-4 text-purple-400" />}
                {currentTheme === 'minimal' && <Moon className="w-4 h-4 text-slate-300" />}
                {currentTheme === 'light' && <Sun className="w-4 h-4 text-amber-400" />}
                <span className="hidden xl:inline text-[11px]">
                  {isRTL ? currentThemeObj.nameAr.split(' ')[0] : currentThemeObj.nameEn.split(' ')[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Theme Dropdown Menu */}
              {showThemeMenu && (
                <div
                  className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 text-start space-y-1 backdrop-blur-md`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 border-b border-slate-800 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-purple-400" />
                    <span>{t('nav.theme')}</span>
                  </div>

                  {THEME_OPTIONS.map((theme) => {
                    const isCurrent = theme.id === currentTheme;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => handleSelectTheme(theme.id)}
                        className={`w-full min-h-[44px] p-2 rounded-xl text-start transition cursor-pointer flex items-start gap-2.5 ${
                          isCurrent
                            ? 'bg-purple-950/50 border border-purple-500/40 text-white'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="pt-0.5">
                          {theme.id === 'cyberpunk' && <Sparkles className="w-4 h-4 text-purple-400" />}
                          {theme.id === 'minimal' && <Moon className="w-4 h-4 text-slate-400" />}
                          {theme.id === 'light' && <Sun className="w-4 h-4 text-amber-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs flex items-center justify-between">
                            <span>{isRTL ? theme.nameAr : theme.nameEn}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-mono bg-purple-500 text-white px-1.5 py-0.2 rounded-md">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {isRTL ? theme.descriptionAr : theme.descriptionEn}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Language Switcher Toggle */}
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs min-h-[44px] shadow-xs">
              <button
                onClick={() => setLanguage('ar')}
                className={`min-h-[36px] px-2.5 py-1 rounded-lg transition-all font-bold cursor-pointer flex items-center gap-1.5 ${
                  language === 'ar'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title="التحويل للغة العربية"
                aria-label="Arabic language"
              >
                <span>🇸🇦</span>
                <span className="font-medium text-[11px]">عربي</span>
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`min-h-[36px] px-2.5 py-1 rounded-lg transition-all font-bold cursor-pointer flex items-center gap-1.5 ${
                  language === 'en'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title="Switch to English"
                aria-label="English language"
              >
                <span>🇺🇸</span>
                <span className="font-medium text-[11px]">EN</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

