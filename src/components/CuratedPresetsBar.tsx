import React from 'react';
import {
  Code,
  Brain,
  Languages,
  BadgePercent,
  Sparkles,
  Zap,
  Building2,
  X
} from 'lucide-react';

export interface CuratedPreset {
  id: string;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  applyFilter: () => void;
}

interface CuratedPresetsBarProps {
  activePresetId: string | null;
  onSelectPreset: (presetId: string | null) => void;
  onReset: () => void;
  totalFilteredCount: number;
}

export const CuratedPresetsBar: React.FC<CuratedPresetsBarProps> = ({
  activePresetId,
  onSelectPreset,
  onReset,
  totalFilteredCount
}) => {
  const presets = [
    {
      id: 'coding',
      labelAr: '💻 أفضل نماذج البرمجة',
      labelEn: 'Top Coding Models',
      descAr: 'نماذج توليد الأكواد وحل المشكلات الهندسية (Claude 3.5, Qwen 2.5 Coder, DeepSeek)',
      icon: Code,
      badgeColor: 'from-blue-600/20 to-cyan-600/20 border-blue-500/40 text-blue-300 hover:border-blue-400'
    },
    {
      id: 'reasoning',
      labelAr: '🧠 الاستدلال والمنطق الرياضي',
      labelEn: 'Deep Reasoning (o1 / R1)',
      descAr: 'النماذج المفكرة القادرة على حل المعادلات المعقدة (DeepSeek R1, OpenAI o1/o3, Gemini Flash)',
      icon: Brain,
      badgeColor: 'from-purple-600/20 to-pink-600/20 border-purple-500/40 text-purple-300 hover:border-purple-400'
    },
    {
      id: 'arabic',
      labelAr: '🌐 الأفضل للغة العربية',
      labelEn: 'Best Arabic Mastery',
      descAr: 'نماذج ذات صياغة وفهم بلاغي دقيق باللغة العربية (Allam, Jais, Gemini, Claude, GPT-4o)',
      icon: Languages,
      badgeColor: 'from-emerald-600/20 to-teal-600/20 border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
    },
    {
      id: 'cheapest_free',
      labelAr: '💰 الأرخص سعراً ومجانية',
      labelEn: 'Budget & Free Tiers',
      descAr: 'أعلى قيمة مقابل السعر ونماذج ذات استهلاك اقتصادي للرموز (Tokens)',
      icon: BadgePercent,
      badgeColor: 'from-amber-600/20 to-yellow-600/20 border-amber-500/40 text-amber-300 hover:border-amber-400'
    },
    {
      id: 'creative_vision',
      labelAr: '🎨 الرؤية وتوليد الصور والفيديو',
      labelEn: 'Vision & Multimodal',
      descAr: 'تحليل الصور وتوليد الفيديوهات والتصاميم (Midjourney, Runway, Flux, GPT-4o Vision)',
      icon: Sparkles,
      badgeColor: 'from-fuchsia-600/20 to-rose-600/20 border-fuchsia-500/40 text-fuchsia-300 hover:border-fuchsia-400'
    },
    {
      id: 'open_weights',
      labelAr: '⚡ مفتوحة الأوزان (Local & Self-Host)',
      labelEn: 'Open Weights',
      descAr: 'نماذج يمكن استضافتها على أجهزتك وسيرفراتك الخاصة مجاناً (Llama 3.3, Mistral, Gemma, Qwen)',
      icon: Zap,
      badgeColor: 'from-sky-600/20 to-indigo-600/20 border-sky-500/40 text-sky-300 hover:border-sky-400'
    },
    {
      id: 'enterprise',
      labelAr: '🏢 نماذج الشركات والمؤسسات',
      labelEn: 'Enterprise Ready',
      descAr: 'اتفاقيات SLA قوية، أمان بيانات عالٍ ونوافذ سياق عملاقة تتجاوز المليون رمز',
      icon: Building2,
      badgeColor: 'from-slate-700/40 to-slate-800/40 border-slate-600/50 text-slate-300 hover:border-slate-400'
    }
  ];

  return (
    <div className="w-full my-4">
      <div className="flex items-center justify-between gap-2 mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>مسارات استكشاف منسقة (Curated Entrypoints):</span>
          </span>
          {activePresetId && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-bold animate-pulse">
              <span>{totalFilteredCount} نموذج مطابق</span>
            </span>
          )}
        </div>

        {activePresetId && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-400 transition cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>إلغاء التخصيص</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {presets.map((preset) => {
          const isActive = activePresetId === preset.id;
          const Icon = preset.icon;

          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(isActive ? null : preset.id)}
              title={preset.descAr}
              className={`relative text-right p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border-blue-400 ring-2 ring-blue-500/30 shadow-lg scale-[1.02]'
                  : `bg-gradient-to-br ${preset.badgeColor} bg-slate-900/60 hover:scale-[1.01]`
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-300' : ''}`} />
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-white line-clamp-1 leading-tight mb-0.5">
                  {preset.labelAr}
                </p>
                <p className="text-[10px] text-slate-400 line-clamp-1">
                  {preset.labelEn}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
