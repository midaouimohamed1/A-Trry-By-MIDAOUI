import React, { useState, useEffect } from 'react';
import {
  History,
  Trash2,
  Clock,
  BookOpen,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Code2,
  Languages,
  Database,
  FileText,
  PenTool,
  RotateCcw,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

export interface PlaygroundHistoryItem {
  id: string;
  timestamp: number;
  prompt: string;
  modelId: string;
  modelName?: string;
  responseSummary: string;
}

export interface PromptTemplate {
  id: string;
  titleAr: string;
  titleEn: string;
  category: 'code' | 'translation' | 'sql' | 'summary' | 'creative';
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
  descriptionAr: string;
  descriptionEn: string;
  prompt: string;
}

const PLAYGROUND_HISTORY_KEY = 'ai_playground_history_v1';
const MAX_HISTORY_ITEMS = 20;

export const CURATED_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'code-debug',
    titleAr: 'تصحيح واستكشاف أخطاء كود',
    titleEn: 'Code Debugging & Optimization',
    category: 'code',
    icon: Code2,
    badgeColor: 'from-blue-600 to-indigo-600',
    descriptionAr: 'تحليل دالة برمجية، اكتشاف ثغرات الذاكرة وتقديم نسخة محسنة مع التوثيق.',
    descriptionEn: 'Analyze a TypeScript function for memory leaks, edge cases, and performance bottlenecks.',
    prompt: `Analyze the following TypeScript function for potential memory leaks, race conditions, and unhandled edge cases. Provide an optimized, production-ready refactored version with concise inline comments explaining the fixes:

\`\`\`typescript
async function fetchAndCacheUserData(userId: string, ttlMs: number = 300000) {
  let cache = (globalThis as any).__userCache || {};
  if (cache[userId] && Date.now() - cache[userId].timestamp < ttlMs) {
    return cache[userId].data;
  }
  const response = await fetch(\`/api/users/\${userId}\`);
  const data = await response.json();
  cache[userId] = { data, timestamp: Date.now() };
  (globalThis as any).__userCache = cache;
  return data;
}
\`\`\``
  },
  {
    id: 'arabic-translation',
    titleAr: 'ترجمة احترافية وصياغة فصيحة',
    titleEn: 'Arabic Localization & High Eloquence',
    category: 'translation',
    icon: Languages,
    badgeColor: 'from-emerald-600 to-teal-600',
    descriptionAr: 'ترجمة نص تقني معقد إلى لغة عربية فصحى بليغة ودقيقة المصطلحات دون ترجمة حرفية.',
    descriptionEn: 'Translate complex technical AI prose into eloquent Modern Standard Arabic with accurate domain terminology.',
    prompt: `قم بترجمة النص التقني التالي إلى لغة عربية فصحى جزلة ورفيعة المستوى تناسب مقالاً أكاديمياً متخصصاً، مع تعريب المصطلحات بدقة دون لجوء للترجمة الحرفية الركيكة:

"Large Language Models (LLMs) rely on self-attention mechanisms to dynamically weigh semantic relationships across token sequences. However, quadratic computational complexity poses significant bottlenecks when processing ultra-long context windows during inference."`
  },
  {
    id: 'sql-generation',
    titleAr: 'توليد واستعلام قواعد البيانات SQL',
    titleEn: 'Advanced SQL Query & Analytics',
    category: 'sql',
    icon: Database,
    badgeColor: 'from-purple-600 to-violet-600',
    descriptionAr: 'كتابة استعلام تحليلي متقدم (Window Functions) لحساب معدل نمو المستخدمين والاحتفاظ.',
    descriptionEn: 'Write performant PostgreSQL queries using Common Table Expressions (CTEs) and Window Functions.',
    prompt: `Write a clean, performant PostgreSQL query using Common Table Expressions (CTEs) and Window Functions. 

Given tables:
- \`users(id, created_at, country)\`
- \`subscriptions(id, user_id, amount_cents, status, started_at, renewed_at)\`

Calculate:
1. Monthly Recurring Revenue (MRR) per country for the last 12 months.
2. Month-over-Month (MoM) MRR percentage growth.
3. Churn rate (subscriptions where status changed to 'cancelled' in that month).`
  },
  {
    id: 'text-summary',
    titleAr: 'تلخيص تنفيذي واستخراج نقاط القرار',
    titleEn: 'Executive Summary & Key Takeaways',
    category: 'summary',
    icon: FileText,
    badgeColor: 'from-amber-600 to-orange-600',
    descriptionAr: 'استخلاص أهم 5 نقاط تنفيذية وتوصيات استراتيجية في جدول مكثف من تقرير مطول.',
    descriptionEn: 'Extract the top 5 strategic decisions and risk mitigations into a concise executive briefing.',
    prompt: `قم بدور خبير استراتيجي في إدارة المنتجات والذكاء الاصطناعي. لخص التقرير التالي في:
1. موجز تنفيذي (Executive Summary) في فقرة واحدة مركزة.
2. جدول يضم أهم 5 قرارات ومخاطر استراتيجية (القرار، التأثير المتوقع، خطة تخفيف المخاطر).
3. الخطوة العملية الموصى بها للأسبوع القادم.`
  },
  {
    id: 'creative-copywriting',
    titleAr: 'كتابة إعلانية وتسويق إبداعي',
    titleEn: 'High-Conversion Creative Copy',
    category: 'creative',
    icon: PenTool,
    badgeColor: 'from-rose-600 to-pink-600',
    descriptionAr: 'صياغة 3 نسخ إعلانية جذابة (Hook, Story, Offer) لإطلاق ميزة ذكاء اصطناعي جديدة.',
    descriptionEn: 'Craft 3 high-converting ad copies (Hook, Story, Offer) for an AI platform launch campaign.',
    prompt: `اكتب 3 صيغ إعلانية مبتكرة عالية التحويل (High-Conversion Copywriting) لحملة إطلاق منصة عربية جديدة متخصصة في فهرسة واختبار نماذج الذكاء الاصطناعي العالمية.
لكل صيغة:
- العنوان الجذاب (Headline Hook)
- المشكلة والألم الحقيقي لدى المطورين/المستخدمين
- الحل المباشر وميزة المقارنة الحية (BYOK)
- دعوة صريحة للعمل (Call to Action - CTA)`
  }
];

