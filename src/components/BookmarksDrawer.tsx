import React from 'react';
import { AIModel } from '../types';
import { X, Bookmark, Trash2, ArrowUpRight, Copy, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../hooks/useLanguage';

interface BookmarksDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  bookmarkedModels?: AIModel[];
  onRemoveBookmark?: (model: AIModel) => void;
  onClearAll?: () => void;
  onViewDetails?: (model: AIModel) => void;
  language?: 'ar' | 'en';
}

export const BookmarksDrawer: React.FC<BookmarksDrawerProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  bookmarkedModels: propBookmarkedModels,
  onRemoveBookmark: propOnRemoveBookmark,
  onClearAll: propOnClearAll,
  onViewDetails: propOnViewDetails,
  language: propLanguage
}) => {
  const {
    isBookmarksOpen,
    setIsBookmarksOpen,
    bookmarkedModels: contextBookmarkedModels,
    toggleBookmark,
    clearBookmarks,
    setSelectedModel
  } = useApp();

  const { language: activeLanguage, direction, isRTL, t, formatNumber } = useLanguage();

  const isOpen = propIsOpen !== undefined ? propIsOpen : isBookmarksOpen;
  const bookmarkedModels = propBookmarkedModels || contextBookmarkedModels;
  const language = propLanguage || activeLanguage;

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      setIsBookmarksOpen(false);
    }
  };

  const handleRemove = (model: AIModel) => {
    if (propOnRemoveBookmark) {
      propOnRemoveBookmark(model);
    } else {
      toggleBookmark(model);
    }
  };

  const handleClear = () => {
    if (propOnClearAll) {
      propOnClearAll();
    } else {
      clearBookmarks();
    }
  };

  const handleView = (model: AIModel) => {
    if (propOnViewDetails) {
      propOnViewDetails(model);
    } else {
      handleClose();
      setSelectedModel(model);
    }
  };

  const [copiedAll, setCopiedAll] = React.useState(false);

  // Lock body scroll while drawer is open & listen for escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyAllLinks = () => {
    const text = bookmarkedModels
      .map((m) => `${m.name} (#${m.rank}): ${m.url}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div
      id="bookmarks-drawer-overlay"
      className={`fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex ${isRTL ? 'justify-start' : 'justify-end'} animate-in fade-in duration-200`}
      onClick={handleClose}
      dir={direction}
    >
      <div
        id="bookmarks-drawer-content"
        className={`bg-slate-900 text-white w-full max-w-md h-full shadow-2xl ${isRTL ? 'border-l' : 'border-r'} border-slate-800 flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t('bookmarks.title')}</h2>
              <p className="text-xs text-slate-400">
                {t('bookmarks.subtitle', { count: formatNumber(bookmarkedModels.length) })}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            title={t('common.close')}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar inside Drawer */}
        {bookmarkedModels.length > 0 && (
          <div className="px-5 py-3 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between text-xs">
            <button
              onClick={handleCopyAllLinks}
              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-blue-400 transition-colors font-medium min-h-[36px] cursor-pointer"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? t('bookmarks.copiedAll') : t('bookmarks.copyAll')}</span>
            </button>

            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors font-medium min-h-[36px] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('bookmarks.clearAll')}</span>
            </button>
          </div>
        )}

        {/* Content List */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3">
          {bookmarkedModels.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-500">
                <Bookmark className="w-7 h-7 stroke-1" />
              </div>
              <p className="text-sm font-semibold text-slate-300">{t('bookmarks.empty')}</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {t('bookmarks.emptyHint')}
              </p>
            </div>
          ) : (
            bookmarkedModels.map((model) => (
              <div
                key={model.rank}
                className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-300 border border-blue-500/30">
                      #{formatNumber(model.rank)}
                    </span>
                    <h3
                      onClick={() => handleView(model)}
                      className="text-sm font-bold text-white hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      {model.name}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleRemove(model)}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title={t('bookmarks.remove')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-400 line-clamp-1">
                  {language === 'en' ? model.descriptionEn : model.descriptionAr}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <span className="text-slate-400 font-medium">
                    {language === 'en' ? model.pricing : model.pricingAr}
                  </span>

                  <a
                    href={model.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold min-h-[36px]"
                  >
                    <span>{t('modelCard.visitSite')}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
