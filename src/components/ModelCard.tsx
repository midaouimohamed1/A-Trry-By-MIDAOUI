import React, { useState, useEffect } from 'react';
import { AIModel } from '../types';
import { applyModelOverlay } from '../utils/modelOverlay';
import { getUserNoteForModel } from '../utils/userNotes';
import {
  getStoredModelRatings,
  setModelRatingVote,
  RatingVote
} from '../utils/feedbackRatings';
import {
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  BarChart2,
  Layers,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  Crown,
  Flame,
  ArrowUpRight,
  Eye,
  FileText,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../hooks/useLanguage';

interface ModelCardProps {
  model: AIModel;
  isBookmarked?: boolean;
  onToggleBookmark?: (model: AIModel) => void;
  onViewDetails?: (model: AIModel) => void;
  isCompared?: boolean;
  onToggleCompare?: (model: AIModel) => void;
  language?: 'ar' | 'en';
  viewMode?: 'grid' | 'compact';
}

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  isBookmarked: propIsBookmarked,
  onToggleBookmark: propOnToggleBookmark,
  onViewDetails: propOnViewDetails,
  isCompared: propIsCompared,
  onToggleCompare: propOnToggleCompare,
  language: propLanguage,
  viewMode: propViewMode
}) => {
  const {
    bookmarkedRanks,
    toggleBookmark,
    comparedRanks,
    toggleCompare,
    setSelectedModel,
    viewMode: contextViewMode
  } = useApp();

  const { language: activeLanguage, direction, isRTL, t, formatNumber, formatPercentage } = useLanguage();

  const isBookmarked = propIsBookmarked !== undefined ? propIsBookmarked : bookmarkedRanks.includes(model.rank);
  const isCompared = propIsCompared !== undefined ? propIsCompared : comparedRanks.includes(model.rank);
  const language = propLanguage || activeLanguage;
  const viewMode = propViewMode || contextViewMode;

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

  const handleViewDetails = (m: AIModel) => {
    if (propOnViewDetails) {
      propOnViewDetails(m);
    } else {
      setSelectedModel(m);
    }
  };

  const [copied, setCopied] = React.useState(false);
  const [userRating, setUserRating] = useState<RatingVote | null>(() => {
    const map = getStoredModelRatings();
    return map[model.rank] || null;
  });

  useEffect(() => {
    const handleRatingsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ ratings?: Record<number, RatingVote> }>;
      const map = customEvent?.detail?.ratings || getStoredModelRatings();
      setUserRating(map[model.rank] || null);
    };
    window.addEventListener('ai-model-ratings-updated', handleRatingsUpdate);
    return () => window.removeEventListener('ai-model-ratings-updated', handleRatingsUpdate);
  }, [model.rank]);

  const handleVote = (vote: RatingVote, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = setModelRatingVote(model.rank, vote);
    setUserRating(updated[model.rank] || null);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(model.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Rank Styling
  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return {
        bg: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-lg shadow-amber-500/20 ring-1 ring-amber-300',
        icon: <Crown className="w-3.5 h-3.5 fill-slate-950" />
      };
    }
    if (rank === 2) {
      return {
        bg: 'bg-gradient-to-r from-slate-300 to-slate-100 text-slate-900 font-bold shadow-md shadow-slate-300/20 ring-1 ring-slate-200',
        icon: null
      };
    }
    if (rank === 3) {
      return {
        bg: 'bg-gradient-to-r from-amber-700 to-amber-600 text-amber-50 font-bold shadow-md shadow-amber-800/20 ring-1 ring-amber-500',
        icon: null
      };
    }
    if (rank <= 10) {
      return {
        bg: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-sm shadow-blue-500/20',
        icon: null
      };
    }
    if (rank <= 50) {
      return {
        bg: 'bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold',
        icon: null
      };
    }
    if (rank <= 100) {
      return {
        bg: 'bg-slate-800 text-cyan-400 border border-cyan-500/30',
        icon: null
      };
    }
    return {
      bg: 'bg-slate-800 text-slate-300 border border-slate-700/60',
      icon: null
    };
  };

  // Pricing styles
  const getPricingBadge = (pricing: string) => {
    switch (pricing) {
      case 'Free':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'Open Source':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'Freemium':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'Paid':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const rankBadge = getRankBadge(model.rank);
  const enrichedModel = applyModelOverlay(model);
  const userNote = getUserNoteForModel(model.rank);

  // Compact / Row View
  if (viewMode === 'compact') {
    return (
      <div
        id={`model-row-${model.rank}`}
        onClick={() => handleViewDetails(model)}
        className="group relative bg-slate-900/90 hover:bg-slate-850 border border-slate-800/80 hover:border-blue-500/50 rounded-xl p-3.5 sm:p-4 transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer shadow-sm hover:shadow-md hover:shadow-blue-500/5"
        dir={direction}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className={`inline-flex items-center gap-1 font-mono text-xs px-2.5 py-1 rounded-lg shrink-0 ${rankBadge.bg}`}
          >
            {rankBadge.icon}
            #{formatNumber(model.rank)}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                {model.name}
              </h3>
              <span className="text-xs text-slate-400 font-medium truncate">
                • {model.developer}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${getPricingBadge(
                  model.pricing
                )}`}
              >
                {language === 'en' ? model.pricing : model.pricingAr}
              </span>
              {model.isTrending && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 rounded-full">
                  <Flame className="w-2.5 h-2.5" />
                  {t('modelCard.trending')}
                </span>
              )}
              {enrichedModel.overlay?.customBadgeAr && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-400 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded-full">
                  <Sparkles className="w-2.5 h-2.5" />
                  {isRTL ? enrichedModel.overlay.customBadgeAr : (enrichedModel.overlay.customBadgeEn || enrichedModel.overlay.customBadgeAr)}
                </span>
              )}
              {userNote && (
                <span
                  title={userNote.noteText || 'Personal note'}
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 rounded-full"
                >
                  <FileText className="w-2.5 h-2.5" />
                  {userNote.personalRating ? `★ ${formatNumber(userNote.personalRating)}` : (isRTL ? 'ملاحظة' : 'Note')}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
              {language === 'en' ? model.descriptionEn : model.descriptionAr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 shrink-0">
          {/* Quick User Feedback */}
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={(e) => handleVote('up', e)}
              title={t('modelCard.like')}
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
                userRating === 'up'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => handleVote('down', e)}
              title={t('modelCard.dislike')}
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
                userRating === 'down'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleCompare(model);
            }}
            title={t('modelCard.compare')}
            className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isCompared
                ? 'bg-blue-600 text-white border-blue-500'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border-slate-700'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleBookmark(model);
            }}
            title={t('modelCard.bookmark')}
            className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isBookmarked
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'text-slate-400 hover:text-amber-300 bg-slate-800 hover:bg-slate-700 border-slate-700'
            }`}
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>

          <button
            onClick={handleCopyLink}
            title={t('modelCard.copyUrl')}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <a
            href={model.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center gap-1 min-h-[40px] px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs"
          >
            <span>{t('modelCard.visitSite')}</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  // Standard Rich Grid Card
  return (
    <div
      id={`model-card-${model.rank}`}
      className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-blue-500/60 rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-lg shadow-slate-950/40 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1"
      dir={direction}
    >
      {/* Top ambient glow on hover */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-24 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-600/20 transition-all pointer-events-none" />

      {/* Main Content Area */}
      <div className="relative z-10">
        {/* Header Row: Rank, Badges, Quick Actions */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 font-mono text-xs px-2.5 py-1 rounded-lg ${rankBadge.bg}`}
              title={t('modelCard.rankBadge', { rank: formatNumber(model.rank) })}
            >
              {rankBadge.icon}
              #{formatNumber(model.rank)}
            </span>

            {model.isTrending && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full">
                <Flame className="w-3 h-3 animate-pulse text-rose-400" />
                {t('modelCard.trending')}
              </span>
            )}

            {enrichedModel.overlay?.customBadgeAr && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-400 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>{isRTL ? enrichedModel.overlay.customBadgeAr : (enrichedModel.overlay.customBadgeEn || enrichedModel.overlay.customBadgeAr)}</span>
              </span>
            )}

            {userNote && (
              <span
                title={userNote.noteText || 'Personal note'}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-full"
              >
                <FileText className="w-3 h-3" />
                <span>{userNote.personalRating ? `★ ${formatNumber(userNote.personalRating)}` : (isRTL ? 'ملاحظة' : 'Note')}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick User Feedback */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={(e) => handleVote('up', e)}
                title={t('modelCard.like')}
                className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded text-xs transition-colors cursor-pointer ${
                  userRating === 'up'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => handleVote('down', e)}
                title={t('modelCard.dislike')}
                className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded text-xs transition-colors cursor-pointer ${
                  userRating === 'down'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleCompare(model);
              }}
              title={t('modelCard.compare')}
              className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border text-xs transition-all cursor-pointer ${
                isCompared
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 border-slate-700/80'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleBookmark(model);
              }}
              title={t('modelCard.bookmark')}
              className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border text-xs transition-all cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm shadow-amber-500/30'
                  : 'text-slate-400 hover:text-amber-300 bg-slate-800/80 hover:bg-slate-800 border-slate-700/80'
              }`}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Model Title & Developer */}
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2">
            <h3
              onClick={() => handleViewDetails(model)}
              className="text-base sm:text-lg font-bold text-white group-hover:text-blue-400 transition-colors cursor-pointer line-clamp-1"
            >
              {model.name}
            </h3>
            <span className="text-[11px] font-mono font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60 shrink-0" dir="ltr">
              {Number(model.releaseYear) ? formatNumber(Number(model.releaseYear)) : model.releaseYear}
            </span>
          </div>

          <p className="text-xs text-slate-400 font-medium line-clamp-1 mt-0.5">
            {t('modelCard.developedBy')}{' '}
            <span className="text-slate-200 font-semibold">{model.developer}</span>
          </p>
        </div>

        {/* Category & Pricing Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/70 px-2.5 py-0.5 rounded-md">
            <Layers className="w-3 h-3 text-blue-400" />
            {language === 'en' ? model.category : model.categoryAr}
          </span>

          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${getPricingBadge(
              model.pricing
            )}`}
          >
            {language === 'en' ? model.pricing : model.pricingAr}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mb-3.5 min-h-[36px]">
          {language === 'en' ? model.descriptionEn : model.descriptionAr}
        </p>

        {/* Key Features Preview */}
        <div className="space-y-1.5 mb-4 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
          <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-blue-400" />
              {t('modelCard.keyFeatures')}:
            </span>
            <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
              {formatPercentage(model.popularityScore)} {t('common.popularityScore')}
            </span>
          </div>
          <ul className="space-y-1 pt-1">
            {(language === 'en' ? model.keyFeaturesEn : model.keyFeaturesAr)
              .slice(0, 2)
              .map((feature, idx) => (
                <li
                  key={idx}
                  className="text-[11px] text-slate-300 flex items-start gap-1.5 line-clamp-1"
                >
                  <span className="text-blue-400 font-bold">•</span>
                  <span>{feature}</span>
                </li>
              ))}
          </ul>
        </div>
      </div>

      {/* Card Footer: Quick Actions & Visit URL */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 relative z-10">
        <button
          onClick={() => handleViewDetails(model)}
          className="inline-flex items-center justify-center gap-1 min-h-[40px] text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span>{t('modelCard.viewDetails')}</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyLink}
            title={copied ? t('modelCard.copied') : t('modelCard.copyUrl')}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          <a
            href={model.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 hover:scale-105 active:scale-95"
          >
            <span>{t('modelCard.visitSite')}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