/**
 * Safely loads history array from localStorage (Max 20 items)
 */
export function getStoredPlaygroundHistory(): PlaygroundHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage?.getItem(PLAYGROUND_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_HISTORY_ITEMS);
    }
  } catch (err) {
    console.warn('Failed to load playground history:', err);
  }
  return [];
}

/**
 * Adds an execution result to history (FIFO queue, max 20 items)
 */
export function addPlaygroundHistoryItem(
  prompt: string,
  modelId: string,
  responseContent: string,
  modelName?: string
): PlaygroundHistoryItem[] {
  if (!prompt || !prompt.trim() || !responseContent) return getStoredPlaygroundHistory();

  const current = getStoredPlaygroundHistory();
  const summary = responseContent.trim().slice(0, 140).replace(/\s+/g, ' ') + (responseContent.length > 140 ? '...' : '');

  const newItem: PlaygroundHistoryItem = {
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    prompt: prompt.trim(),
    modelId,
    modelName: modelName || modelId,
    responseSummary: summary
  };

  // Prepend new item and enforce maximum 20 items (FIFO)
  const updated = [newItem, ...current.filter((item) => item.prompt !== newItem.prompt)].slice(0, MAX_HISTORY_ITEMS);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage?.setItem(PLAYGROUND_HISTORY_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('playground-history-updated', { detail: { history: updated } }));
    } catch (err) {
      console.warn('Failed to write playground history:', err);
    }
  }

  return updated;
}

/**
 * Clears all playground history
 */
export function clearPlaygroundHistory(): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage?.removeItem(PLAYGROUND_HISTORY_KEY);
      window.dispatchEvent(new CustomEvent('playground-history-updated', { detail: { history: [] } }));
    } catch (err) {
      console.warn('Failed to clear playground history:', err);
    }
  }
}

