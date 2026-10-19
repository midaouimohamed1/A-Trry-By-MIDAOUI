import { SupportedProvider } from '../types';

export interface ModelPricingRate {
  inputPer1MTokens: number; // USD per 1,000,000 input tokens
  outputPer1MTokens: number; // USD per 1,000,000 output tokens
  contextWindowTokens: number;
  isFreeTierAvailable?: boolean;
  notesAr?: string;
}

/**
 * Standard live pricing table for BYOK Playground Models (USD per 1M tokens)
 */
export const MODEL_PRICING_TABLE: Record<string, ModelPricingRate> = {
  // OpenAI
  'gpt-4o': {
    inputPer1MTokens: 2.50,
    outputPer1MTokens: 10.00,
    contextWindowTokens: 128000,
    notesAr: 'النموذج القياسي الرائد متعدد الوسائط من OpenAI'
  },
  'gpt-4o-mini': {
    inputPer1MTokens: 0.15,
    outputPer1MTokens: 0.60,
    contextWindowTokens: 128000,
    notesAr: 'نموذج فائق السرعة واقتصادي جداً'
  },
  'o1': {
    inputPer1MTokens: 15.00,
    outputPer1MTokens: 60.00,
    contextWindowTokens: 200000,
    notesAr: 'نموذج التفكير العميق المعقد (CoT)'
  },
  'o3-mini': {
    inputPer1MTokens: 1.10,
    outputPer1MTokens: 4.40,
    contextWindowTokens: 200000,
    notesAr: 'تفكير متقدم وسريع بسعر منخفض'
  },

  // Anthropic
  'claude-3-5-sonnet-20241022': {
    inputPer1MTokens: 3.00,
    outputPer1MTokens: 15.00,
    contextWindowTokens: 200000,
    notesAr: 'المرجع العالمي الأول في البرمجة والتحليل المعقد'
  },
  'claude-3-5-haiku-20241022': {
    inputPer1MTokens: 0.80,
    outputPer1MTokens: 4.00,
    contextWindowTokens: 200000,
    notesAr: 'سرعة استجابة فائقة وتكلفة اقتصادية'
  },
  'claude-3-opus-20240229': {
    inputPer1MTokens: 15.00,
    outputPer1MTokens: 75.00,
    contextWindowTokens: 200000,
    notesAr: 'أعلى قدرة بلاغية وفلسفية وتحليلية'
  },

  // Google Gemini
  'gemini-3.7-flash': {
    inputPer1MTokens: 0.10,
    outputPer1MTokens: 0.40,
    contextWindowTokens: 1000000,
    isFreeTierAvailable: true,
    notesAr: 'الجيل الأحدث مع استدلال متقدم وسرعة فائقة وخطة مجانية'
  },
  'gemini-3.5-flash-lite': {
    inputPer1MTokens: 0.05,
    outputPer1MTokens: 0.20,
    contextWindowTokens: 1000000,
    isFreeTierAvailable: true,
    notesAr: 'النموذج الأخف والأكثر اقتصادية وسرعة من جوجل'
  },
  'gemini-flash-latest': {
    inputPer1MTokens: 0.10,
    outputPer1MTokens: 0.40,
    contextWindowTokens: 1000000,
    isFreeTierAvailable: true,
    notesAr: 'النسخة الأحدث المستقرة من نماذج Gemini Flash'
  },
  'gemini-3.1-pro-preview': {
    inputPer1MTokens: 1.25,
    outputPer1MTokens: 5.00,
    contextWindowTokens: 2000000,
    isFreeTierAvailable: true,
    notesAr: 'أقوى نماذج جوجل للمهام الهندسية والمعرفية المعقدة'
  },
  'gemini-1.5-flash': {
    inputPer1MTokens: 0.075,
    outputPer1MTokens: 0.30,
    contextWindowTokens: 1000000,
    isFreeTierAvailable: true,
    notesAr: 'نافذة سياق ضخمة (1M) مع خطة مجانية سخية'
  },
  'gemini-1.5-pro': {
    inputPer1MTokens: 1.25,
    outputPer1MTokens: 5.00,
    contextWindowTokens: 2000000,
    isFreeTierAvailable: true,
    notesAr: 'أكبر نافذة سياق في العالم (2M) مع إدراك متعدد الوسائط'
  },

  // DeepSeek
  'deepseek-chat': {
    inputPer1MTokens: 0.14,
    outputPer1MTokens: 0.28,
    contextWindowTokens: 64000,
    notesAr: 'DeepSeek-V3 الأقوى والأوفر عالمياً في كفاءة التكلفة'
  },
  'deepseek-reasoner': {
    inputPer1MTokens: 0.55,
    outputPer1MTokens: 2.19,
    contextWindowTokens: 64000,
    notesAr: 'DeepSeek-R1 تفكير منطقي ورياضي فائق'
  },

  // Groq (Llama on LPU)
  'llama-3.3-70b-versatile': {
    inputPer1MTokens: 0.59,
    outputPer1MTokens: 0.79,
    contextWindowTokens: 128000,
    isFreeTierAvailable: true,
    notesAr: 'سرعة توليد خارقة تتجاوز 300 كلمة/ثانية'
  },
  'mixtral-8x7b-32768': {
    inputPer1MTokens: 0.24,
    outputPer1MTokens: 0.24,
    contextWindowTokens: 32768,
    isFreeTierAvailable: true,
    notesAr: 'بنية MoE سريعة وفعالة'
  },
  'llama-3.1-8b-instant': {
    inputPer1MTokens: 0.05,
    outputPer1MTokens: 0.08,
    contextWindowTokens: 128000,
    isFreeTierAvailable: true,
    notesAr: 'نموذج فوري مجاني وخفيف'
  },

  // Hugging Face / OpenRouter default fallback
  'default_open_weights': {
    inputPer1MTokens: 0.20,
    outputPer1MTokens: 0.40,
    contextWindowTokens: 64000,
    notesAr: 'استضافة سحابية مفتوحة المصدر'
  }
};

