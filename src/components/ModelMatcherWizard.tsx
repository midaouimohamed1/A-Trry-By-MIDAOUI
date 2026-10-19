import React, { useState, useMemo } from 'react';
import { AIModel } from '../types';
import { allAIModels } from '../data/allModels';
import { useLanguage } from '../hooks/useLanguage';
import {
  Sparkles,
  Code2,
  BrainCircuit,
  PenTool,
  Image as ImageIcon,
  Zap,
  Globe,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  BarChart2,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Crown,
  Layers,
  HelpCircle,
  X,
  Flame,
  Award,
  ChevronRight,
  ChevronLeft,
  Target
} from 'lucide-react';

export type MatcherTask =
  | 'coding'
  | 'reasoning'
  | 'writing'
  | 'multimodal'
  | 'budget_speed'
  | 'arabic'
  | 'privacy_open';

export type MatcherPriority =
  | 'max_quality'
  | 'speed'
  | 'low_cost'
  | 'open_weights';

export type MatcherContextScale =
  | 'standard'
  | 'large'
  | 'massive';

export interface MatcherAnswers {
  task: MatcherTask | null;
  priority: MatcherPriority | null;
  contextScale: MatcherContextScale | null;
}

export interface MatchedModelRecommendation {
  model: AIModel;
  matchScore: number;
  matchBadgeAr: string;
  matchBadgeEn: string;
  badgeColor: string;
  rationaleAr: string;
  rationaleEn: string;
  keyStrengthsAr: string[];
  keyStrengthsEn: string[];
}

interface ModelMatcherWizardProps {
  isOpen?: boolean;
  onClose: () => void;
  onSelectModelDetails: (model: AIModel) => void;
  onToggleCompare?: (model: AIModel) => void;
  onCompareModels?: (models: AIModel[]) => void;
  onToggleBookmark?: (model: AIModel) => void;
  comparedRanks?: number[];
  bookmarkedRanks?: number[];
  onApplyFilters?: (category?: string, pricing?: string) => void;
}

