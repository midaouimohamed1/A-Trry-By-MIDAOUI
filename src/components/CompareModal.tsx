import React, { useState } from 'react';
import { AIModel } from '../types';
import { copyToClipboard } from '../utils/sanitizer';
import {
  X,
  Trash2,
  CheckCircle2,
  BarChart2,
  ArrowUpRight,
  Share2,
  Copy,
  Check,
  FileCode,
  FileDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../hooks/useLanguage';

interface CompareModalProps {
  models?: AIModel[];
  onClose?: () => void;
  onRemoveFromCompare?: (model: AIModel) => void;
  onClearAll?: () => void;
  language?: 'ar' | 'en';
  shareUrl?: string;
  onOpenExport?: () => void;
}

/**
 * Generates a clean, copy-ready Markdown comparison table
 */
export function generateModelsComparisonMarkdown(models: AIModel[], language: 'ar' | 'en'): string {
  const isEn = language === 'en';
  const headerCols = isEn
    ? ['Rank', 'Model Name', 'Developer', 'Category', 'Pricing', 'Release', 'Popularity', 'Key Strengths']
    : ['الترتيب', 'اسم النموذج', 'المطور', 'الفئة', 'الترخيص / التكلفة', 'سنة الإصدار', 'مؤشر الشهرة', 'أبرز القدرات'];

  let md = `# ${isEn ? 'AI Models Side-by-Side Comparison' : 'مقارنة نماذج الذكاء الاصطناعي جنباً إلى جنب'}\n\n`;
  md += `> ${isEn ? 'Generated from the 1,000 AI Models Global Directory' : 'مستخرج من الدليل العالمي لنماذج الذكاء الاصطناعي'}\n\n`;
  
  md += `| ${headerCols.join(' | ')} |\n`;
  md += `| ${headerCols.map(() => '---').join(' | ')} |\n`;

  models.forEach((m) => {
    const category = isEn ? m.category : m.categoryAr;
    const pricing = isEn ? m.pricing : m.pricingAr;
    const features = (isEn ? m.keyFeaturesEn : m.keyFeaturesAr).slice(0, 3).join('; ').replace(/\|/g, '/');
    const safeName = m.name.replace(/\|/g, '-');
    const safeDev = m.developer.replace(/\|/g, '-');

    md += `| #${m.rank} | [${safeName}](${m.url}) | ${safeDev} | ${category} | ${pricing} | ${m.releaseYear} | ${m.popularityScore}% | ${features} |\n`;
  });

  md += `\n---\n*${isEn ? 'Shared Comparison Link:' : 'رابط المشاركة المباشر:'}* ${typeof window !== 'undefined' ? window.location.href : ''}\n`;
  return md;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  models: propModels,
  onClose: propOnClose,
  onRemoveFromCompare: propOnRemoveFromCompare,
  onClearAll: propOnClearAll,
  language: propLanguage,
  shareUrl: propShareUrl,
  onOpenExport: propOnOpenExport
}) => {
  const {
    comparedModels,
    setIsCompareOpen,
    toggleCompare,
    clearComparison,
    shareComparisonUrl,
    setIsExportOpen
  } = useApp();

  const { language: activeLanguage, direction, isRTL, t, formatNumber, formatPercentage } = useLanguage();

  const models = propModels || comparedModels;
  const language = propLanguage || activeLanguage;
  const shareUrl = propShareUrl || shareComparisonUrl;

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      setIsCompareOpen(false);
    }
  };

  const handleRemove = (model: AIModel) => {
    if (propOnRemoveFromCompare) {
      propOnRemoveFromCompare(model);
    } else {
      toggleCompare(model);
    }
  };

  const handleClear = () => {
    if (propOnClearAll) {
      propOnClearAll();
    } else {
      clearComparison();
    }
  };

  const handleOpenExport = () => {
    if (propOnOpenExport) {
      propOnOpenExport();
    } else {
      setIsExportOpen(true);
    }
  };

  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState<boolean>(false);

  // Lock body scroll while modal is open & listen for escape key
  React.useEffect(() => {
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
  }, []);

  if (models.length === 0) return null;

  const handleCopyShareLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyMarkdown = async () => {
    const md = generateModelsComparisonMarkdown(models, language);
    const success = await copyToClipboard(md);
    if (success) {
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: isRTL
            ? `مقارنة نماذج الذكاء الاصطناعي (${models.map((m) => m.name).join(' vs ')})`
            : `AI Models Comparison (${models.map((m) => m.name).join(' vs ')})`,
          text: isRTL
            ? `شاهد مقارنة حية بين ${formatNumber(models.length)} نماذج ذكاء اصطناعي على دليل النماذج العالمي:`
            : `Live comparison between ${formatNumber(models.length)} AI models on the Global AI Directory:`,
          url: shareUrl
        });
      } catch (err) {
        console.log('Share canceled or error', err);
      }
    } else {
      handleCopyShareLink();
    }
  };

  return (
    <div
      id="compare-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={handleClose}
      dir={direction}
    >
      <div
        id="compare-modal-content"
        className="relative bg-slate-900 text-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden my-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-950 p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{t('compare.title')}</span>
                <span className="text-xs font-mono font-bold bg-blue-600/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-lg" dir="ltr">
                  {formatNumber(models.length)} {t('compare.modelsCount')}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {t('compare.subtitle')}
              </p>
            </div>
          </div>

          {/* Action Buttons in Header */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Share Link Button */}
            <button
              onClick={handleCopyShareLink}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
              title={t('compare.copyShareUrl')}
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-blue-400" />}
              <span>{copiedLink ? t('compare.linkCopied') : t('compare.copyShareUrl')}</span>
            </button>

            {/* Native Share */}
            {'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white transition-colors border border-slate-700 cursor-pointer"
                title={t('compare.shareNative')}
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {/* One-Click Export Markdown Button */}
            <button
              onClick={handleCopyMarkdown}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white text-xs font-bold border border-purple-500/30 transition-colors shadow-xs cursor-pointer"
              title={t('compare.exportMarkdown')}
            >
              {copiedMarkdown ? <Check className="w-4 h-4 text-emerald-400" /> : <FileDown className="w-4 h-4 text-purple-400" />}
              <span>{copiedMarkdown ? t('compare.markdownCopied') : t('compare.exportMarkdown')}</span>
            </button>

            {/* Export and Embed */}
            <button
              onClick={handleOpenExport}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-bold transition-colors border border-blue-500/30 cursor-pointer"
            >
              <FileCode className="w-4 h-4" />
              <span>{t('compare.exportEmbed')}</span>
            </button>

            {/* Clear All */}
            <button
              onClick={handleClear}
              className="inline-flex items-center justify-center gap-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 text-slate-300 text-xs font-semibold transition-colors border border-slate-700 hover:border-rose-800 cursor-pointer"
              title={t('compare.clearAll')}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('compare.clear')}</span>
            </button>

            {/* Close */}
            <button
              onClick={handleClose}
              title={t('common.close')}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Table / Columns */}
        <div className="p-6 overflow-x-auto overflow-y-auto flex-1">
          <div
            className="grid gap-4 min-w-[720px]"
            style={{ gridTemplateColumns: `repeat(${models.length}, minmax(260px, 1fr))` }}
          >
            {models.map((model) => (
              <div
                key={model.rank}
                className="bg-slate-950/70 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-blue-600 text-white shadow-xs">
                      #{formatNumber(model.rank)}
                    </span>
                    <button
                      onClick={() => handleRemove(model)}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title={t('compare.remove')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">{model.name}</h3>
                  <p className="text-xs text-slate-400 mb-4 font-medium">{t('modelCard.developedBy')}: {model.developer}</p>

                  <div className="space-y-2 mb-4 text-xs">
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 flex justify-between">
                      <span className="text-slate-400">{t('modelDetail.category')}:</span>
                      <span className="font-bold text-slate-200">
                        {language === 'en' ? model.category : model.categoryAr}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 flex justify-between">
                      <span className="text-slate-400">{t('modelDetail.pricing')}:</span>
                      <span className="font-bold text-blue-400">{language === 'en' ? model.pricing : model.pricingAr}</span>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 flex justify-between">
                      <span className="text-slate-400">{t('modelDetail.releaseYear')}:</span>
                      <span className="font-mono font-bold text-slate-200">{Number(model.releaseYear) ? formatNumber(Number(model.releaseYear)) : model.releaseYear}</span>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 flex justify-between">
                      <span className="text-slate-400">{t('modelDetail.popularityIndex')}:</span>
                      <span className="font-mono font-bold text-emerald-400">{formatPercentage(model.popularityScore)}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase mb-2">{t('modelDetail.description')}:</h4>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-xl border border-slate-800/80 line-clamp-3">
                      {language === 'en' ? model.descriptionEn : model.descriptionAr}
                    </p>
                  </div>

                  <div className="space-y-1.5 mb-5">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">{t('modelCard.keyFeatures')}:</h4>
                    {(language === 'en' ? model.keyFeaturesEn : model.keyFeaturesAr).map((feat, idx) => (
                      <div key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <a
                  href={model.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 min-h-[44px] py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30"
                >
                  <span>{t('modelCard.visitSite')}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

