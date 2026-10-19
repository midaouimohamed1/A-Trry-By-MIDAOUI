import React, { useState } from 'react';
import { AIModel, ExportFormat } from '../types';
import { copyToClipboard } from '../utils/sanitizer';
import {
  X,
  FileCode,
  FileJson,
  Copy,
  Check,
  Download,
  Share2,
  Sparkles
} from 'lucide-react';

interface ExportEmbedModalProps {
  models: AIModel[];
  onClose: () => void;
  shareUrl: string;
}

export const ExportEmbedModal: React.FC<ExportEmbedModalProps> = ({
  models,
  onClose,
  shareUrl
}) => {
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('markdown');
  const [copied, setCopied] = useState<boolean>(false);

  // Lock body scroll while modal is open & listen for escape key
  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Generate Markdown
  const markdownContent = React.useMemo(() => {
    let md = `# مقارنة نماذج الذكاء الاصطناعي\n\n`;
    md += `> تم التوليد عبر [دليل الذكاء الاصطناعي العالمي](${shareUrl})\n\n`;
    md += `| المرتبة | اسم النموذج | المطور | الفئة | الترخيص | الرابط الرسمي |\n`;
    md += `| :---: | :--- | :--- | :--- | :--- | :--- |\n`;

    models.forEach((m) => {
      md += `| #${m.rank} | **${m.name}** | ${m.developer} | ${m.categoryAr} | ${m.pricingAr} | [زيارة الموقع](${m.url}) |\n`;
    });

    md += `\n### تفاصيل الميزات والقدرات:\n\n`;
    models.forEach((m) => {
      md += `#### #${m.rank} ${m.name} (${m.developer})\n`;
      md += `- **الوصف**: ${m.descriptionAr}\n`;
      md += `- **أبرز القدرات**:\n`;
      m.keyFeaturesAr.forEach((f) => {
        md += `  - ${f}\n`;
      });
      md += `- **سنة الإطلاق**: ${m.releaseYear} | **مؤشر الشهرة**: ${m.popularityScore}%\n\n`;
    });

    return md;
  }, [models, shareUrl]);

  // Generate Clean JSON
  const jsonContent = React.useMemo(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      source: 'AI Global Models Directory',
      comparisonUrl: shareUrl,
      modelsCount: models.length,
      models: models.map((m) => ({
        rank: m.rank,
        name: m.name,
        developer: m.developer,
        category: m.category,
        categoryAr: m.categoryAr,
        pricing: m.pricing,
        pricingAr: m.pricingAr,
        url: m.url,
        releaseYear: m.releaseYear,
        popularityScore: m.popularityScore,
        descriptionAr: m.descriptionAr,
        descriptionEn: m.descriptionEn,
        keyFeaturesAr: m.keyFeaturesAr,
        keyFeaturesEn: m.keyFeaturesEn
      }))
    };
    return JSON.stringify(data, null, 2);
  }, [models, shareUrl]);

  const currentContent = activeFormat === 'markdown' ? markdownContent : jsonContent;

  const handleCopy = async () => {
    const success = await copyToClipboard(currentContent);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    let filename = 'ai-models-comparison';
    let mimeType = 'text/plain';

    if (activeFormat === 'markdown') {
      filename += '.md';
      mimeType = 'text/markdown';
    } else {
      filename += '.json';
      mimeType = 'application/json';
    }

    const blob = new Blob([currentContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="export-embed-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="export-embed-modal-content"
        className="relative bg-slate-900 text-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">تصدير بيانات المقارنة</h3>
              <p className="text-xs text-slate-400">
                تصدير بيانات {models.length} نماذج مقارنة إلى ملفات مهيكلة (Markdown أو JSON)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs for formats */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveFormat('markdown')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeFormat === 'markdown'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Markdown (.md)</span>
            </button>

            <button
              onClick={() => setActiveFormat('json')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeFormat === 'json'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileJson className="w-4 h-4" />
              <span>JSON (.json)</span>
            </button>
          </div>

          {/* Code Viewer Container */}
          <div className="relative">
            <pre
              className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono text-slate-300 max-h-72 overflow-y-auto overflow-x-auto leading-relaxed"
              dir="ltr"
            >
              {currentContent}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>جاهز للنسخ والتضمين المباشر في توثيقك أو تطبيقاتك</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors border border-slate-700"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'تم النسخ بنجاح' : 'نسخ البيانات'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل كملف</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