export const ModelMatcherWizard: React.FC<ModelMatcherWizardProps> = ({
  isOpen = true,
  onClose,
  onSelectModelDetails,
  onToggleCompare,
  onCompareModels,
  onToggleBookmark,
  comparedRanks = [],
  bookmarkedRanks = [],
  onApplyFilters
}) => {
  const { t, language, direction, isRTL, formatNumber } = useLanguage();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [answers, setAnswers] = useState<MatcherAnswers>({
    task: null,
    priority: null,
    contextScale: null
  });

  const handleReset = () => {
    setAnswers({ task: null, priority: null, contextScale: null });
    setCurrentStep(1);
  };

  // 1. Task Definitions
  const TASK_OPTIONS: {
    id: MatcherTask;
    titleAr: string;
    titleEn: string;
    descAr: string;
    descEn: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }[] = [
    {
      id: 'coding',
      titleAr: 'برمجة وتطوير برمجيات وهندسة معمارية',
      titleEn: 'Coding, Software Development & Architecture',
      descAr: 'كتابة وتدقيق الأكواد البرمجية، حل الثغرات المعقدة، وبناء الأنظمة الشاملة',
      descEn: 'Writing and debugging clean code, refactoring, and complex architectural design',
      icon: Code2,
      accentColor: 'border-blue-500/40 hover:border-blue-400 bg-blue-950/20'
    },
    {
      id: 'reasoning',
      titleAr: 'تفكير متسلسل عميق وحسابات ورياضيات',
      titleEn: 'Deep Reasoning, Math & Logic Problem Solving',
      descAr: 'حل المشكلات الاستراتيجية المعقدة والمنطق الرياضي متعدد الخطوات (CoT)',
      descEn: 'Multi-step chain-of-thought, mathematical proofs, and advanced scientific reasoning',
      icon: BrainCircuit,
      accentColor: 'border-purple-500/40 hover:border-purple-400 bg-purple-950/20'
    },
    {
      id: 'arabic',
      titleAr: 'إتقان اللغة العربية والترجمة الثقافية',
      titleEn: 'Arabic Language Fluency & Cultural Context',
      descAr: 'صياغة بلاغية دقيقة، استيعاب اللهجات المحلية، وتلخيص المقالات والنصوص الطويلة',
      descEn: 'High-quality Modern Standard Arabic, local dialect comprehension, and nuance preservation',
      icon: Globe,
      accentColor: 'border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/20'
    },
    {
      id: 'writing',
      titleAr: 'كتابة محتوى وتسويق وإبداع لغوي',
      titleEn: 'Content Creation, Copywriting & Storytelling',
      descAr: 'صناعة المقالات، السيناريوهات، المنشورات التسويقية، وتطويع النبرة الصوتية',
      descEn: 'Engaging storytelling, marketing copy, tone customization, and persuasive writing',
      icon: PenTool,
      accentColor: 'border-amber-500/40 hover:border-amber-400 bg-amber-950/20'
    },
    {
      id: 'multimodal',
      titleAr: 'رؤية بصرية وتحليل مستندات ومخططات',
      titleEn: 'Multimodal Vision, Documents & Video Analysis',
      descAr: 'قراءة الرسوم البيانية، استخراج البيانات من الصور والفيديوهات، والوسائط المتعددة',
      descEn: 'OCR, visual diagram parsing, audio transcripts, and video understanding',
      icon: ImageIcon,
      accentColor: 'border-cyan-500/40 hover:border-cyan-400 bg-cyan-950/20'
    },
    {
      id: 'budget_speed',
      titleAr: 'استجابة فائقة السرعة وأعلى توفير مالي',
      titleEn: 'Ultra-low Latency & Maximum Cost Efficiency',
      descAr: 'زمن استجابة أقل من ثانية، استهلاك قليل جداً للتكلفة مع خطط مجانية واسعة',
      descEn: 'Sub-second real-time inference, generous free tiers, and lowest cost per million tokens',
      icon: Zap,
      accentColor: 'border-rose-500/40 hover:border-rose-400 bg-rose-950/20'
    },
    {
      id: 'privacy_open',
      titleAr: 'أوزان مفتوحة واستضافة ذاتية وأمان مؤسسي',
      titleEn: 'Open Weights, Self-Hosting & Privacy',
      descAr: 'تشغيل محلي على خوادمك الخاصة (On-Premise) مع خصوصية مطلقة للبيانات',
      descEn: 'On-premise deployment, weights fine-tuning, and complete data sovereignty',
      icon: ShieldCheck,
      accentColor: 'border-indigo-500/40 hover:border-indigo-400 bg-indigo-950/20'
    }
  ];

  // 2. Priority Definitions
  const PRIORITY_OPTIONS: {
    id: MatcherPriority;
    titleAr: string;
    titleEn: string;
    descAr: string;
    descEn: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'max_quality',
      titleAr: 'أقصى جودة وذكاء (Maximum Intelligence)',
      titleEn: 'Maximum Intelligence & Quality',
      descAr: 'الأولوية لأعلى دقة علمية وتصدر لوحات القياس العالمية بغض النظر عن التكلفة',
      descEn: 'Highest benchmark accuracy and leadership regardless of pricing',
      icon: Crown
    },
    {
      id: 'speed',
      titleAr: 'سرعة استجابة خارقة (Real-time Speed)',
      titleEn: 'Sub-second Real-time Speed',
      descAr: 'الأولوية للتطبيقات التفاعلية الفورية وزمن المعالجة السريع جداً',
      descEn: 'Instantaneous conversational latency for user-facing interactive apps',
      icon: Zap
    },
    {
      id: 'low_cost',
      titleAr: 'أقل تكلفة وأعلى توفير مالي (Best ROI)',
      titleEn: 'Best ROI & Lowest Cost',
      descAr: 'الأولوية لمعالجة ملايين الكلمات بتكلفة زهيدة جداً أو باقة مجانية',
      descEn: 'Process millions of tokens economically with highest value per dollar',
      icon: Target
    },
    {
      id: 'open_weights',
      titleAr: 'مصدر مفتوح وقابل للتعديل (Open Source)',
      titleEn: 'Open Source & Custom Weights',
      descAr: 'التحكم الكامل في النموذج وإمكانية التدريب المخصص (Fine-tuning)',
      descEn: 'Full control over weights, local inference, and custom fine-tuning',
      icon: Layers
    }
  ];

  // 3. Context Scale Options
  const CONTEXT_OPTIONS: {
    id: MatcherContextScale;
    titleAr: string;
    titleEn: string;
    descAr: string;
    descEn: string;
    tokensText: string;
  }[] = [
    {
      id: 'standard',
      titleAr: 'حجم اعتيادي للمحادثات والمهام اليومية',
      titleEn: 'Standard Daily Conversations & Q&A',
      descAr: 'مناسب لأسئلة البرمجة والرسائل والمقالات القصيرة',
      descEn: 'Ideal for short prompts, quick scripts, and standard interactions',
      tokensText: '~8K - 32K Tokens'
    },
    {
      id: 'large',
      titleAr: 'حجم كبير للمستندات والملفات البرمجية',
      titleEn: 'Large Documents & Multi-file Codebases',
      descAr: 'مناسب لتحليل كتب كاملة ومستودعات برمجية متعددة الملفات',
      descEn: 'Ideal for full books, PDF research, and multi-file codebases',
      tokensText: '~128K - 200K Tokens'
    },
    {
      id: 'massive',
      titleAr: 'نافذة سياق ضخمة واستثنائية (Massive Context)',
      titleEn: 'Massive Million-Token Window',
      descAr: 'قراءة ساعات من الفيديوهات والصوتيات وآلاف الصفحات في طلب واحد',
      descEn: 'Ingest hours of video/audio and thousands of pages in a single request',
      tokensText: '~1M - 2M Tokens'
    }
  ];

  // Algorithmic Recommendation Engine
  const matchedRecommendations: MatchedModelRecommendation[] = useMemo(() => {
    if (!answers.task) return [];

    const scored = allAIModels.map((model) => {
      let score = 50;
      let rationaleAr = '';
      let rationaleEn = '';
      const strengthsAr: string[] = [];
      const strengthsEn: string[] = [];

      const nameLower = model.name.toLowerCase();
      const devLower = model.developer.toLowerCase();

      // Step 1: Task Matching
      switch (answers.task) {
        case 'coding':
          if (nameLower.includes('claude 3.5 sonnet') || nameLower.includes('claude 3.7')) {
            score += 48;
            rationaleAr = 'المرجع العالمي الأول في كتابة الأكواد وتصحيح الأخطاء وهندسة الأنظمة المعقدة.';
            rationaleEn = 'The gold standard for complex refactoring, multi-file codebases, and architectural design.';
            strengthsAr.push('أعلى تقييم على معيار SWE-bench', 'فهم عميق للهياكل البرمجية الكبيرة');
            strengthsEn.push('Top SWE-bench benchmark scores', 'Deep multi-file codebase understanding');
          } else if (nameLower.includes('deepseek-coder') || nameLower.includes('deepseek-v3') || nameLower.includes('deepseek-r1')) {
            score += 45;
            rationaleAr = 'أداء برمجي مذهل يضاهي النماذج الاحتكارية الرائدة مع توفير مالي يفوق 90%.';
            rationaleEn = 'Flagship-grade coding capabilities at over 90% lower operational cost.';
            strengthsAr.push('كفاءة استثنائية في حل الخوارزميات', 'تكلفة منخفضة للغاية');
            strengthsEn.push('Superior algorithmic problem solving', 'Ultra-low API pricing');
          } else if (nameLower.includes('gpt-4o') || nameLower.includes('o3-mini')) {
            score += 42;
            rationaleAr = 'استقرار عالي ودعم شامل لجميع لغات البرمجة وأطر العمل مع أدوات فحص دقيقة.';
            rationaleEn = 'Robust, battle-tested code generation with extensive tooling ecosystem.';
            strengthsAr.push('تكامل واسع مع بيئات التطوير', 'سرعة تصحيح منطقي');
            strengthsEn.push('Extensive IDE tooling ecosystem', 'Fast logical debugging');
          } else if (model.category.includes('Code') || model.categoryAr.includes('برمجة')) {
            score += 30;
            rationaleAr = 'نموذج مخصص للمطورين وهندسة البرمجيات.';
            rationaleEn = 'Specialized model designed for software engineering workloads.';
          }
          break;

        case 'reasoning':
          if (nameLower.includes('o1') || nameLower.includes('o3') || nameLower.includes('r1')) {
            score += 49;
            rationaleAr = 'يستخدم سلاسل التفكير المستقلة (Chain-of-Thought) للحلول الرياضية والمنطقية المتقدمة.';
            rationaleEn = 'Uses specialized chain-of-thought reflection for Olympiad-level mathematics and logic.';
            strengthsAr.push('تفكير تحليلي متدرج قبل الإجابة', 'تفوق في الأولمبياد والرياضيات');
            strengthsEn.push('Step-by-step reasoning tokens', 'State-of-the-art math benchmarks');
          } else if (nameLower.includes('claude 3.5 sonnet') || nameLower.includes('gemini 1.5 pro')) {
            score += 40;
            rationaleAr = 'قدرات استنتاجية عالية الدقة للمشكلات متعددة الأبعاد والتحليل الاستراتيجي.';
            rationaleEn = 'High-precision analytical deduction for multi-dimensional problem solving.';
            strengthsAr.push('منطق تحليلي سليم وخالٍ من الهلوسة', 'ربط سياقي واسع');
            strengthsEn.push('Sound analytical reasoning with low hallucination', 'Broad contextual synthesis');
          }
          break;

        case 'arabic':
          if (nameLower.includes('jais') || nameLower.includes('allam') || nameLower.includes('falcon')) {
            score += 48;
            rationaleAr = 'نموذج عربي رائد مدرب خصيصاً على التراث والمعاجم واللهجات العربية المختلفة.';
            rationaleEn = 'Native Arabic foundation model trained extensively on regional heritage and dialects.';
            strengthsAr.push('صياغة لغوية أصيلة', 'فهم الثقافة واللهجات العربية');
            strengthsEn.push('Authentic Arabic phrasing', 'Cultural and dialectal awareness');
          } else if (nameLower.includes('claude 3.5') || nameLower.includes('gpt-4o')) {
            score += 44;
            rationaleAr = 'بلاغة عربية فصحى رفيعة المستوى مع قدرة استثنائية على التدقيق اللغوي والترجمة.';
            rationaleEn = 'High eloquence in Modern Standard Arabic with outstanding grammar precision.';
            strengthsAr.push('دقة في القواعد والإعراب', 'صياغة أكاديمية رصينة');
            strengthsEn.push('Academic Arabic composition', 'Precise grammatical correction');
          } else if (nameLower.includes('gemini')) {
            score += 39;
            rationaleAr = 'دعم متعدد اللهجات مع تكامل فوري وسرعة عالية.';
            rationaleEn = 'Multi-dialect fluency with high-speed response times.';
            strengthsAr.push('ترجمة فورية سلسة', 'تغطية واسعة للهجات');
            strengthsEn.push('Fluent real-time translation', 'Broad dialect coverage');
          }
          break;

        case 'writing':
          if (nameLower.includes('claude') || nameLower.includes('sonnet') || nameLower.includes('opus')) {
            score += 48;
            rationaleAr = 'أسلوب كتابي طبيعي خالي من التكلف مع براعة فائقة في التعبير الإبداعي وتطويع النبرة.';
            rationaleEn = 'Natural, nuanced human voice with superior creative flair and tone adaptability.';
            strengthsAr.push('نبرة صوتية إنسانية طبيعية', 'سرد قصصي ومقالات متماسكة');
            strengthsEn.push('Natural conversational tone', 'Compelling long-form storytelling');
          } else if (nameLower.includes('gpt-4o') || nameLower.includes('chatgpt')) {
            score += 42;
            rationaleAr = 'مرونة عالية في صياغة المحتوى التسويقي والإعلاني والرسائل الرسمية.';
            rationaleEn = 'Exceptional versatility for marketing campaigns, newsletters, and executive communication.';
            strengthsAr.push('تنوع أساليب الكتابة', 'سرعة تلخيص الكتب والمقالات');
            strengthsEn.push('Adaptive copywriting frameworks', 'Fast document summarization');
          }
          break;

        case 'multimodal':
          if (nameLower.includes('gemini 1.5 pro') || nameLower.includes('gemini 2.0')) {
            score += 48;
            rationaleAr = 'إدراك فطري مدمج للصور والمخططات والتسجيلات الصوتية والفيديوهات الطويلة.';
            rationaleEn = 'Native multimodal architecture handling video, audio, PDFs, and high-res imagery effortlessly.';
            strengthsAr.push('تحليل الفيديوهات والصوتيات معاً', 'استخراج دقيق للبيانات البصرية');
            strengthsEn.push('Full video & audio ingestion', 'Accurate diagram OCR & parsing');
          } else if (nameLower.includes('gpt-4o') || nameLower.includes('claude 3.5 sonnet')) {
            score += 44;
            rationaleAr = 'قراءة فائقة الدقة للرسوم البيانية والمستندات الممسوحة ضوئياً والمخططات الهندسية.';
            rationaleEn = 'Precise optical chart analysis and scanned document understanding.';
            strengthsAr.push('OCR فائق للوثائق', 'فهم عميق للجداول والرسوم');
            strengthsEn.push('Crisp visual table extraction', 'UI & wireframe breakdown');
          }
          break;

        case 'budget_speed':
          if (nameLower.includes('llama-3.3-70b') || devLower.includes('groq')) {
            score += 49;
            rationaleAr = 'سرعة توليد خارقة (أكثر من 300 كلمة في الثانية) مع أداء ممتاز وتكلفة مجانية/منخفضة.';
            rationaleEn = 'Blazing fast inference (>300 tokens/sec) with high quality and minimal cost.';
            strengthsAr.push('سرعة استجابة لحظية عبر معالجات LPU', 'توفير مالي هائل');
            strengthsEn.push('Sub-second latency via LPUs', 'Massive cost savings');
          } else if (nameLower.includes('gpt-4o-mini') || nameLower.includes('gemini 1.5 flash') || nameLower.includes('deepseek-v3')) {
            score += 46;
            rationaleAr = 'أفضل معادلة عالمياً بين التكلفة الاقتصادية الزهيدة والأداء الذكي المتقدم.';
            rationaleEn = 'Top price-to-performance ratio globally with fast execution.';
            strengthsAr.push('أقل من 0.15$ لكل مليون رمز', 'خطة مجانية سخية للمطورين');
            strengthsEn.push('Under $0.15 / 1M tokens', 'Generous developer free tier');
          }
          break;

        case 'privacy_open':
          if (nameLower.includes('llama 3.3') || nameLower.includes('deepseek') || nameLower.includes('qwen') || nameLower.includes('mistral')) {
            score += 48;
            rationaleAr = 'أوزان مفتوحة بالكامل تمنحك استقلالية تامة وإمكانية التشغيل على خوادم محلية دون مشاركة بياناتك.';
            rationaleEn = 'Fully open weights for private on-premise deployment without leaking sensitive data.';
            strengthsAr.push('أمان وخصوصية 100% للشركات', 'إمكانية التدريب والتخصيص التام');
            strengthsEn.push('100% data privacy & sovereignty', 'Full custom fine-tuning support');
          }
          break;
      }

      // Step 2: Priority Adjustments
      if (answers.priority === 'max_quality') {
        if (model.rank <= 10 || model.popularityScore >= 95) score += 20;
      } else if (answers.priority === 'speed') {
        if (nameLower.includes('flash') || nameLower.includes('mini') || nameLower.includes('groq') || nameLower.includes('haiku')) {
          score += 25;
        }
      } else if (answers.priority === 'low_cost') {
        if (model.pricing === 'Free' || model.pricing === 'Open Source' || nameLower.includes('mini') || nameLower.includes('flash')) {
          score += 25;
        }
      } else if (answers.priority === 'open_weights') {
        if (model.pricing === 'Open Source' || model.license.toLowerCase().includes('apache') || model.license.toLowerCase().includes('mit') || model.license.toLowerCase().includes('llama')) {
          score += 30;
        }
      }

      // Step 3: Context Adjustments
      if (answers.contextScale === 'massive') {
        if (nameLower.includes('gemini 1.5') || nameLower.includes('gemini 2.0')) score += 30;
      } else if (answers.contextScale === 'large') {
        if (nameLower.includes('claude') || nameLower.includes('gpt-4o') || nameLower.includes('deepseek')) score += 15;
      }

      // Base popularity bonus
      score += (model.popularityScore / 100) * 10;

      // Fallback rationale if none matched specifically
      if (!rationaleAr) {
        rationaleAr = model.descriptionAr || 'نموذج موثوق ومتميز في مجاله يلبي متطلباتك بكفاءة.';
        rationaleEn = model.descriptionEn || 'Reliable and high-performing model tailored to your requirements.';
      }
      if (strengthsAr.length === 0 && model.keyFeaturesAr?.length) {
        strengthsAr.push(...model.keyFeaturesAr.slice(0, 2));
      }
      if (strengthsEn.length === 0 && model.keyFeaturesEn?.length) {
        strengthsEn.push(...model.keyFeaturesEn.slice(0, 2));
      }

      return {
        model,
        score: Math.min(99, Math.round(score)),
        rationaleAr,
        rationaleEn: rationaleEn || model.descriptionEn || 'High-performance AI model offering an optimal balance of latency and quality.',
        strengthsAr,
        strengthsEn: strengthsEn.length ? strengthsEn : ['High reliability', 'Broad API support']
      };
    });

    // Sort descending by score and pick top 3
    scored.sort((a, b) => b.score - a.score);
    const top3 = scored.slice(0, 3);

    const badges = [
      { textAr: 'الخيار المثالي الأول (Best Match)', textEn: 'Top Pick #1 (Best Match)', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
      { textAr: 'الخيار البديل الأقوى (Top Alternative)', textEn: 'Top Alternative', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
      { textAr: 'خيار اقتصادي متميز (Value Pick)', textEn: 'Best Value Pick', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' }
    ];

    return top3.map((item, idx) => ({
      model: item.model,
      matchScore: item.score,
      matchBadgeAr: badges[idx].textAr,
      matchBadgeEn: badges[idx].textEn,
      badgeColor: badges[idx].color,
      rationaleAr: item.rationaleAr,
      rationaleEn: item.rationaleEn,
      keyStrengthsAr: item.strengthsAr,
      keyStrengthsEn: item.strengthsEn
    }));
  }, [answers]);

  if (!isOpen) return null;

  return (
    <div
      id="model-matcher-wizard-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto"
      dir={direction}
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  {t('wizard.title')}
                </h2>
                <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono">
                  3-Step Matcher
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {t('wizard.subtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">
              {t('wizard.step', { current: currentStep, total: 3 })}:
            </span>
            <span className="font-bold text-purple-400">
              {currentStep === 1 && (isRTL ? 'ما هي طبيعة مهمتك الرئيسية؟' : 'What is your primary task?')}
              {currentStep === 2 && (isRTL ? 'ما هي أولويتك القصوى؟' : 'What is your core priority?')}
              {currentStep === 3 && (isRTL ? 'ما هو حجم السياق والملفات المطلوب؟' : 'What context window size is required?')}
              {currentStep === 4 && (isRTL ? 'النتائج والترشيحات المثالية لك' : 'Optimal Model Recommendations')}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all ${
                  step === currentStep
                    ? 'w-8 bg-purple-500'
                    : step < currentStep
                    ? 'w-4 bg-emerald-500'
                    : 'w-4 bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wizard Interactive Content */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: TASK SELECTION */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h3 className="text-base font-bold text-white mb-1">
                  {t('wizard.step1Title')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('wizard.step1Subtitle')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {TASK_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = answers.task === opt.id;
                  const title = language === 'en' ? opt.titleEn : opt.titleAr;
                  const desc = language === 'en' ? opt.descEn : opt.descAr;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setAnswers((prev) => ({ ...prev, task: opt.id }))}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 relative ${
                        isRTL ? 'text-right' : 'text-left'
                      } ${
                        isSelected
                          ? 'border-purple-500 bg-purple-950/40 ring-2 ring-purple-500/30'
                          : `${opt.accentColor} border-slate-800/80 hover:border-slate-700`
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-white mb-1">
                          {title}
                        </div>
                        <div className="text-[11px] text-slate-400 leading-relaxed">
                          {desc}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className={`w-4 h-4 text-purple-400 shrink-0 absolute top-4 ${isRTL ? 'left-4' : 'right-4'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: PRIORITY TRADEOFF */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h3 className="text-base font-bold text-white mb-1">
                  {t('wizard.step2Title')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('wizard.step2Subtitle')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {PRIORITY_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = answers.priority === opt.id;
                  const title = language === 'en' ? opt.titleEn : opt.titleAr;
                  const desc = language === 'en' ? opt.descEn : opt.descAr;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setAnswers((prev) => ({ ...prev, priority: opt.id }))}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 relative ${
                        isRTL ? 'text-right' : 'text-left'
                      } ${
                        isSelected
                          ? 'border-purple-500 bg-purple-950/40 ring-2 ring-purple-500/30'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-white mb-1">
                          {title}
                        </div>
                        <div className="text-[11px] text-slate-400 leading-relaxed">
                          {desc}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className={`w-4 h-4 text-purple-400 shrink-0 absolute top-4 ${isRTL ? 'left-4' : 'right-4'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: CONTEXT WINDOW */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h3 className="text-base font-bold text-white mb-1">
                  {t('wizard.step3Title')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('wizard.step3Subtitle')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                {CONTEXT_OPTIONS.map((opt) => {
                  const isSelected = answers.contextScale === opt.id;
                  const title = language === 'en' ? opt.titleEn : opt.titleAr;
                  const desc = language === 'en' ? opt.descEn : opt.descAr;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setAnswers((prev) => ({ ...prev, contextScale: opt.id }))}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                        isRTL ? 'text-right' : 'text-left'
                      } ${
                        isSelected
                          ? 'border-purple-500 bg-purple-950/40 ring-2 ring-purple-500/30'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <span className="inline-block font-mono text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/30 mb-2">
                          {opt.tokensText}
                        </span>
                        <div className="font-bold text-xs sm:text-sm text-white mb-1.5">
                          {title}
                        </div>
                        <div className="text-[11px] text-slate-400 leading-relaxed">
                          {desc}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-purple-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isRTL ? 'تم الاختيار' : 'Selected'}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: RECOMMENDATIONS RESULTS */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-blue-950/40 border border-purple-500/30">
                <div className="flex items-center gap-2.5">
                  <Award className="w-6 h-6 text-purple-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {t('wizard.resultsTitle')}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {t('wizard.resultsSubtitle')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {onCompareModels && (
                    <button
                      onClick={() => {
                        onCompareModels(matchedRecommendations.map((r) => r.model));
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 cursor-pointer transition"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>{t('wizard.compareSelected')}</span>
                    </button>
                  )}
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 cursor-pointer transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('wizard.btnRestart')}</span>
                  </button>
                </div>
              </div>

              {/* Top 3 Recommendation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {matchedRecommendations.map((rec) => {
                  const isCompared = comparedRanks.includes(rec.model.rank);
                  const isBookmarked = bookmarkedRanks.includes(rec.model.rank);
                  const badgeText = language === 'en' ? rec.matchBadgeEn : rec.matchBadgeAr;
                  const rationaleText = language === 'en' ? rec.rationaleEn : rec.rationaleAr;
                  const strengthsList = language === 'en' ? rec.keyStrengthsEn : rec.keyStrengthsAr;

                  return (
                    <div
                      key={rec.model.rank}
                      className={`bg-slate-950 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between hover:border-purple-500/40 transition-all shadow-lg relative group ${
                        isRTL ? 'text-right' : 'text-left'
                      }`}
                    >
                      {/* Badge and Match Score */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${rec.badgeColor}`}>
                            {badgeText}
                          </span>
                          <span className="text-xs font-black font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                            {rec.matchScore}% {isRTL ? 'تطابق' : 'Match'}
                          </span>
                        </div>

                        {/* Model Title & Developer */}
                        <div className="mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono text-slate-500 font-bold">
                              #{rec.model.rank}
                            </span>
                            <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition">
                              {rec.model.name}
                            </h4>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {isRTL ? 'المطور:' : 'Developer:'} <strong className="text-slate-300">{rec.model.developer}</strong>
                          </p>
                        </div>

                        {/* Rationale */}
                        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-purple-200/90 leading-relaxed mb-3">
                          <strong className="text-purple-400 block mb-0.5">{t('wizard.whyThisModel')}</strong>
                          {rationaleText}
                        </div>

                        {/* Strengths */}
                        {strengthsList.length > 0 && (
                          <div className="space-y-1 mb-4">
                            {strengthsList.map((str, sIdx) => (
                              <div key={sIdx} className="flex items-center gap-1.5 text-[10px] text-slate-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span className="line-clamp-1">{str}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-3 border-t border-slate-900 space-y-2">
                        <button
                          onClick={() => {
                            onSelectModelDetails(rec.model);
                            onClose();
                          }}
                          className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20"
                        >
                          <span>{t('models.details')}</span>
                          {isRTL ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>

                        <div className="grid grid-cols-2 gap-1.5">
                          {onToggleCompare && (
                            <button
                              onClick={() => onToggleCompare(rec.model)}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition flex items-center justify-center gap-1 cursor-pointer ${
                                isCompared
                                  ? 'bg-blue-600 text-white border-blue-500'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                              }`}
                            >
                              <BarChart2 className="w-3 h-3" />
                              <span>{isCompared ? t('models.inCompare') : t('models.compare')}</span>
                            </button>
                          )}

                          {onToggleBookmark && (
                            <button
                              onClick={() => onToggleBookmark(rec.model)}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition flex items-center justify-center gap-1 cursor-pointer ${
                                isBookmarked
                                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                              }`}
                            >
                              {isBookmarked ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                              <span>{isBookmarked ? t('models.bookmarked') : t('models.bookmark')}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <div>
            {currentStep > 1 && currentStep <= 3 && (
              <button
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer border border-slate-700"
              >
                {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                <span>{t('wizard.btnPrev')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 3 && (
              <button
                onClick={() => {
                  if (currentStep === 1 && !answers.task) return;
                  if (currentStep === 2 && !answers.priority) return;
                  setCurrentStep((prev) => prev + 1);
                }}
                disabled={(currentStep === 1 && !answers.task) || (currentStep === 2 && !answers.priority)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-purple-600/25 disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>{t('wizard.btnNext')}</span>
                {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            )}

            {currentStep === 3 && (
              <button
                onClick={() => {
                  if (!answers.contextScale) return;
                  setCurrentStep(4);
                }}
                disabled={!answers.contextScale}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-purple-600/30 disabled:opacity-40 disabled:pointer-events-none animate-pulse"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t('wizard.btnGetResults')}</span>
              </button>
            )}

            {currentStep === 4 && (
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-700"
              >
                {t('common.close')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
