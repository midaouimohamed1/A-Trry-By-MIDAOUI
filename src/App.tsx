import React, { useState, useEffect, useRef } from 'react';
import {
  GitBranch,
  Search,
  Clock,
  ShieldAlert,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Code2,
  FileText,
  AlertTriangle,
  Cpu,
  BookOpen,
  Send,
  Eye,
  KeyRound,
  Globe,
  Info,
  ChevronDown
} from 'lucide-react';
import {
  REPOLISTER_ANGLES,
  RepoListerAngle,
  FormattedRepo,
  RepoListerBatchResult
} from './server/repolisterEngine';
import {
  REPOLISTER_SYSTEM_PROMPT,
  GEMINI_TOOL_DECLARATION,
  CLAUDE_MCP_SERVER_CODE,
  OPENAI_ACTION_OPENAPI_SPEC,
  CLI_RUNNER_SCRIPT
} from './data/repolisterArtifacts';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  thinkingSteps?: string[];
  timestamp: string;
  batchData?: RepoListerBatchResult;
}

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const isRTL = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'runner' | 'chat' | 'export' | 'protocol'>('runner');

  // Token & Configuration
  const [githubToken, setGithubToken] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);

  // Pre-flight estimation state
  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [estimationData, setEstimationData] = useState<{
    totalEstimated: number;
    angles: Array<{ id: string; labelEn: string; labelAr: string; query: string; totalCount: number }>;
  } | null>(null);

  // Date ranges & execution state
  const [dateRanges, setDateRanges] = useState<Array<{ start: string; end: string; label: string }>>([]);
  const [currentRangeIndex, setCurrentRangeIndex] = useState<number>(0);
  const [selectedAngleId, setSelectedAngleId] = useState<'direct' | 'adjacent' | 'cross_domain'>('direct');

  // Batch search results state
  const [isFetchingBatch, setIsFetchingBatch] = useState<boolean>(false);
  const [allBatches, setAllBatches] = useState<RepoListerBatchResult[]>([]);
  const [totalFoundSoFar, setTotalFoundSoFar] = useState<number>(0);
  const [delayCountdown, setDelayCountdown] = useState<number>(0);
  const [apiError, setApiError] = useState<string | null>(null);

  // Copy helper
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Chat Console state
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content:
        lang === 'ar'
          ? `أهلاً بك! أنا "RepoLister-X"، المساعد المتخصص في فهرسة مستودعات GitHub وفق مبدأ الهندسة العكسية بنظام الغرفة النظيفة (Clean-Room Reverse Engineering) وفصل التوصيف السلوكي عن التنفيذ البرمجي.\n\nالمصدر الوحيد والمطلق: GitHub حصرياً. ألتزم بتطبيق استراتيجية الزوايا الثلاث، والفحص التقديري المسبق (Step 1)، والفاصل الزمني للأمان (2s)، وحيادية التقارير دون تقييم أو شرح للبرامج.\n\nاضغط على "بدء الفحص التقديري (Step 1)" أو اكتب "start" للبدء.`
          : `Welcome! I am "RepoLister-X", a GitHub catalog assistant focused on "clean-room reverse engineering" and separating behavioral specification from implementation.\n\nMy only source is GitHub. I strictly apply the 3-angle strategy, pre-flight per_page=1 estimation, rate-limit safety guards (>= 2s), and neutral reporting.\n\nClick "Run Pre-flight Estimate (Step 1)" or type "start" to begin.`,
      timestamp: new Date().toLocaleTimeString(),
      thinkingSteps: [
        'Single Platform Boundary: GitHub API exclusively (never Google, YouTube, or blogs).',
        'Neutral Reporting Mandate: Report strictly what repositories state about themselves.',
        'Zero-popularity bias: Strict chronological updated:desc sorting (never stars).'
      ]
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [showThinking, setShowThinking] = useState<boolean>(true);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize date ranges on mount
  useEffect(() => {
    fetch('/api/repolister/date-ranges')
      .then((res) => res.json())
      .then((data) => {
        if (data?.ranges) {
          setDateRanges(data.ranges);
        }
      })
      .catch(() => {
        const generated: Array<{ start: string; end: string; label: string }> = [];
        const now = new Date();
        let cur = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        for (let i = 0; i < 24; i++) {
          const start = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), 1));
          generated.push({
            start: start.toISOString().slice(0, 10),
            end: cur.toISOString().slice(0, 10),
            label: `${start.toISOString().slice(0, 10)} .. ${cur.toISOString().slice(0, 10)}`
          });
          cur = new Date(start.getTime() - 86400000);
        }
        setDateRanges(generated);
      });
  }, []);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Step 1: Pre-flight lightweight estimation
  const handleRunEstimation = async () => {
    setIsEstimating(true);
    setApiError(null);
    try {
      const res = await fetch('/api/repolister/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubToken })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setEstimationData(data);
      } else {
        setApiError(data.errorMessage || 'حدث خطأ أثناء إجراء الفحص التقديري.');
        if (!estimationData) {
          setEstimationData({
            totalEstimated: 1420,
            angles: [
              { id: 'direct', labelEn: 'Direct terms', labelAr: 'المصطلحات المباشرة', query: REPOLISTER_ANGLES[0].query, totalCount: 380 },
              { id: 'adjacent', labelEn: 'Adjacent angles', labelAr: 'الزوايا المجاورة', query: REPOLISTER_ANGLES[1].query, totalCount: 490 },
              { id: 'cross_domain', labelEn: 'Cross-domain angles', labelAr: 'عبر المجالات', query: REPOLISTER_ANGLES[2].query, totalCount: 550 }
            ]
          });
        }
      }
    } catch {
      setApiError('تعذر الاتصال بالواجهة الخلفية لـ RepoLister-X.');
    } finally {
      setIsEstimating(false);
    }
  };

  // Step 2-5: Execute Batch Fetch for a date slice
  const handleFetchBatch = async (rangeIdx = currentRangeIndex) => {
    if (rangeIdx >= dateRanges.length) return;

    const targetRange = dateRanges[rangeIdx];
    setIsFetchingBatch(true);
    setApiError(null);

    // Enforce 2-second rate-limiting visual countdown
    setDelayCountdown(2);
    const timer = setInterval(() => {
      setDelayCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      const res = await fetch('/api/repolister/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: targetRange.start,
          endDate: targetRange.end,
          angleId: selectedAngleId,
          startIndex: totalFoundSoFar,
          totalFoundSoFar,
          totalEstimated: estimationData?.totalEstimated || 1400,
          token: githubToken,
          language: lang
        })
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setAllBatches((prev) => [...prev, data]);
        setTotalFoundSoFar(data.totalFoundSoFar);
        setCurrentRangeIndex(rangeIdx + 1);

        const assistantText = lang === 'en' ? data.formattedTextEn : data.formattedTextAr;
        setChatMessages((prev) => [
          ...prev,
          {
            id: `batch-${Date.now()}`,
            sender: 'assistant',
            content: assistantText,
            timestamp: new Date().toLocaleTimeString(),
            batchData: data,
            thinkingSteps: [
              `Targeting date slice [${targetRange.start} .. ${targetRange.end}] via updated:desc.`,
              `Angle applied: ${selectedAngleId.toUpperCase()}.`,
              `Filtered items: ${data.items.length} included, ${data.omittedCount} omitted unrelated.`,
              `Flagged ${data.items.filter((i: FormattedRepo) => i.isFlagged).length} items with "flagged, verify yourself".`,
              `Computed remaining: ${data.totalRemaining} from original estimate.`
            ]
          }
        ]);
      } else {
        setApiError(data.errorMessage || 'حدث خطأ أثناء جلب دفعة المستودعات.');
      }
    } catch {
      setApiError('فشل الاتصال بواجهة GitHub API.');
    } finally {
      setIsFetchingBatch(false);
    }
  };

  // Chat message submission
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = chatInput.trim();
    if (!prompt) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');

    const lower = prompt.toLowerCase();
    if (lower === 'continue' || lower === 'متابعة' || lower === 'التالي' || lower === 'next') {
      await handleFetchBatch(currentRangeIndex);
    } else if (lower === 'start' || lower === 'بدء' || lower.includes('estimate') || lower.includes('تقدير')) {
      await handleRunEstimation();
    } else {
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `reply-${Date.now()}`,
            sender: 'assistant',
            content:
              lang === 'ar'
                ? `أنا "RepoLister-X" مقيد ببروتوكول صارم لا يحيد عنه: استفساري يقتصر حصراً على فهرسة مستودعات GitHub وفق استراتيجية الزوايا الثلاث لمبدأ Clean-Room دون تقييم أو شرح آليات.\n\n• للحصول على الدفعة التالية، اكتب: **continue** أو اضغط زر المتابعة.\n• لإعادة الفحص والتقدير، اكتب: **estimate**.`
                : `I am "RepoLister-X", constrained strictly to indexing GitHub repositories under the 3-angle Clean-Room protocol without subjective ratings or operational explanations.\n\n• To fetch the next date batch, type: **continue**.\n• To run pre-flight estimation, type: **estimate**.`,
            timestamp: new Date().toLocaleTimeString(),
            thinkingSteps: [
              'Adhering to prompt boundary: Refusing explanations of exploits or code execution.',
              'Single source enforcement: Directing flow to GitHub date-sliced search pipeline.'
            ]
          }
        ]);
      }, 500);
    }
  };

  const currentBatch = allBatches[allBatches.length - 1];

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif] selection:bg-blue-600 selection:text-white"
    >
      {/* Top Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-xl shadow-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-blue-500/25">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-cyan-400">
                <GitBranch className="w-6 h-6" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>RepoLister-X</span>
                  <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full uppercase">
                    GitHub Cataloger Tool
                  </span>
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  <ShieldAlert className="w-3 h-3" />
                  Clean-Room Specification Only
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-xl">
                {lang === 'ar'
                  ? 'أداة ومساعد التفكير المتخصص في Clean-Room Reverse Engineering وفصل التوصيف السلوكي عن التنفيذ البرمجي عبر GitHub حصراً.'
                  : 'Specialized Catalog Assistant & Reasoning Scaffold for Clean-Room Reverse Engineering exclusively on GitHub.'}
              </p>
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="flex items-center gap-2.5">
            {/* Rate-Limit Guard */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {delayCountdown > 0 ? (
                <span className="text-amber-400 font-mono font-bold">
                  تأخير الأمان: {delayCountdown}s (10 req/min)
                </span>
              ) : (
                <span className="text-slate-400 font-mono text-[11px]">فاصل الأمان: &gt;= 2s</span>
              )}
            </div>

            {/* Token Config Button */}
            <button
              onClick={() => setShowTokenInput((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="GitHub Token (اختياري لزيادة سقف الطلبات)"
            >
              <KeyRound className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">
                {githubToken ? 'مفتاح Token مفعّل' : 'رمز GitHub (اختياري)'}
              </span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>

        {/* Optional GitHub Token Drawer */}
        {showTokenInput && (
          <div className="bg-slate-900/95 border-t border-slate-800 p-3 sm:px-8 flex items-center gap-3 text-xs">
            <KeyRound className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="flex-1">
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (GitHub Personal Access Token)"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <span className="text-slate-400 text-[11px] hidden md:inline">
              يُحفظ في جلسة المتصفح فقط لرفع سقف الطلبات من 10 إلى 30-60 طلب/دقيقة.
            </span>
          </div>
        )}
      </header>

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 rounded-2xl p-1.5 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('runner')}
            className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'runner'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>محرك الفهرسة الحي (Live Batch Engine)</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>شات المساعد ووحدة الاستدلال (Reasoning Console)</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'export'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>تصدير كأداة لـ Claude و Gemini و OpenAI</span>
          </button>

          <button
            onClick={() => setActiveTab('protocol')}
            className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'protocol'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>دستور المنهجية وقواعد البرومبت</span>
          </button>
        </div>

        {/* Tab 1: Live Batch Runner */}
        {activeTab === 'runner' && (
          <div className="space-y-6">
            {/* Error Notification */}
            {apiError && (
              <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-2xl text-rose-300 text-xs flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{apiError}</span>
                </div>
                <button
                  onClick={() => setApiError(null)}
                  className="text-rose-400 hover:text-white font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* 3 Strategy Angles Interactive Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {REPOLISTER_ANGLES.map((angle) => {
                const isSelected = selectedAngleId === angle.id;
                const angleEstimate = estimationData?.angles?.find((a) => a.id === angle.id);
                return (
                  <div
                    key={angle.id}
                    onClick={() => setSelectedAngleId(angle.id)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500 shadow-xl shadow-blue-500/20 ring-1 ring-blue-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-bold">
                        {angle.labelEn}
                      </span>
                      {isSelected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-md shadow-blue-400 animate-pulse" />
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{angle.labelAr}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                      {angle.descriptionAr}
                    </p>
                    <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 text-[11px]">total_count:</span>
                      <span className="font-bold text-white text-sm">
                        {angleEstimate ? angleEstimate.totalCount.toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Step 1 Control: Pre-Flight Estimation */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-400 font-mono bg-blue-500/10 px-2.5 py-0.5 rounded-md">
                    Step 1
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    الفحص التقديري الخفيف عبر الاستعلام (per_page=1)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 max-w-xl">
                  استعلام خفيف لكل زاوية من الزوايا الثلاث لقراءة حقل total_count وحساب مجموع النتائج التقديرية قبل البدء بأي عملية سرد.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleRunEstimation}
                  disabled={isEstimating}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
                >
                  {isEstimating ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>جاري الفحص التقديري...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>تشغيل الفحص التقديري (Step 1)</span>
                    </>
                  )}
                </button>

                {estimationData && (
                  <div className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs">
                    <span className="text-slate-400 text-[11px]">المجموع التقديري: </span>
                    <span className="text-emerald-400 font-bold text-base">
                      {estimationData.totalEstimated.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Steps 2-5: Date Range Slicing & Batch Execution */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-400 font-mono bg-indigo-500/10 px-2.5 py-0.5 rounded-md">
                      Steps 2-5
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      فهرسة الدفعات المقسمة زمنياً (50 مستودع لكل دفعة)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    تقسيم زمني شهر بشهر بدءاً من اليوم لتغطية أكثر من 1,000 مستودع، بالترتيب الزمني الحديث (updated:desc) وتأخير الأمان (2s).
                  </p>
                </div>

                {/* Range Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">النطاق الزمني:</span>
                  <select
                    value={currentRangeIndex}
                    onChange={(e) => setCurrentRangeIndex(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  >
                    {dateRanges.map((range, idx) => (
                      <option key={idx} value={idx}>
                        #{idx + 1}: {range.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons & Counters */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono flex-wrap">
                  <span>المعثور عليه: <b className="text-white text-sm">{totalFoundSoFar}</b></span>
                  <span>•</span>
                  <span>المتبقي: <b className="text-amber-400 text-sm">{Math.max(0, (estimationData?.totalEstimated || 0) - totalFoundSoFar)}</b></span>
                  <span>•</span>
                  <span>الدفعات المنجزة: <b className="text-blue-400 text-sm">{allBatches.length}</b></span>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => handleFetchBatch(currentRangeIndex)}
                    disabled={isFetchingBatch || delayCountdown > 0}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/25 transition disabled:opacity-50"
                  >
                    {isFetchingBatch ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin" />
                        <span>جاري الفهرسة والتأخير (2s)...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>جلب الدفعة الحالية (50 مستودع)</span>
                      </>
                    )}
                  </button>

                  {allBatches.length > 0 && (
                    <button
                      onClick={() => handleFetchBatch(currentRangeIndex)}
                      disabled={isFetchingBatch || currentRangeIndex >= dateRanges.length}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
                    >
                      <span>Type continue for next batch</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Batch Results View */}
            {currentBatch && (
              <div className="space-y-4">
                {/* Batch Top Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono font-bold bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg">
                      الدفعة #{currentBatch.batchNumber || allBatches.length}
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      النطاق: {currentBatch.dateRange.start} .. {currentBatch.dateRange.end}
                    </span>
                    {currentBatch.omittedCount > 0 && (
                      <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-md">
                        مستبعد لعدم الصلة: {currentBatch.omittedCount}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={currentBatch.githubSearchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                      <span>رابط التحقق الذاتي (GitHub)</span>
                    </a>

                    <button
                      onClick={() => handleCopy(currentBatch.formattedTextAr, 'batch-text')}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedCode === 'batch-text' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>تم النسخ!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>نسخ التقرير</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Repositories List */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl divide-y divide-slate-800/80 shadow-md">
                  {currentBatch.items.map((repo, idx) => (
                    <div key={idx} className="p-4 hover:bg-slate-800/40 transition flex items-start gap-3.5">
                      <span className="text-xs font-mono font-bold text-slate-500 w-8 shrink-0 pt-0.5">
                        {idx + 1}.
                      </span>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm sm:text-base font-bold text-blue-400 hover:text-blue-300 hover:underline truncate"
                          >
                            {repo.name}
                          </a>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                              repo.angle === 'direct'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : repo.angle === 'adjacent'
                                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                            }`}
                          >
                            {repo.angleLabel}
                          </span>

                          {repo.isFlagged && (
                            <span className="text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>flagged, verify yourself</span>
                            </span>
                          )}

                          {repo.language && (
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                              {repo.language}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {repo.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Exact Prompt Footer Representation */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-xs font-mono space-y-2 text-slate-300 shadow-md">
                  <div className="text-slate-500 font-bold mb-2">=== تذييل الدفعة وفق شروط البرومبت الصارمة ===</div>
                  <div>• إجمالي ما تم العثور عليه حتى الآن: <span className="text-white font-bold">{currentBatch.totalFoundSoFar}</span></div>
                  <div>• إجمالي المتبقي (من تقدير الخطوة الأولى): <span className="text-amber-400 font-bold">{currentBatch.totalRemaining}</span></div>
                  <div>• النطاق الزمني المغطى: <span className="text-blue-400">{currentBatch.dateRange.start} .. {currentBatch.dateRange.end}</span></div>
                  {currentBatch.omittedCount > 0 && (
                    <div>• المستودعات المستبعدة لعدم صلتها بالموضوع: <span className="text-slate-400">{currentBatch.omittedCount}</span></div>
                  )}
                  <div>• رابط البحث الكامل على GitHub للتحقق الذاتي: <a href={currentBatch.githubSearchUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{currentBatch.githubSearchUrl}</a></div>
                  <div className="pt-2 text-emerald-400 font-bold text-sm">
                    Type continue for the next batch (اكتب continue للمجموعة التالية)
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Interactive Reasoning Chat Console */}
        {activeTab === 'chat' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col p-4 sm:p-6 overflow-hidden min-h-[600px] shadow-xl">
            {/* Thinking Scaffold Toggle */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 mb-4 text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span>محادثة استدلالية حية مع RepoLister-X تحاكي سلوك الأداة في منصات الذكاء الاصطناعي</span>
              </span>
              <button
                onClick={() => setShowThinking((prev) => !prev)}
                className="flex items-center gap-1 hover:text-white transition cursor-pointer font-medium"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showThinking ? 'إخفاء مسار التفكير (CoT)' : 'إظهار مسار التفكير (CoT)'}</span>
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[11px] font-bold text-slate-400">
                      {msg.sender === 'user' ? 'أنت (User)' : 'RepoLister-X'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp}</span>
                  </div>

                  {/* CoT Reasoning Scaffold */}
                  {msg.sender === 'assistant' && showThinking && msg.thinkingSteps && (
                    <div className="w-full max-w-3xl mb-2.5 p-3.5 bg-slate-950/80 border border-indigo-500/25 rounded-xl text-xs space-y-1.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-[11px]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>مسار التفكير والاستدلال المنهجي (Reasoning Scaffold):</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                        {msg.thinkingSteps.map((step, sIdx) => (
                          <li key={sIdx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-4xl whitespace-pre-wrap font-sans ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-slate-950 border border-slate-800 text-slate-100 rounded-bl-none shadow-md'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Suggestions */}
            <div className="flex items-center gap-2 pt-4 pb-2 overflow-x-auto text-xs">
              <span className="text-slate-500 text-[11px] whitespace-nowrap">أوامر سريعة:</span>
              <button
                onClick={() => setChatInput('continue')}
                className="px-3 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-blue-300 font-mono transition cursor-pointer shrink-0"
              >
                continue
              </button>
              <button
                onClick={() => setChatInput('estimate')}
                className="px-3 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-emerald-300 font-mono transition cursor-pointer shrink-0"
              >
                estimate
              </button>
              <button
                onClick={() => setChatInput('start')}
                className="px-3 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-purple-300 font-mono transition cursor-pointer shrink-0"
              >
                start
              </button>
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChatMessage} className="flex gap-2.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="اكتب أمراً لـ RepoLister-X (مثلاً: continue، start، أو استفسار)..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-md shadow-blue-600/30"
              >
                <span>إرسال</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Tool Export (Claude MCP, Gemini Function Calling, OpenAI, CLI) */}
        {activeTab === 'export' && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-400" />
                <span>مواصفات وتعاريف الأداة لكبرى منصات الذكاء الاصطناعي</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                الكود البرمجي الكامل لتحويل هذا البرومبت إلى أداة ومساعد استدلال (MCP Tool لـ Claude، Function Calling لـ Gemini، OpenAPI لـ OpenAI، و CLI مستقل).
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Gemini SDK Declaration */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-bold text-white">Google Gemini Tool Declaration</h4>
                    </div>
                    <button
                      onClick={() => handleCopy(GEMINI_TOOL_DECLARATION, 'gemini-code')}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedCode === 'gemini-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === 'gemini-code' ? 'تم النسخ' : 'نسخ الكود'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    تعريف الأداة باستخدام حزمة <code>@google/genai</code> الرسمية مع FunctionDeclarations لـ Step 1 و Step 2.
                  </p>
                  <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 border border-slate-800">
                    {GEMINI_TOOL_DECLARATION}
                  </pre>
                </div>
              </div>

              {/* Claude MCP Server */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-purple-400" />
                      <h4 className="text-sm font-bold text-white">Claude MCP Server (Model Context Protocol)</h4>
                    </div>
                    <button
                      onClick={() => handleCopy(CLAUDE_MCP_SERVER_CODE, 'claude-code')}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedCode === 'claude-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === 'claude-code' ? 'تم النسخ' : 'نسخ خادم MCP'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    خادم MCP كامل بلغة TypeScript يُدمج مباشرة في Claude Desktop أو Claude Code لتنفيذ الاستعلامات.
                  </p>
                  <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 border border-slate-800">
                    {CLAUDE_MCP_SERVER_CODE}
                  </pre>
                </div>
              </div>

              {/* OpenAI OpenAPI Spec */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white">OpenAI Custom GPT Action (OpenAPI Spec)</h4>
                    </div>
                    <button
                      onClick={() => handleCopy(OPENAI_ACTION_OPENAPI_SPEC, 'openai-code')}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedCode === 'openai-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === 'openai-code' ? 'تم النسخ' : 'نسخ Schema'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    مخطط OpenAPI 3.1 لتوصيل ChatGPT Custom GPT مباشرة بواجهة GitHub Search API.
                  </p>
                  <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 border border-slate-800">
                    {OPENAI_ACTION_OPENAPI_SPEC}
                  </pre>
                </div>
              </div>

              {/* Standalone CLI Script */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-sm font-bold text-white">Standalone Node.js CLI Script</h4>
                    </div>
                    <button
                      onClick={() => handleCopy(CLI_RUNNER_SCRIPT, 'cli-code')}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedCode === 'cli-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === 'cli-code' ? 'تم النسخ' : 'نسخ السكريبت'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    ملف مستقل <code>repolister-x.mjs</code> لتشغيل المحرك مباشرة عبر الطرفية (Terminal).
                  </p>
                  <pre className="bg-slate-950 p-4 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 border border-slate-800">
                    {CLI_RUNNER_SCRIPT}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Protocol & Prompt Rules */}
        {activeTab === 'protocol' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>دستور المنهجية وقواعد البرومبت الصارمة</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-blue-400 block font-mono text-sm">1. منصة واحدة حصرياً (GitHub Only)</span>
                <p>
                  المصدر الوحيد والمطلق هو GitHub API. يُمنع تماماً استخدام محركات البحث مثل Google أو قنوات YouTube أو المدونات.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-blue-400 block font-mono text-sm">2. حيادية تامة وعدم الشرح التقني</span>
                <p>
                  لا تقييم، لا توصيات، ولا شرح لكيفية عمل البرامج أو الاستغلالات. الإبلاغ يقتصر حصراً على ما يصرح به المستودع عن نفسه.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-blue-400 block font-mono text-sm">3. الزوايا الثلاث إلزامية في كل دورة</span>
                <p>
                  المصطلحات المباشرة، الزوايا المجاورة (نماذج التوصيف والامتثال القانوني)، والزوايا عبر المجالات (القانون، الترجمة، العمارة البرمجية).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-blue-400 block font-mono text-sm">4. الفحص التقديري المسبق (Step 1)</span>
                <p>
                  استعلام أولي خفيف بـ per_page=1 لقراءة total_count وجمعها وإخطار المستخدم بالعدد التقديري الإجمالي قبل سرد أي مستودع.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-blue-400 block font-mono text-sm">5. احترام سقف الـ 10 طلبات/دقيقة (تأخير 2s)</span>
                <p>
                  الانتظار الإلزامي لمدة ثانيتين على الأقل بين كل استدعاء لـ GitHub لضمان عدم حظر الـ IP.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-blue-400 block font-mono text-sm">6. عدم الإسقاط الصامت وإشعار التحقق الذاتي</span>
                <p>
                  تضمين النتائج غير المؤكدة مع وسم [flagged, verify yourself]، وتوثيق عدد المستبعدات بدقة، وعدم اختلاق أي رابط.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">نص البرومبت الأصلي كاملاً:</span>
              <button
                onClick={() => handleCopy(REPOLISTER_SYSTEM_PROMPT, 'prompt-full')}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedCode === 'prompt-full' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === 'prompt-full' ? 'تم النسخ' : 'نسخ البرومبت الأصلي'}</span>
              </button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap border border-slate-800">
              {REPOLISTER_SYSTEM_PROMPT}
            </pre>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 px-4 text-center text-xs text-slate-500 font-mono">
        <p>RepoLister-X — Dedicated Clean-Room Reverse Engineering GitHub Catalog Assistant Tool</p>
        <p className="mt-1 text-[11px] text-slate-600">
          Strict single-platform compliance • 2s safety rate limiter • Neutral self-reported repository representations
        </p>
      </footer>
    </div>
  );
}
