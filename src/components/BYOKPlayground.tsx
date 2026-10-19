import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  SUPPORTED_PROVIDERS,
  TEST_PROMPT_PRESETS,
  executePromptOnModel
} from '../data/playgroundData';
import { API_TESTER_SNIPPETS } from '../data/codeSnippets';
import { debounceAsync } from '../utils/debounceAsync';
import { encryptApiKey, decryptApiKey } from '../utils/crypto';
import { normalizeAIError } from '../utils/errorNormalizer';
import {
  calculateAggregateRunCost,
  estimateTokensCount,
  formatUSD,
  SlotCostEstimate
} from '../utils/tokenCostEstimator';
import { PlaygroundHistory, addPlaygroundHistoryItem } from './PlaygroundHistory';
import { AnalyticsTracker } from '../utils/analyticsTracker';
import { useLanguage } from '../hooks/useLanguage';
import {
  SupportedProvider,
  PlaygroundExecutionResult
} from '../types';
import {
  Terminal,
  Play,
  Key,
  ShieldCheck,
  Zap,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  RotateCcw,
  Copy,
  Check,
  X,
  Info,
  Sliders,
  Layers,
  Code2,
  DollarSign,
  Coins,
  Activity,
  FileText,
  Globe
} from 'lucide-react';

function validateKeyFormat(provider: SupportedProvider, key: string): { isValid: boolean; helperText: string } {
  if (!key || !key.trim()) return { isValid: false, helperText: 'المفتاح غير مدخل' };
  const val = key.trim();
  switch (provider) {
    case 'openai':
      return { isValid: val.startsWith('sk-'), helperText: val.startsWith('sk-') ? 'صيغة صحيحة (sk-...)' : 'يجب أن يبدأ بـ sk-' };
    case 'anthropic':
      return { isValid: val.startsWith('sk-ant-'), helperText: val.startsWith('sk-ant-') ? 'صيغة صحيحة (sk-ant-...)' : 'يجب أن يبدأ بـ sk-ant-' };
    case 'gemini':
      return { isValid: val.startsWith('AIzaSy') || val.length > 20, helperText: val.startsWith('AIzaSy') ? 'صيغة صحيحة (AIzaSy...)' : 'مفتاح صالح' };
    case 'groq':
      return { isValid: val.startsWith('gsk_'), helperText: val.startsWith('gsk_') ? 'صيغة صحيحة (gsk_...)' : 'يجب أن يبدأ بـ gsk_' };
    case 'huggingface':
      return { isValid: val.startsWith('hf_'), helperText: val.startsWith('hf_') ? 'صيغة صحيحة (hf_...)' : 'يجب أن يبدأ بـ hf_' };
    case 'openrouter':
      return { isValid: val.startsWith('sk-or-') || val.startsWith('sk-'), helperText: val.startsWith('sk-or-') ? 'صيغة صحيحة (sk-or-...)' : 'مفتاح صالح' };
    case 'deepseek':
      return { isValid: val.startsWith('sk-'), helperText: val.startsWith('sk-') ? 'صيغة صحيحة (sk-...)' : 'يبدأ بـ sk-' };
    default:
      return { isValid: val.length > 10, helperText: 'طول المفتاح مناسب' };
  }
}

interface ModelSlotConfig {
  id: string;
  provider: SupportedProvider;
  modelId: string;
  modelName: string;
}

interface BYOKPlaygroundProps {
  onClose?: () => void;
  onSelectModelRank?: (rank: number) => void;
}