/**
 * Estimate Token Count from prompt string with Arabic & Code heuristic
 */
export function estimateTokensCount(text: string): {
  totalTokens: number;
  wordCount: number;
  charCount: number;
  isArabicPredominant: boolean;
} {
  if (!text || !text.trim()) {
    return { totalTokens: 0, wordCount: 0, charCount: text.length, isArabicPredominant: false };
  }

  const charCount = text.length;
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Detect Arabic characters ratio
  const arabicCharMatches = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g);
  const arabicCharsCount = arabicCharMatches ? arabicCharMatches.length : 0;
  const isArabicPredominant = arabicCharsCount > charCount * 0.35;

  let totalTokens = 0;
  if (isArabicPredominant) {
    // Arabic Byte-Pair Encoding (BPE) subword expansion factor (~ 1.6 - 2.0 tokens per word)
    totalTokens = Math.max(1, Math.round(wordCount * 1.8 + (charCount - arabicCharsCount) * 0.25));
  } else {
    // Standard English/Code token ratio (~ 4 chars/token or 1.3 tokens/word)
    totalTokens = Math.max(1, Math.round(Math.max(charCount / 4, wordCount * 1.3)));
  }

  return {
    totalTokens,
    wordCount,
    charCount,
    isArabicPredominant
  };
}

export interface SlotCostEstimate {
  slotId: string;
  provider: SupportedProvider;
  modelId: string;
  inputTokens: number;
  projectedOutputTokens: number;
  inputCostUSD: number;
  outputCostUSD: number;
  totalCostUSD: number;
  formattedTotalUSD: string;
  isFreeTier: boolean;
  rateInfo: ModelPricingRate;
}

/**
 * Find model pricing rate or return sensible fallback
 */
export function getPricingForModel(modelId: string, provider: SupportedProvider): ModelPricingRate {
  if (MODEL_PRICING_TABLE[modelId]) {
    return MODEL_PRICING_TABLE[modelId];
  }

  // Look for partial match
  const foundKey = Object.keys(MODEL_PRICING_TABLE).find((k) =>
    modelId.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(modelId.toLowerCase())
  );
  if (foundKey) {
    return MODEL_PRICING_TABLE[foundKey];
  }

  if (provider === 'gemini') {
    return MODEL_PRICING_TABLE['gemini-1.5-flash'];
  }
  if (provider === 'groq') {
    return MODEL_PRICING_TABLE['llama-3.3-70b-versatile'];
  }
  if (provider === 'deepseek') {
    return MODEL_PRICING_TABLE['deepseek-chat'];
  }
  if (provider === 'anthropic') {
    return MODEL_PRICING_TABLE['claude-3-5-haiku-20241022'];
  }
  if (provider === 'openai') {
    return MODEL_PRICING_TABLE['gpt-4o-mini'];
  }

  return MODEL_PRICING_TABLE['default_open_weights'];
}

/**
 * Format USD amount with high precision for micro-transactions
 */
export function formatUSD(amount: number): string {
  if (amount <= 0) return '$0.00';
  if (amount < 0.0001) return '< $0.0001';
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(3)}`;
}

/**
 * Calculate full cost estimation for a specific playground slot
 */
export function calculateSlotCost(
  slotId: string,
  provider: SupportedProvider,
  modelId: string,
  promptText: string,
  projectedOutputTokens: number = 350
): SlotCostEstimate {
  const { totalTokens: inputTokens } = estimateTokensCount(promptText);
  const rateInfo = getPricingForModel(modelId, provider);

  const inputCostUSD = (inputTokens / 1_000_000) * rateInfo.inputPer1MTokens;
  const outputCostUSD = (projectedOutputTokens / 1_000_000) * rateInfo.outputPer1MTokens;
  const totalCostUSD = inputCostUSD + outputCostUSD;

  return {
    slotId,
    provider,
    modelId,
    inputTokens,
    projectedOutputTokens,
    inputCostUSD,
    outputCostUSD,
    totalCostUSD,
    formattedTotalUSD: formatUSD(totalCostUSD),
    isFreeTier: !!rateInfo.isFreeTierAvailable,
    rateInfo
  };
}

/**
 * Calculate aggregated comparison run cost across all active slots
 */
export function calculateAggregateRunCost(
  slots: { id: string; provider: SupportedProvider; modelId: string }[],
  promptText: string,
  projectedOutputTokens: number = 350
): {
  estimates: SlotCostEstimate[];
  totalInputTokens: number;
  totalProjectedOutputTokens: number;
  totalRunCostUSD: number;
  formattedRunCostUSD: string;
  hasFreeTierOption: boolean;
} {
  const estimates = slots.map((s) =>
    calculateSlotCost(s.id, s.provider, s.modelId, promptText, projectedOutputTokens)
  );

  const totalRunCostUSD = estimates.reduce((acc, curr) => acc + curr.totalCostUSD, 0);
  const totalInputTokens = estimates[0]?.inputTokens || 0;
  const totalProjectedOutputTokens = projectedOutputTokens * slots.length;
  const hasFreeTierOption = estimates.some((e) => e.isFreeTier);

  return {
    estimates,
    totalInputTokens,
    totalProjectedOutputTokens,
    totalRunCostUSD,
    formattedRunCostUSD: formatUSD(totalRunCostUSD),
    hasFreeTierOption
  };
}
