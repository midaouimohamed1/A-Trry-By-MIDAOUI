import React, { useState, useMemo } from 'react';
import { OFFICIAL_PRICING_TIERS, USAGE_PRESETS, UsagePreset } from '../data/pricingData';
import { CostCalculationResult, LLMPricingTier } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import {
  Calculator,
  DollarSign,
  TrendingDown,
  Sparkles,
  Zap,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  BarChart3,
  Sliders,
  Layers,
  ArrowUpDown,
  FileText,
  RotateCcw,
  Copy,
  Check
} from 'lucide-react';

interface CostCalculatorProps {
  onClose?: () => void;
  onSelectModelRank?: (rank: number) => void;
}

export const CostCalculator: React.FC<CostCalculatorProps> = ({
  onClose,
  onSelectModelRank
}) => {
  const { t, language, direction, isRTL, formatNumber } = useLanguage();

  // State for token inputs (in millions for easier input or exact numbers)
  const [inputMillions, setInputMillions] = useState<number>(20);
  const [outputMillions, setOutputMillions] = useState<number>(5);
  const [enablePromptCaching, setEnablePromptCaching] = useState<boolean>(false);
  const [cachingPercentage, setCachingPercentage] = useState<number>(50); // 50% cached
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Active preset tracker
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const handleApplyPreset = (preset: UsagePreset) => {
    setInputMillions(preset.monthlyInputTokens / 1_000_000);
    setOutputMillions(preset.monthlyOutputTokens / 1_000_000);
    setActivePresetId(preset.id);
  };

  // Perform Calculations for all tiers
  const calculationResults: CostCalculationResult[] = useMemo(() => {
    const totalInputM = Math.max(0, inputMillions);
    const totalOutputM = Math.max(0, outputMillions);

    return OFFICIAL_PRICING_TIERS.map((tier) => {
      let inputCost = 0;
      if (enablePromptCaching && tier.cachedInputPricePer1M !== undefined) {
        const cachedPortionM = totalInputM * (cachingPercentage / 100);
        const regularPortionM = totalInputM - cachedPortionM;
        inputCost =
          regularPortionM * tier.inputPricePer1M +
          cachedPortionM * tier.cachedInputPricePer1M;
      } else {
        inputCost = totalInputM * tier.inputPricePer1M;
      }

      const outputCost = totalOutputM * tier.outputPricePer1M;
      const totalMonthly = inputCost + outputCost;
      const totalAnnual = totalMonthly * 12;

      // Estimate requests assuming average 1,000 input + 300 output tokens per request
      const estimatedRequests = (totalInputM * 1_000_000) / 1000 || 1;
      const costPer1kRequests = (totalMonthly / estimatedRequests) * 1000;

      return {
        tier,
        monthlyInputCost: inputCost,
        monthlyOutputCost: outputCost,
        totalMonthlyCost: totalMonthly,
        totalAnnualCost: totalAnnual,
        costPer1kRequests: costPer1kRequests
      };
    }).sort((a, b) => a.totalMonthlyCost - b.totalMonthlyCost);
  }, [inputMillions, outputMillions, enablePromptCaching, cachingPercentage]);

  // Filtered by category
  const filteredResults = useMemo(() => {
    if (selectedCategoryFilter === 'All') return calculationResults;
    return calculationResults.filter(
      (r) => r.tier.tierCategory === selectedCategoryFilter
    );
  }, [calculationResults, selectedCategoryFilter]);

  const cheapestTier = calculationResults[0];
  const flagshipTier = calculationResults.find((r) => r.tier.id === 'gpt-4o') || calculationResults[calculationResults.length - 1];

  const savingsComparedToFlagship = useMemo(() => {
    if (!cheapestTier || !flagshipTier) return 0;
    const diff = flagshipTier.totalMonthlyCost - cheapestTier.totalMonthlyCost;
    return Math.max(0, diff);
  }, [cheapestTier, flagshipTier]);

  const handleCopySummary = () => {
    const text = isRTL
      ? `📊 تقدير التكلفة الشهرية للـ LLM APIs:
• إجمالي المدخلات (Input Tokens): ${inputMillions} مليون
• إجمالي المخرجات (Output Tokens): ${outputMillions} مليون

🏆 أرخص خيار: ${cheapestTier.tier.name} ($${cheapestTier.totalMonthlyCost.toFixed(2)}/شهر)
⭐ الخيار الرائد (GPT-4o): $${flagshipTier.totalMonthlyCost.toFixed(2)}/شهر
💰 التوفير الشهري المحتمل: $${savingsComparedToFlagship.toFixed(2)} (${Math.round((savingsComparedToFlagship / (flagshipTier.totalMonthlyCost || 1)) * 100)}%)

تم الحساب عبر دليل الذكاء الاصطناعي العالمي.`
      : `📊 Monthly Cost Estimate for LLM APIs:
• Total Input Tokens: ${inputMillions}M
• Total Output Tokens: ${outputMillions}M

🏆 Best Value Option: ${cheapestTier.tier.name} ($${cheapestTier.totalMonthlyCost.toFixed(2)}/mo)
⭐ Flagship Option (GPT-4o): $${flagshipTier.totalMonthlyCost.toFixed(2)}/mo
💰 Potential Monthly Savings: $${savingsComparedToFlagship.toFixed(2)} (${Math.round((savingsComparedToFlagship / (flagshipTier.totalMonthlyCost || 1)) * 100)}%)

Calculated via 1000 AI Models Directory Hub.`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div
      id="api-cost-calculator"
      className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-md mb-8 text-white"
      dir={direction}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>{t('calculator.title')}</span>
              <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                {t('calculator.liveBadge')}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {t('calculator.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
          >
            {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copiedSummary ? t('calculator.copiedSummary') : t('calculator.copySummary')}</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {t('common.close')}
            </button>
          )}
        </div>
      </div>

      {/* Presets Cards */}
      <div className="py-5 border-b border-slate-800/80">
        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-3">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{t('calculator.presetsLabel')}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {USAGE_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            const presetTitle = language === 'en' ? preset.nameEn : preset.nameAr;
            return (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer ${
                  isRTL ? 'text-right' : 'text-left'
                } ${
                  isSelected
                    ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-400'
                    : 'bg-slate-950/60 hover:bg-slate-800/80 text-slate-300 border-slate-800'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white mb-1">{presetTitle}</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
                    {preset.descriptionAr}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 pt-2 border-t border-slate-800/60">
                  <span>Input: {preset.monthlyInputTokens / 1_000_000}M Tokens</span>
                  <span>Output: {preset.monthlyOutputTokens / 1_000_000}M Tokens</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inputs & Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-6 border-b border-slate-800/80">
        {/* Left Inputs (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Input Tokens Slider & Field */}
          <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('calculator.inputMillionsLabel')}</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={inputMillions}
                  onChange={(e) => {
                    setInputMillions(Math.max(0, parseFloat(e.target.value) || 0));
                    setActivePresetId(null);
                  }}
                  className="w-24 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-left font-mono text-xs text-blue-400 font-bold focus:border-blue-500 outline-hidden"
                  dir="ltr"
                />
                <span className="text-xs font-mono text-slate-400">{t('calculator.millionsUnit')}</span>
              </div>
            </div>
            <input
              type="range"
              min="0.5"
              max="200"
              step="0.5"
              value={inputMillions}
              onChange={(e) => {
                setInputMillions(parseFloat(e.target.value));
                setActivePresetId(null);
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
              <span>0.5M Tokens</span>
              <span>50M Tokens</span>
              <span>100M Tokens</span>
              <span>200M Tokens</span>
            </div>
          </div>

          {/* Output Tokens Slider & Field */}
          <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                <span>{t('calculator.outputMillionsLabel')}</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={outputMillions}
                  onChange={(e) => {
                    setOutputMillions(Math.max(0, parseFloat(e.target.value) || 0));
                    setActivePresetId(null);
                  }}
                  className="w-24 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-left font-mono text-xs text-purple-400 font-bold focus:border-purple-500 outline-hidden"
                  dir="ltr"
                />
                <span className="text-xs font-mono text-slate-400">{t('calculator.millionsUnit')}</span>
              </div>
            </div>
            <input
              type="range"
              min="0.1"
              max="100"
              step="0.5"
              value={outputMillions}
              onChange={(e) => {
                setOutputMillions(parseFloat(e.target.value));
                setActivePresetId(null);
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
              <span>0.1M Tokens</span>
              <span>25M Tokens</span>
              <span>50M Tokens</span>
              <span>100M Tokens</span>
            </div>
          </div>

          {/* Prompt Caching Toggle */}
          <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="prompt-caching-check"
                checked={enablePromptCaching}
                onChange={(e) => setEnablePromptCaching(e.target.checked)}
                className="w-4 h-4 rounded-md accent-emerald-500 cursor-pointer"
              />
              <label htmlFor="prompt-caching-check" className="text-xs font-bold text-slate-300 cursor-pointer">
                {t('calculator.promptCachingToggle')}
              </label>
            </div>

            {enablePromptCaching && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">{t('calculator.cachingPercentageLabel')}</span>
                <select
                  value={cachingPercentage}
                  onChange={(e) => setCachingPercentage(parseInt(e.target.value, 10))}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold"
                >
                  <option value={25}>25%</option>
                  <option value={50}>50%</option>
                  <option value={75}>75%</option>
                  <option value={90}>90%</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right Highlights Cards (4 cols) */}
        <div className="lg:col-span-4 space-y-3 flex flex-col justify-between">
          {/* Best Value Highlight */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-950 border border-emerald-500/40 relative overflow-hidden">
            <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 mb-1">
              <TrendingDown className="w-4 h-4" />
              <span>{t('calculator.bestValueBadge')}</span>
            </div>
            <div className="text-lg font-black text-white">{cheapestTier.tier.name}</div>
            <div className="text-2xl font-mono font-black text-emerald-400 my-1">
              ${cheapestTier.totalMonthlyCost.toFixed(2)}
              <span className="text-xs text-slate-400 font-normal"> {t('calculator.perMonth')}</span>
            </div>
            <div className="text-[11px] text-slate-300">
              {t('calculator.estimatedAnnual')} <span className="font-mono text-white font-bold">${cheapestTier.totalAnnualCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Flagship Benchmark */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-bold mb-1">
              {t('calculator.flagshipBenchmark', { name: flagshipTier.tier.name })}
            </div>
            <div className="text-xl font-mono font-bold text-slate-200">
              ${flagshipTier.totalMonthlyCost.toFixed(2)}
              <span className="text-xs text-slate-400 font-normal"> {t('calculator.perMonth')}</span>
            </div>
            {savingsComparedToFlagship > 0 && (
              <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                {t('calculator.potentialSavings', { amount: `$${savingsComparedToFlagship.toFixed(2)}` })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-5 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-slate-400 font-bold ml-1">{t('calculator.filterCategory')}</span>
          {['All', 'Cost-Efficient', 'Flagship', 'Reasoning', 'Open Weights Hosting'].map((cat) => {
            const labelMap: Record<string, string> = {
              All: t('calculator.catAll'),
              'Cost-Efficient': t('calculator.catCostEfficient'),
              Flagship: t('calculator.catFlagship'),
              Reasoning: t('calculator.catReasoning'),
              'Open Weights Hosting': t('calculator.catOpenWeights')
            };
            const isSelected = selectedCategoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {labelMap[cat] || cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Financial Comparison Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 mt-2">
        <table className={`w-full text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
            <tr>
              <th className="p-3.5">{t('calculator.colModelDeveloper')}</th>
              <th className="p-3.5">{t('calculator.colCategory')}</th>
              <th className="p-3.5">{t('calculator.colInputPrice')}</th>
              <th className="p-3.5">{t('calculator.colOutputPrice')}</th>
              <th className="p-3.5">{t('calculator.colContextWindow')}</th>
              <th className="p-3.5">{t('calculator.colMonthlyCost')}</th>
              <th className="p-3.5">{t('calculator.colAnnualCost')}</th>
              <th className="p-3.5 text-center">{t('calculator.colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
            {filteredResults.map((result, idx) => {
              const isCheapest = idx === 0 && selectedCategoryFilter === 'All';
              const categoryLabel = language === 'ar' ? result.tier.tierCategoryAr : result.tier.tierCategory;
              return (
                <tr
                  key={result.tier.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isCheapest ? 'bg-emerald-950/20' : ''
                  }`}
                >
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      {isCheapest && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{result.tier.name}</span>
                          {isCheapest && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                              {t('calculator.cheapestBadge')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{result.tier.developer}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                      {categoryLabel}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-300" dir="ltr">
                    ${result.tier.inputPricePer1M.toFixed(2)}
                  </td>
                  <td className="p-3.5 font-mono text-slate-300" dir="ltr">
                    ${result.tier.outputPricePer1M.toFixed(2)}
                  </td>
                  <td className="p-3.5 font-mono text-slate-300" dir="ltr">
                    {result.tier.contextWindow}
                  </td>
                  <td className="p-3.5 font-mono font-bold text-sm text-emerald-400" dir="ltr">
                    ${result.totalMonthlyCost.toFixed(2)}
                  </td>
                  <td className="p-3.5 font-mono text-slate-300" dir="ltr">
                    ${result.totalAnnualCost.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <a
                        href={result.tier.officialPricingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors"
                        title={t('calculator.officialPricingPage')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      {result.tier.modelRank && onSelectModelRank && (
                        <button
                          onClick={() => onSelectModelRank(result.tier.modelRank!)}
                          className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-[11px] font-bold transition-all border border-blue-500/30 cursor-pointer"
                        >
                          {t('calculator.viewInDirectory')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Official Pricing Transparency & Live Documentation Notice */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 mt-0.5">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-200">
              {t('calculator.transparencyTitle')}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {t('calculator.transparencyDesc')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t('calculator.updatedIndex')}
          </span>
        </div>
      </div>
    </div>
  );
};