export const BYOKPlayground: React.FC<BYOKPlaygroundProps> = ({
  onClose,
  onSelectModelRank
}) => {
  const { t, language, direction, isRTL, formatNumber } = useLanguage();

  // Key Persistence Storage Mode: 'session' (sessionStorage) vs 'memory' (pure closure RAM, zero web storage)
  const [persistenceMode, setPersistenceMode] = useState<'session' | 'memory'>(() => {
    try {
      const savedMode = sessionStorage.getItem('byok_storage_mode');
      return savedMode === 'memory' ? 'memory' : 'session';
    } catch {
      return 'session';
    }
  });

  // Session-only or Memory-only API Keys entered by the user (BYOK: Bring Your Own Key)
  const [apiKeys, setApiKeys] = useState<Record<SupportedProvider, string>>({
    huggingface: '',
    openrouter: '',
    openai: '',
    anthropic: '',
    gemini: '',
    groq: '',
    deepseek: ''
  });

  // Hydrate encrypted keys from sessionStorage asynchronously
  useEffect(() => {
    async function hydrateEncryptedKeys() {
      try {
        const encryptedBundle = sessionStorage.getItem('user_byok_keys_enc');
        if (encryptedBundle) {
          const parsed: Record<string, string> = JSON.parse(encryptedBundle);
          const decrypted: Record<SupportedProvider, string> = {
            huggingface: '',
            openrouter: '',
            openai: '',
            anthropic: '',
            gemini: '',
            groq: '',
            deepseek: ''
          };
          for (const [prov, cipher] of Object.entries(parsed)) {
            if (prov in decrypted) {
              decrypted[prov as SupportedProvider] = await decryptApiKey(cipher);
            }
          }
          setApiKeys(decrypted);
          return;
        }

        // Fallback check for legacy unencrypted session
        const legacySaved = sessionStorage.getItem('user_byok_keys');
        if (legacySaved) {
          const parsed = JSON.parse(legacySaved);
          setApiKeys((prev) => ({ ...prev, ...parsed }));
          sessionStorage.removeItem('user_byok_keys'); // Upgrade to encrypted
        }
      } catch (err) {
        console.warn('Could not decrypt session keys:', err);
      }
    }

    if (persistenceMode === 'session') {
      hydrateEncryptedKeys();
    }
  }, [persistenceMode]);

  // Active in-flight AbortController ref to cancel network requests on unmount or re-run
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  // Prompt input & test parameters
  const [prompt, setPrompt] = useState<string>(
    'Write a clean TypeScript utility function to debounce an async operation with immediate trigger option and explain your solution briefly.'
  );
  const [temperature, setTemperature] = useState<number>(0.7);
  const [projectedOutputTokens, setProjectedOutputTokens] = useState<number>(350);

  // 3 Slots for side-by-side comparison
  const [slots, setSlots] = useState<ModelSlotConfig[]>([
    {
      id: 'slot-1',
      provider: 'gemini',
      modelId: 'gemini-3.5-flash',
      modelName: 'Gemini 3.5 Flash (فائق السرعة)'
    },
    {
      id: 'slot-2',
      provider: 'huggingface',
      modelId: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      modelName: 'Llama 3.3 70B Instruct Turbo'
    },
    {
      id: 'slot-3',
      provider: 'gemini',
      modelId: 'gemini-3.7-flash',
      modelName: 'Gemini 3.7 Flash (استدلال متقدم)'
    }
  ]);

  // Live Token & Cost Calculations
  const tokenStats = useMemo(() => estimateTokensCount(prompt), [prompt]);
  const costSummary = useMemo(
    () => calculateAggregateRunCost(slots, prompt, projectedOutputTokens),
    [slots, prompt, projectedOutputTokens]
  );

  // Execution Results & status
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<Record<string, PlaygroundExecutionResult>>({});
  const [copiedSlot, setCopiedSlot] = useState<string | null>(null);
  const [showKeyInfoModal, setShowKeyInfoModal] = useState<boolean>(false);
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [activeCodeLang, setActiveCodeLang] = useState<string>('Python');
  const [codeCopied, setCodeCopied] = useState<boolean>(false);
  const [showAllProviders, setShowAllProviders] = useState<boolean>(true);

  // Helper to persist encrypted bundle to sessionStorage
  const persistEncryptedKeys = async (keys: Record<SupportedProvider, string>) => {
    if (persistenceMode !== 'session') return;
    try {
      const encryptedBundle: Record<string, string> = {};
      for (const [prov, val] of Object.entries(keys)) {
        if (val) {
          encryptedBundle[prov] = await encryptApiKey(val);
        }
      }
      sessionStorage.setItem('user_byok_keys_enc', JSON.stringify(encryptedBundle));
    } catch (e) {
      console.warn('Failed to encrypt session keys:', e);
    }
  };

  // Save in temporary session storage (or clear if in pure RAM mode)
  const handleKeyChange = (provider: SupportedProvider, value: string) => {
    setApiKeys((prev) => {
      const updated = { ...prev, [provider]: value };
      persistEncryptedKeys(updated);
      return updated;
    });
  };

  const handleTogglePersistenceMode = (mode: 'session' | 'memory') => {
    setPersistenceMode(mode);
    try {
      sessionStorage.setItem('byok_storage_mode', mode);
      if (mode === 'memory') {
        sessionStorage.removeItem('user_byok_keys');
        sessionStorage.removeItem('user_byok_keys_enc');
      } else {
        persistEncryptedKeys(apiKeys);
      }
    } catch {}
  };

  const handleSlotProviderChange = (slotId: string, newProvider: SupportedProvider) => {
    const providerConfig = SUPPORTED_PROVIDERS.find((p) => p.id === newProvider);
    if (!providerConfig || providerConfig.models.length === 0) return;
    const defaultModel = providerConfig.models[0];

    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              provider: newProvider,
              modelId: defaultModel.id,
              modelName: defaultModel.name
            }
          : s
      )
    );
  };

  const handleSlotModelChange = (slotId: string, newModelId: string) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const providerConfig = SUPPORTED_PROVIDERS.find((p) => p.id === s.provider);
        const modelObj = providerConfig?.models.find((m) => m.id === newModelId);
        return {
          ...s,
          modelId: newModelId,
          modelName: modelObj ? modelObj.name : newModelId
        };
      })
    );
  };

  // Raw parallel comparison execution function with active AbortSignal
  const runParallelComparison = async (
    currentSlots: ModelSlotConfig[],
    currentKeys: Partial<Record<SupportedProvider, string>>,
    currentPrompt: string,
    currentTemp: number,
    signal?: AbortSignal
  ): Promise<Record<string, PlaygroundExecutionResult>> => {
    const promises = currentSlots.map(async (slot) => {
      const apiKey = currentKeys[slot.provider];
      const res = await executePromptOnModel(
        slot.provider,
        slot.modelId,
        slot.modelName,
        apiKey || '',
        currentPrompt,
        currentTemp,
        signal
      );
      return { slotId: slot.id, result: res };
    });

    const settledResults = await Promise.all(promises);
    const updatedMap: Record<string, PlaygroundExecutionResult> = {};
    settledResults.forEach(({ slotId, result }) => {
      updatedMap[slotId] = result;
    });
    return updatedMap;
  };

  // Clean up any in-flight network requests and debounce timers on component unmount
  useEffect(() => {
    return () => {
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
        activeAbortControllerRef.current = null;
      }
    };
  }, []);

  // Run all active slots with AbortController safety and cancel on unmount
  const handleRunComparison = async () => {
    if (!prompt.trim()) return;

    // Abort previous in-flight run if still active
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;

    setIsRunning(true);
    const initialLoadingState: Record<string, PlaygroundExecutionResult> = {};

    slots.forEach((slot) => {
      initialLoadingState[slot.id] = {
        modelId: slot.modelId,
        modelName: slot.modelName,
        provider: slot.provider,
        latencyMs: 0,
        status: 'loading',
        responseContent: ''
      };
    });
    setResults(initialLoadingState);

    try {
      const finalResults = await runParallelComparison(
        slots,
        apiKeys,
        prompt,
        temperature,
        abortController.signal
      );
      if (finalResults && !abortController.signal.aborted) {
        setResults((prev) => ({
          ...prev,
          ...finalResults
        }));

        // Track token consumption in analytics
        Object.values(finalResults).forEach((res) => {
          if (res.status === 'success') {
            AnalyticsTracker.logTokenUsage({
              provider: res.provider,
              modelId: res.modelId,
              modelName: res.modelName,
              promptTokens: res.tokensUsed?.promptTokens || tokenStats.totalTokens,
              completionTokens: res.tokensUsed?.completionTokens || 0,
              totalTokens: res.tokensUsed?.totalTokens || tokenStats.totalTokens,
              estimatedCostUSD: 0,
              latencyMs: res.latencyMs,
              status: 'success'
            });
          }
        });

        // Persist the run to local playground history (Feature 1)
        const successfulSlot = slots.find((s) => finalResults[s.id]?.status === 'success');
        if (successfulSlot && finalResults[successfulSlot.id]?.responseContent) {
          addPlaygroundHistoryItem(
            prompt,
            successfulSlot.modelId,
            finalResults[successfulSlot.id].responseContent,
            successfulSlot.modelName
          );
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Comparison execution error:', err);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsRunning(false);
      }
    }
  };

  const handleCopyResult = (slotId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedSlot(slotId);
    setTimeout(() => setCopiedSlot(null), 2000);
  };

  const activeProviders: SupportedProvider[] = Array.from(new Set(slots.map((s) => s.provider)));
  const displayedProviders = showAllProviders
    ? SUPPORTED_PROVIDERS.map((p) => p.id)
    : activeProviders;

  return (
    <div
      id="byok-playground"
      className={`bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-md mb-8 text-white ${isRTL ? 'text-right' : 'text-left'}`}
      dir={direction}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 shrink-0">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 flex-wrap">
              <span>{t('playground.title')}</span>
              <span className="text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                {t('playground.tagline')}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {t('playground.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowCodeModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 text-xs font-bold transition-colors border border-purple-500/40 shadow-sm cursor-pointer"
          >
            <Code2 className="w-4 h-4 text-purple-400" />
            <span>{t('playground.codeTesterBtn')}</span>
          </button>
          <button
            onClick={() => setShowKeyInfoModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors border border-slate-700 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t('playground.securityPolicyBtn')}</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Security Banner */}
      <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs my-4">
        <div className="flex items-center gap-2 text-emerald-300">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>
            {t('playground.securityNote')}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center bg-slate-900 border border-slate-700 p-0.5 rounded-lg text-[10px]">
            <button
              onClick={() => handleTogglePersistenceMode('session')}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                persistenceMode === 'session'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('playground.sessionStorageBtn')}
            </button>
            <button
              onClick={() => handleTogglePersistenceMode('memory')}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                persistenceMode === 'memory'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('playground.memoryOnlyBtn')}
            </button>
          </div>
          <span className="text-[10px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">
            {t('playground.owaspCompliant')}
          </span>
        </div>
      </div>

      {/* API Keys Configuration Panel */}
      <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-300">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <span>{t('playground.byokTitle')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAllProviders(!showAllProviders)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
            >
              {showAllProviders ? t('playground.showActiveOnly') : t('playground.showAllProviders')}
            </button>
            <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
              {t('playground.recommendationNote')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedProviders.map((providerId) => {
            const provider = SUPPORTED_PROVIDERS.find((p) => p.id === providerId)!;
            const keyVal = apiKeys[providerId] || '';
            const hasKey = !!keyVal.trim();
            const formatCheck = validateKeyFormat(providerId, keyVal);

            return (
              <div key={providerId} className="space-y-1 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    {provider.name}
                    {hasKey && formatCheck.isValid && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30 font-sans">
                        {t('playground.validKey')}
                      </span>
                    )}
                  </span>
                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-0.5 text-[10px]"
                  >
                    <span>{t('playground.getKeyLink')}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKeys[providerId]}
                    onChange={(e) => handleKeyChange(providerId, e.target.value)}
                    placeholder={provider.keyPlaceholder}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white placeholder:text-slate-600 focus:border-purple-500 outline-hidden font-mono"
                    dir="ltr"
                  />
                  {hasKey ? (
                    formatCheck.isValid ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    )
                  ) : (
                    <Key className="w-3.5 h-3.5 text-slate-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                {hasKey && (
                  <div className={`text-[10px] ${formatCheck.isValid ? 'text-emerald-400/80' : 'text-amber-400/90'} flex items-center gap-1`}>
                    <span>{formatCheck.helperText}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Prompt Editor & Presets */}
      <div className="space-y-3 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>{t('playground.commonPromptLabel')}</span>
          </label>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-slate-400 font-medium ml-1 shrink-0">{t('playground.quickPresetsLabel')}</span>
            {TEST_PROMPT_PRESETS.map((preset) => {
              const presetTitle = language === 'en' && (preset as any).titleEn ? (preset as any).titleEn : preset.titleAr;
              return (
                <button
                  key={preset.id}
                  onClick={() => setPrompt(preset.prompt)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                >
                  {presetTitle}
                </button>
              );
            })}
          </div>
        </div>

        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('playground.promptPlaceholder')}
          className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs text-white placeholder:text-slate-500 transition-all outline-hidden leading-relaxed"
          dir="auto"
        />

        {/* Feature 1: Local Playground History & Prompt Template Library */}
        <PlaygroundHistory
          onSelectPrompt={(selectedText) => setPrompt(selectedText)}
          activePrompt={prompt}
        />

        {/* Real-Time Token & Cost Estimator Bar (Feature 2) */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Left: Input Token Metrics */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 font-mono text-purple-300 font-bold bg-purple-950/50 border border-purple-500/30 px-2.5 py-1 rounded-xl">
                <Coins className="w-3.5 h-3.5 text-purple-400" />
                <span>{t('playground.inputTokensCount', { tokens: formatNumber(tokenStats.totalTokens) })}</span>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-slate-500" />
                <span>
                  {t('playground.charWordCount', { chars: formatNumber(tokenStats.charCount), words: formatNumber(tokenStats.wordCount) })}
                  {tokenStats.isArabicPredominant && (
                    <strong className="text-emerald-400 mr-1 ml-1">{t('playground.arabicNote')}</strong>
                  )}
                </span>
              </div>
            </div>

            {/* Right: Projected Output Selector & Total Cost */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span>{t('playground.expectedOutputTokens')}</span>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 font-mono">
                  {[150, 350, 750, 1500].map((tCount) => (
                    <button
                      key={tCount}
                      onClick={() => setProjectedOutputTokens(tCount)}
                      className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer ${
                        projectedOutputTokens === tCount
                          ? 'bg-purple-600 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ~{tCount}T
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold shadow-xs">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('playground.totalEstimatedCost', { cost: costSummary.formattedRunCostUSD })}</span>
              </div>
            </div>
          </div>

          {/* Per-Slot Cost Breakdown Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-900 text-[11px]">
            {costSummary.estimates.map((est, sIdx) => {
              const slotConfig = slots[sIdx];
              return (
                <div
                  key={est.slotId}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      #{sIdx + 1}
                    </span>
                    <span className="font-semibold text-slate-200 truncate max-w-[130px]" title={slotConfig.modelName}>
                      {slotConfig.modelName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 font-mono shrink-0">
                    {est.isFreeTier && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/30">
                        {t('playground.freeTierPlan')}
                      </span>
                    )}
                    <span className="text-purple-300 font-bold">
                      {est.formattedTotalUSD}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Run Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">{t('playground.temperatureLabel')}</span>
              <input
                type="number"
                min="0"
                max="1.5"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.7)}
                className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-purple-400 font-bold"
              />
            </div>
          </div>

          <button
            onClick={handleRunComparison}
            disabled={isRunning || !prompt.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30 disabled:opacity-50 disabled:pointer-events-none hover:scale-105 active:scale-95 cursor-pointer"
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t('playground.btnRunning')}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>{t('playground.btnRunComparison')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3 Model Output Comparison Slots */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {slots.map((slot, idx) => {
          const providerConfig = SUPPORTED_PROVIDERS.find((p) => p.id === slot.provider)!;
          const result = results[slot.id];
          const hasKey = !!apiKeys[slot.provider];

          return (
            <div
              key={slot.id}
              className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between"
            >
              {/* Slot Header & Selectors */}
              <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-600/20 text-purple-300 border border-purple-500/30">
                    {t('playground.slotModelBadge', { idx: String(idx + 1) })}
                  </span>
                  {result && (
                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                      <Clock className="w-3 h-3 text-blue-400" />
                      <span>{result.latencyMs}ms</span>
                    </div>
                  )}
                </div>

                {/* Provider Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={slot.provider}
                    onChange={(e) => handleSlotProviderChange(slot.id, e.target.value as SupportedProvider)}
                    className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 outline-hidden cursor-pointer"
                  >
                    {SUPPORTED_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name.split(' ')[0]}
                      </option>
                    ))}
                  </select>

                  {/* Model Selector */}
                  <select
                    value={slot.modelId}
                    onChange={(e) => handleSlotModelChange(slot.id, e.target.value)}
                    className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-white outline-hidden cursor-pointer"
                  >
                    {providerConfig.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Response Output Screen */}
              <div className="p-4 flex-1 flex flex-col justify-between min-h-[220px]">
                {result?.status === 'loading' ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3 py-8 text-center">
                    <div className="relative">
                      <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-200">{language === 'en' ? 'Dispatching request & streaming response...' : 'جاري إرسال الطلب ومعالجة الاستجابة...'}</div>
                      <div className="text-[11px] text-slate-500">{language === 'en' ? 'Direct cloud proxy transport encrypted' : 'الاتصال مؤمن عبر البروكسي السحابي'}</div>
                    </div>
                  </div>
                ) : result?.status === 'warming_up' ? (
                  <div className="flex-1 p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-amber-300">
                      <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                      <span>{t('playground.coldStartTitle')}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-200/90">
                      {result.warmupMessage || (language === 'en' ? 'Model is loading on free server instances. Cold start typically takes 15-30 seconds.' : 'النموذج قيد التحميل على سيرفرات Hugging Face السحابية المجانية. يستغرق التحميل عادة 15-30 ثانية لأول مرة.')}
                    </p>
                    <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[10px] text-amber-400/80">
                      <span>{t('playground.coldStartRetry', { count: String(result.retryCount || 1) })}</span>
                      <button
                        onClick={handleRunComparison}
                        className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition-colors cursor-pointer"
                      >
                        {t('playground.retryNow')}
                      </button>
                    </div>
                  </div>
                ) : result?.status === 'error' ? (
                  (() => {
                    const normErr = normalizeAIError(result.errorMessage, slot.provider, slot.modelName);
                    const errTitle = language === 'en' && normErr.titleEn ? normErr.titleEn : normErr.titleAr;
                    const errMessage = language === 'en' && normErr.messageEn ? normErr.messageEn : normErr.messageAr;
                    const errRecovery = language === 'en' && normErr.recoveryActionEn ? normErr.recoveryActionEn : normErr.recoveryActionAr;

                    return (
                      <div className="flex-1 p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs space-y-2.5">
                        <div className="font-bold flex items-center justify-between gap-1 text-rose-300">
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>{errTitle}</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/50 text-rose-300 font-mono">
                            {normErr.statusCategory}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-rose-200/95 font-sans">
                          {errMessage}
                        </p>
                        <div className="p-2 rounded-lg bg-slate-900/80 border border-rose-500/20 text-[11px] text-slate-300 space-y-1">
                          <div className="font-bold text-amber-300">💡 {language === 'en' ? 'Suggested Resolution:' : 'الحل المقترح:'}</div>
                          <div>{errRecovery}</div>
                        </div>
                        {normErr.providerDocUrl && (
                          <a
                            href={normErr.providerDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline"
                          >
                            <span>{language === 'en' ? 'Provider Dashboard & Keys' : 'لوحة تحكم المفاتيح والاشتراك'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {slot.provider !== 'gemini' && (
                          <div className="pt-1 border-t border-rose-500/20">
                            <button
                              onClick={() => {
                                handleSlotProviderChange(slot.id, 'gemini');
                                setTimeout(() => handleRunComparison(), 100);
                              }}
                              className="w-full py-1.5 px-2 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-300" />
                              <span>{t('playground.switchToGemini')}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : result?.status === 'success' ? (
                  <div className="flex-1 flex flex-col justify-between space-y-3">
                    {/* Caching / Grounding Badges */}
                    {(result.cached || result.groundingMetadata?.isGrounded) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {result.cached && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            <Zap className="w-3 h-3 text-emerald-400" />
                            <span>{t('playground.cachedZeroLatency')}</span>
                          </span>
                        )}
                        {result.groundingMetadata?.isGrounded && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-950/60 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                            <Globe className="w-3 h-3 text-blue-400" />
                            <span>{t('playground.liveGrounded')}</span>
                          </span>
                        )}
                      </div>
                    )}

                    <div
                      className="text-xs text-slate-200 leading-relaxed font-sans max-h-72 overflow-y-auto whitespace-pre-wrap select-text pr-1"
                      dir="auto"
                    >
                      {result.responseContent}
                    </div>

                    {/* Google Live Search Grounding Sources */}
                    {result.groundingMetadata?.isGrounded && result.groundingMetadata.searchChunks && result.groundingMetadata.searchChunks.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/20 text-[11px] text-slate-300 space-y-1.5">
                        <div className="font-bold text-blue-300 flex items-center gap-1">
                          <Globe className="w-3 h-3 text-blue-400" />
                          <span>{t('playground.groundingSources')}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {result.groundingMetadata.searchChunks.slice(0, 4).map((chunk, cIdx) => (
                            <a
                              key={cIdx}
                              href={chunk.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-blue-400 hover:underline border border-slate-700/60 text-[10px]"
                            >
                              <span className="truncate max-w-[140px]">{chunk.title || t('playground.sourceLink')}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata & Copy Bar */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                      <div className="font-mono">
                        {result.tokensUsed ? (
                          <span>
                            Tokens: {result.tokensUsed.promptTokens} in / {result.tokensUsed.completionTokens} out
                          </span>
                        ) : (
                          <span>{language === 'en' ? 'Completed Response' : 'استجابة مكتملة'}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleCopyResult(slot.id, result.responseContent)}
                        className="inline-flex items-center gap-1 text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {copiedSlot === slot.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSlot === slot.id ? t('playground.copiedBtn') : t('playground.copyBtn')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 text-xs py-6 px-3 space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                      <Key className="w-5 h-5 text-amber-400/80" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-300">
                        {!hasKey ? `${providerConfig.name.split(' ')[0]} ${t('playground.keyRequired')}` : t('playground.readyToTest')}
                      </div>
                      <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                        {!hasKey
                          ? t('playground.enterKeyPrompt')
                          : t('playground.readyToRunPrompt')}
                      </p>
                    </div>
                    {!hasKey && (
                      <a
                        href={providerConfig.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 border border-purple-500/30 text-[11px] font-medium transition-colors"
                      >
                        <span>{t('playground.getKeyFree')}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Key Info Security Modal */}
      {showKeyInfoModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowKeyInfoModal(false)}
        >
          <div
            className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-white space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}
            onClick={(e) => e.stopPropagation()}
            dir={direction}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{t('playground.securityModalTitle')}</span>
              </h3>
              <button
                onClick={() => setShowKeyInfoModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <p>
                {t('playground.securityModalP1')}
              </p>
              <p>
                {t('playground.securityModalP2')}
              </p>
              <p>
                {t('playground.securityModalP3')}
              </p>
            </div>
            <button
              onClick={() => setShowKeyInfoModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer"
            >
              {t('playground.understoodBtn')}
            </button>
          </div>
        </div>
      )}

      {/* OWASP Multi-language API Tester Code Modal */}
      {showCodeModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setShowCodeModal(false)}
        >
          <div
            className={`bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl text-white space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}
            onClick={(e) => e.stopPropagation()}
            dir={direction}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                    <span>{t('playground.codeModalTitle')}</span>
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Exponential Backoff &middot; UTF-8
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t('playground.codeModalSubtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1" dir="ltr">
              {API_TESTER_SNIPPETS.map((snippet) => (
                <button
                  key={snippet.language}
                  onClick={() => {
                    setActiveCodeLang(snippet.language);
                    setCodeCopied(false);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    activeCodeLang === snippet.language
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {snippet.language}
                </button>
              ))}
            </div>

            {/* Code Display Area */}
            {(() => {
              const currentSnippet =
                API_TESTER_SNIPPETS.find((s) => s.language === activeCodeLang) ||
                API_TESTER_SNIPPETS[0];

              const handleCopyCode = () => {
                navigator.clipboard.writeText(currentSnippet.code);
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 2500);
              };

              return (
                <div className="flex-1 flex flex-col min-h-0 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1" dir="ltr">
                    <span className="font-mono text-purple-300 font-bold">
                      📄 {currentSnippet.filename}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 shadow-sm cursor-pointer"
                    >
                      {codeCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">{t('playground.codeCopied')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-300" />
                          <span>{t('playground.copyFullCode')}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-[11px] leading-relaxed text-slate-200 whitespace-pre scrollbar-thin scrollbar-thumb-slate-800" dir="ltr">
                    {currentSnippet.code}
                  </div>
                </div>
              );
            })()}

            {/* Security checklist summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{t('playground.checkKeyIsolation')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-blue-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{t('playground.checkBackoff')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{t('playground.checkUtf8')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