interface PlaygroundHistoryProps {
  onSelectPrompt: (promptText: string) => void;
  activePrompt?: string;
}

export const PlaygroundHistory: React.FC<PlaygroundHistoryProps> = ({
  onSelectPrompt,
  activePrompt
}) => {
  const { t, language, direction, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'library' | 'history'>('library');
  const [historyItems, setHistoryItems] = useState<PlaygroundHistoryItem[]>(() => getStoredPlaygroundHistory());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e?.detail?.history) {
        setHistoryItems(e.detail.history);
      } else {
        setHistoryItems(getStoredPlaygroundHistory());
      }
    };

    window.addEventListener('playground-history-updated', handleUpdate);
    return () => window.removeEventListener('playground-history-updated', handleUpdate);
  }, []);

  const handleCopyPrompt = (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleClearHistory = () => {
    clearPlaygroundHistory();
    setHistoryItems([]);
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return t('history.justNow');
    if (diff < 3600) return t('history.minutesAgo', { count: Math.floor(diff / 60) });
    if (diff < 86400) return t('history.hoursAgo', { count: Math.floor(diff / 3600) });
    return new Date(timestamp).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3.5 ${isRTL ? 'text-right' : 'text-left'}`} dir={direction}>
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setActiveTab('library')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('history.tabTemplates', { count: CURATED_PROMPT_TEMPLATES.length })}</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{t('history.tabHistory', { count: historyItems.length })}</span>
            </button>
          </div>
        </div>

        {activeTab === 'history' && historyItems.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/30 transition cursor-pointer"
            title={t('history.clearHistory')}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('history.clearHistory')}</span>
          </button>
        )}
      </div>

      {/* Tab 1: Curated Template Library */}
      {activeTab === 'library' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {CURATED_PROMPT_TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon;
            const isCurrent = activePrompt === tmpl.prompt;
            const title = language === 'en' ? tmpl.titleEn : tmpl.titleAr;
            const subTitle = language === 'en' ? tmpl.titleAr : tmpl.titleEn;
            const desc = language === 'en' ? tmpl.descriptionEn : tmpl.descriptionAr;

            return (
              <div
                key={tmpl.id}
                onClick={() => onSelectPrompt(tmpl.prompt)}
                className={`group p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-purple-950/40 border-purple-500/60 shadow-md shadow-purple-500/10'
                    : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800 hover:border-purple-500/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${tmpl.badgeColor} flex items-center justify-center text-white text-xs shrink-0`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition-colors truncate">
                        {title}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleCopyPrompt(tmpl.id, tmpl.prompt, e)}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition shrink-0"
                      title={t('history.copyPrompt')}
                    >
                      {copiedId === tmpl.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                    {desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-purple-300 font-semibold">
                  <span className="truncate max-w-[150px]">{subTitle}</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-[-2px] transition-transform">
                    <span>{t('history.useTemplate')}</span>
                    {isRTL ? <ArrowLeft className="w-2.5 h-2.5" /> : <ArrowRight className="w-2.5 h-2.5" />}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Local Run History */}
      {activeTab === 'history' && (
        <div>
          {historyItems.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs space-y-1.5">
              <History className="w-8 h-8 text-slate-600 mx-auto stroke-1" />
              <p className="font-bold text-slate-400">{t('history.emptyHistoryTitle')}</p>
              <p className="text-[11px]">{t('history.emptyHistoryDesc')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectPrompt(item.prompt)}
                  className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="font-mono font-bold text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/20">
                        {item.modelName || item.modelId}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-slate-500" />
                        <span>{formatTimeAgo(item.timestamp)}</span>
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-200 line-clamp-1">
                      {item.prompt}
                    </p>

                    <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                      {t('history.modelReply', { summary: item.responseSummary })}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 pt-1">
                    <button
                      onClick={(e) => handleCopyPrompt(item.id, item.prompt, e)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title={t('history.copyPrompt')}
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
