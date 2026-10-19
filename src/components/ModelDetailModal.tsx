import React, { useState, useEffect } from 'react';
import { AIModel } from '../types';
import { applyModelOverlay } from '../utils/modelOverlay';
import { getUserNoteForModel, saveUserNoteForModel, deleteUserNoteForModel } from '../utils/userNotes';
import {
  X,
  Bookmark,
  BookmarkCheck,
  Copy,
  Check,
  Sparkles,
  Calendar,
  ShieldCheck,
  Tag,
  BarChart2,
  CheckCircle2,
  ArrowUpRight,
  Flame,
  Calculator,
  Clock,
  Star,
  FileText,
  Trash2,
  Share2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../hooks/useLanguage';

interface ModelDetailModalProps {
  model?: AIModel | null;
  onClose?: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (model: AIModel) => void;
  isCompared?: boolean;
  onToggleCompare?: (model: AIModel) => void;
  language?: 'ar' | 'en';
  onOpenCostCalculatorForModel?: (model: AIModel) => void;
}

export const ModelDetailModal: React.FC<ModelDetailModalProps> = ({
  model: propModel,
  onClose: propOnClose,
  isBookmarked: propIsBookmarked,
  onToggleBookmark: propOnToggleBookmark,
  isCompared: propIsCompared,
  onToggleCompare: propOnToggleCompare,
  language: propLanguage,
  onOpenCostCalculatorForModel
}) => {
  const {
    selectedModel: contextModel,
    setSelectedModel,
    isBookmarked: contextIsBookmarked,
    toggleBookmark,
    isCompared: contextIsCompared,
    toggleCompare
  } = useApp();

  const { language: activeLanguage, direction, isRTL, t, formatNumber, formatPercentage } = useLanguage();

  const model = propModel !== undefined ? propModel : contextModel;
  const isBookmarked = propIsBookmarked !== undefined ? propIsBookmarked : (model ? contextIsBookmarked(model.rank) : false);
  const isCompared = propIsCompared !== undefined ? propIsCompared : (model ? contextIsCompared(model.rank) : false);
  const language = propLanguage || activeLanguage;

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      setSelectedModel(null);
    }
  };

  const handleToggleBookmark = (m: AIModel) => {
    if (propOnToggleBookmark) {
      propOnToggleBookmark(m);
    } else {
      toggleBookmark(m);
    }
  };

  const handleToggleCompare = (m: AIModel) => {
    if (propOnToggleCompare) {
      propOnToggleCompare(m);
    } else {
      toggleCompare(m);
    }
  };

  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [userNote, setUserNote] = useState('');
  const [personalRating, setPersonalRating] = useState<number>(0);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  // Hydrate user note & personal rating
  useEffect(() => {
    if (model) {
      const saved = getUserNoteForModel(model.rank);
      if (saved) {
        setUserNote(saved.noteText || '');
        setPersonalRating(saved.personalRating || 0);
      } else {
        setUserNote('');
        setPersonalRating(0);
      }
    }
  }, [model]);

  // Lock body scroll while modal is open & listen for escape key
  React.useEffect(() => {
    if (!model) return;
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
  }, [model]);

  if (!model) return null;

  const enrichedModel = applyModelOverlay(model);

  const handleSaveNote = () => {
    saveUserNoteForModel(model.rank, userNote, personalRating);
    setNoteSavedFeedback(true);
    setTimeout(() => setNoteSavedFeedback(false), 2000);
  };

  const handleDeleteNote = () => {
    deleteUserNoteForModel(model.rank);
    setUserNote('');
    setPersonalRating(0);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(model.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareModel = () => {
    if (typeof window !== 'undefined') {
      const shareUrl = `${window.location.origin}${window.location.pathname}?compare=${model.rank}`;
      navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  return (
    <div
      id="model-detail-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={handleClose}
      dir={direction}
    >
      <div
        id="model-detail-modal-content"
        className="relative bg-slate-900 text-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/50 p-6 sm:p-7 border-b border-slate-800 relative">
          <button
            onClick={handleClose}
            title={t('common.close')}
            className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer`}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="bg-blue-600 text-white font-mono font-bold text-xs px-3 py-1 rounded-lg shadow-sm shadow-blue-500/20" dir="ltr">
              Rank #{formatNumber(model.rank)}
            </span>
            {model.isTrending && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-lg">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                {t('modelDetail.trendingBadge')}
              </span>
            )}
            {enrichedModel.overlay?.customBadgeAr && (
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/40 px-2.5 py-0.5 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{isRTL ? enrichedModel.overlay.customBadgeAr : (enrichedModel.overlay.customBadgeEn || enrichedModel.overlay.customBadgeAr)}</span>
              </span>
            )}
            <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-lg border border-slate-700">
              {language === 'en' ? model.pricing : `${model.pricingAr} (${model.pricing})`}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-mono" dir="ltr">
              <Clock className="w-3 h-3" />
              <span>v2026.1</span>
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5 tracking-tight">
            {model.name}
          </h2>
          <p className="text-sm text-slate-400">
            {t('modelDetail.developedBy')}{' '}
            <span className="text-blue-400 font-semibold">{model.developer}</span>
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-6 max-h-[68vh] overflow-y-auto">
          {/* Highlight Badge if any */}
          {model.highlight && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-semibold flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{model.highlight}</span>
            </div>
          )}

          {/* Key Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1 font-medium">
                <Tag className="w-3.5 h-3.5 text-blue-400" />
                {t('modelDetail.category')}
              </div>
              <div className="text-xs font-bold text-slate-200">
                {language === 'en' ? model.category : model.categoryAr}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                {t('modelDetail.releaseYear')}
              </div>
              <div className="text-xs font-mono font-bold text-slate-200" dir="ltr">
                {Number(model.releaseYear) ? formatNumber(Number(model.releaseYear)) : model.releaseYear}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                {t('modelDetail.pricing')}
              </div>
              <div className="text-xs font-bold text-slate-200">
                {language === 'en' ? model.pricing : model.pricingAr}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1 font-medium">
                <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                {t('modelDetail.popularityIndex')}
              </div>
              <div className="text-xs font-mono font-bold text-emerald-400" dir="ltr">
                {formatPercentage(model.popularityScore)}
              </div>
            </div>
          </div>

          {/* API Pricing Section if available */}
          {model.apiPricing && (
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  {t('modelDetail.apiPricing')}
                </span>
                {onOpenCostCalculatorForModel && (
                  <button
                    onClick={() => onOpenCostCalculatorForModel(model)}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 min-h-[36px] cursor-pointer"
                  >
                    <span>{t('modelDetail.calculateInTool')}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-xs" dir="ltr">
                <div className="p-2 bg-slate-950/70 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">{t('costCalculator.inputTokens')} (1M)</div>
                  <div className="font-bold text-emerald-400">${model.apiPricing.inputPricePer1M.toFixed(2)}</div>
                </div>
                <div className="p-2 bg-slate-950/70 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">{t('costCalculator.outputTokens')} (1M)</div>
                  <div className="font-bold text-emerald-400">${model.apiPricing.outputPricePer1M.toFixed(2)}</div>
                </div>
                {model.apiPricing.contextWindow && (
                  <div className="p-2 bg-slate-950/70 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
                    <div className="text-[10px] text-slate-400 font-sans">Context Window</div>
                    <div className="font-bold text-slate-200">{model.apiPricing.contextWindow}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description Section */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {t('modelDetail.fullDescription')}
            </h4>
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-sm text-slate-300 leading-relaxed space-y-2">
              <p>{language === 'en' ? model.descriptionEn : model.descriptionAr}</p>
            </div>
          </div>

          {/* Features List */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              {t('modelDetail.technicalCapabilities')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(language === 'en' ? model.keyFeaturesEn : model.keyFeaturesAr).map(
                (feat, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-300 font-medium">{feat}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* User Personal Notes & Star Rating */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-indigo-900/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-200">{t('modelDetail.personalNotesTitle')}</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => {
                      const newRating = personalRating === star ? 0 : star;
                      setPersonalRating(newRating);
                      saveUserNoteForModel(model.rank, userNote, newRating);
                    }}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-600 hover:text-amber-400 transition cursor-pointer"
                    title={t('modelDetail.ratingStars', { count: formatNumber(star) })}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        star <= personalRating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              placeholder={t('modelDetail.notesPlaceholder')}
              className="w-full h-20 bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500 transition resize-none"
            />

            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-slate-500">
                {noteSavedFeedback ? (
                  <span className="text-emerald-400 font-bold">{t('modelDetail.noteSaved')}</span>
                ) : (
                  t('modelDetail.noteSavedHint')
                )}
              </span>
              <div className="flex items-center gap-2">
                {userNote && (
                  <button
                    onClick={handleDeleteNote}
                    className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition cursor-pointer min-h-[36px]"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{t('modelDetail.deleteNote')}</span>
                  </button>
                )}
                <button
                  onClick={handleSaveNote}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-xs min-h-[36px]"
                >
                  {t('modelDetail.saveNote')}
                </button>
              </div>
            </div>
          </div>

          {/* URL & Link */}
          <div className="p-4 bg-blue-950/30 border border-blue-500/20 rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-blue-400 font-medium">{t('modelDetail.officialUrl')}</div>
              <div className="text-xs font-mono text-slate-300 truncate" dir="ltr">
                {model.url}
              </div>
            </div>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shrink-0 transition-colors border border-slate-700 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('common.copied') : t('common.copy')}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleToggleBookmark(model)}
              className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {isBookmarked ? (
                <>
                  <BookmarkCheck className="w-4 h-4" />
                  <span>{t('modelDetail.inBookmarks')}</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  <span>{t('modelDetail.addToBookmarks')}</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleToggleCompare(model)}
              className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                isCompared
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>{isCompared ? t('modelDetail.inCompare') : t('modelDetail.addToCompare')}</span>
            </button>

            <button
              onClick={handleShareModel}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
              title={t('modelDetail.shareLink')}
            >
              {shareCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span>{shareCopied ? t('modelDetail.linkCopied') : t('modelDetail.shareLink')}</span>
            </button>
          </div>

          <a
            href={model.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 hover:scale-105 active:scale-95"
          >
            <span>{t('modelCard.visitSite')}</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
