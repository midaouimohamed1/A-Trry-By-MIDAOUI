import { LLMPricingTier, AIModel } from '../types';
import { allAIModels } from './allModels';

/**
 * Base curated official pricing catalog with known flagship benchmarks
 */
export const OFFICIAL_PRICING_TIERS: LLMPricingTier[] = [
  {
    id: 'deepseek-v3',
    name: 'DeepSeek-V3',
    developer: 'DeepSeek',
    inputPricePer1M: 0.14,
    outputPricePer1M: 0.28,
    cachedInputPricePer1M: 0.014,
    contextWindow: '64K',
    tierCategory: 'Cost-Efficient',
    tierCategoryAr: 'اقتصادي فائق الكفاءة',
    modelRank: 5,
    officialPricingUrl: 'https://platform.deepseek.com/api-docs/pricing/',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek-R1 (Reasoning)',
    developer: 'DeepSeek',
    inputPricePer1M: 0.55,
    outputPricePer1M: 2.19,
    cachedInputPricePer1M: 0.14,
    contextWindow: '64K',
    tierCategory: 'Reasoning',
    tierCategoryAr: 'استدلال وتفكير منطقي',
    modelRank: 5,
    officialPricingUrl: 'https://platform.deepseek.com/api-docs/pricing/',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'gemini-2-flash',
    name: 'Gemini 2.0 Flash',
    developer: 'Google DeepMind',
    inputPricePer1M: 0.10,
    outputPricePer1M: 0.40,
    cachedInputPricePer1M: 0.025,
    contextWindow: '1M',
    tierCategory: 'Cost-Efficient',
    tierCategoryAr: 'اقتصادي فائق الكفاءة',
    modelRank: 3,
    officialPricingUrl: 'https://ai.google.dev/pricing',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'gemini-1-5-flash',
    name: 'Gemini 1.5 Flash',
    developer: 'Google DeepMind',
    inputPricePer1M: 0.075,
    outputPricePer1M: 0.30,
    cachedInputPricePer1M: 0.01875,
    contextWindow: '1M',
    tierCategory: 'Cost-Efficient',
    tierCategoryAr: 'اقتصادي فائق الكفاءة',
    modelRank: 3,
    officialPricingUrl: 'https://ai.google.dev/pricing',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'gemini-1-5-pro',
    name: 'Gemini 1.5 Pro',
    developer: 'Google DeepMind',
    inputPricePer1M: 1.25,
    outputPricePer1M: 5.00,
    cachedInputPricePer1M: 0.3125,
    contextWindow: '2M',
    tierCategory: 'Flagship',
    tierCategoryAr: 'نموذج رائد (Flagship)',
    modelRank: 3,
    officialPricingUrl: 'https://ai.google.dev/pricing',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    developer: 'OpenAI',
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.60,
    cachedInputPricePer1M: 0.075,
    contextWindow: '128K',
    tierCategory: 'Cost-Efficient',
    tierCategoryAr: 'اقتصادي فائق الكفاءة',
    modelRank: 1,
    officialPricingUrl: 'https://openai.com/api/pricing/',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Omni)',
    developer: 'OpenAI',
    inputPricePer1M: 2.50,
    outputPricePer1M: 10.00,
    cachedInputPricePer1M: 1.25,
    contextWindow: '128K',
    tierCategory: 'Flagship',
    tierCategoryAr: 'نموذج رائد (Flagship)',
    modelRank: 1,
    officialPricingUrl: 'https://openai.com/api/pricing/',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'openai-o3-mini',
    name: 'OpenAI o3-mini',
    developer: 'OpenAI',
    inputPricePer1M: 1.10,
    outputPricePer1M: 4.40,
    cachedInputPricePer1M: 0.55,
    contextWindow: '200K',
    tierCategory: 'Reasoning',
    tierCategoryAr: 'استدلال وتفكير منطقي',
    modelRank: 1,
    officialPricingUrl: 'https://openai.com/api/pricing/',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'openai-o1',
    name: 'OpenAI o1',
    developer: 'OpenAI',
    inputPricePer1M: 15.00,
    outputPricePer1M: 60.00,
    cachedInputPricePer1M: 7.50,
    contextWindow: '200K',
    tierCategory: 'Reasoning',
    tierCategoryAr: 'استدلال وتفكير منطقي',
    modelRank: 1,
    officialPricingUrl: 'https://openai.com/api/pricing/',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    developer: 'Anthropic',
    inputPricePer1M: 0.80,
    outputPricePer1M: 4.00,
    cachedInputPricePer1M: 0.08,
    contextWindow: '200K',
    tierCategory: 'Cost-Efficient',
    tierCategoryAr: 'اقتصادي فائق الكفاءة',
    modelRank: 2,
    officialPricingUrl: 'https://www.anthropic.com/pricing',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    developer: 'Anthropic',
    inputPricePer1M: 3.00,
    outputPricePer1M: 15.00,
    cachedInputPricePer1M: 0.30,
    contextWindow: '200K',
    tierCategory: 'Flagship',
    tierCategoryAr: 'نموذج رائد (Flagship)',
    modelRank: 2,
    officialPricingUrl: 'https://www.anthropic.com/pricing',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    developer: 'Anthropic',
    inputPricePer1M: 15.00,
    outputPricePer1M: 75.00,
    cachedInputPricePer1M: 1.50,
    contextWindow: '200K',
    tierCategory: 'Flagship',
    tierCategoryAr: 'نموذج رائد (Flagship)',
    modelRank: 2,
    officialPricingUrl: 'https://www.anthropic.com/pricing',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'llama-3-3-70b',
    name: 'Llama 3.3 70B (Groq / Together)',
    developer: 'Meta / Groq / Together',
    inputPricePer1M: 0.59,
    outputPricePer1M: 0.79,
    contextWindow: '128K',
    tierCategory: 'Open Weights Hosting',
    tierCategoryAr: 'استضافة أوزان مفتوحة',
    modelRank: 8,
    officialPricingUrl: 'https://groq.com/pricing/',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'llama-3-1-405b',
    name: 'Llama 3.1 405B (Together / Fireworks)',
    developer: 'Meta / Together AI',
    inputPricePer1M: 3.50,
    outputPricePer1M: 3.50,
    contextWindow: '128K',
    tierCategory: 'Open Weights Hosting',
    tierCategoryAr: 'استضافة أوزان مفتوحة',
    modelRank: 8,
    officialPricingUrl: 'https://together.ai/pricing',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'qwen-2-5-72b',
    name: 'Qwen 2.5 72B (Alibaba / Together)',
    developer: 'Alibaba Cloud / Together',
    inputPricePer1M: 0.40,
    outputPricePer1M: 0.40,
    contextWindow: '128K',
    tierCategory: 'Open Weights Hosting',
    tierCategoryAr: 'استضافة أوزان مفتوحة',
    modelRank: 42,
    officialPricingUrl: 'https://www.alibabacloud.com/help/en/model-studio/developer-reference/pricing',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'qwen-2-5-coder-32b',
    name: 'Qwen 2.5 Coder 32B',
    developer: 'Alibaba Cloud',
    inputPricePer1M: 0.20,
    outputPricePer1M: 0.20,
    contextWindow: '128K',
    tierCategory: 'Cost-Efficient',
    tierCategoryAr: 'اقتصادي فائق الكفاءة',
    modelRank: 42,
    officialPricingUrl: 'https://www.alibabacloud.com/help/en/model-studio/developer-reference/pricing',
    category: 'Code & Development'
  },
  {
    id: 'mistral-large-2',
    name: 'Mistral Large 2 (2407)',
    developer: 'Mistral AI',
    inputPricePer1M: 2.00,
    outputPricePer1M: 6.00,
    contextWindow: '128K',
    tierCategory: 'Flagship',
    tierCategoryAr: 'نموذج رائد (Flagship)',
    modelRank: 17,
    officialPricingUrl: 'https://mistral.ai/technology/#pricing',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'mistral-codestral',
    name: 'Mistral Codestral (22B)',
    developer: 'Mistral AI',
    inputPricePer1M: 0.30,
    outputPricePer1M: 0.90,
    contextWindow: '256K',
    tierCategory: 'Cost-Efficient',
    tierCategoryAr: 'اقتصادي فائق الكفاءة',
    modelRank: 17,
    officialPricingUrl: 'https://mistral.ai/technology/#pricing',
    category: 'Code & Development'
  },
  {
    id: 'mistral-nemo',
    name: 'Mistral NeMo (12B)',
    developer: 'Mistral AI',
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.15,
    contextWindow: '128K',
    tierCategory: 'Cost-Efficient',
    tierCategoryAr: 'اقتصادي فائق الكفاءة',
    modelRank: 17,
    officialPricingUrl: 'https://mistral.ai/technology/#pricing',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'cohere-command-r-plus',
    name: 'Command R+ (08-2024)',
    developer: 'Cohere',
    inputPricePer1M: 2.50,
    outputPricePer1M: 10.00,
    cachedInputPricePer1M: 1.25,
    contextWindow: '128K',
    tierCategory: 'Flagship',
    tierCategoryAr: 'نموذج رائد (Flagship)',
    modelRank: 44,
    officialPricingUrl: 'https://cohere.com/pricing',
    category: 'AI Agents & Automation'
  },
  {
    id: 'cohere-command-r',
    name: 'Command R (08-2024)',
    developer: 'Cohere',
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.60,
    contextWindow: '128K',
    tierCategory: 'Cost-Efficient',
    tierCategoryAr: 'اقتصادي فائق الكفاءة',
    modelRank: 44,
    officialPricingUrl: 'https://cohere.com/pricing',
    category: 'AI Agents & Automation'
  },
  {
    id: 'grok-2',
    name: 'Grok 2 (1212)',
    developer: 'xAI',
    inputPricePer1M: 2.00,
    outputPricePer1M: 10.00,
    contextWindow: '128K',
    tierCategory: 'Flagship',
    tierCategoryAr: 'نموذج رائد (Flagship)',
    modelRank: 16,
    officialPricingUrl: 'https://x.ai/api',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'grok-2-mini',
    name: 'Grok 2 mini',
    developer: 'xAI',
    inputPricePer1M: 0.20,
    outputPricePer1M: 1.00,
    contextWindow: '128K',
    tierCategory: 'Cost-Efficient',
    tierCategoryAr: 'اقتصادي فائق الكفاءة',
    modelRank: 16,
    officialPricingUrl: 'https://x.ai/api',
    category: 'LLMs & Chatbots'
  },
  {
    id: 'whisper-large-v3',
    name: 'Whisper Large v3 (Audio API)',
    developer: 'OpenAI / Groq',
    inputPricePer1M: 0.006, // Per minute or equivalent token batch
    outputPricePer1M: 0.006,
    contextWindow: 'Audio Stream',
    tierCategory: 'Specialized',
    tierCategoryAr: 'تخصصي (صوتيات ورؤية)',
    modelRank: 23,
    officialPricingUrl: 'https://groq.com/pricing/',
    category: 'Audio, Voice & Music'
  },
  {
    id: 'flux-schnell-api',
    name: 'FLUX.1 Schnell (Together API)',
    developer: 'Black Forest Labs / Together',
    inputPricePer1M: 0.003, // per image unit
    outputPricePer1M: 0.003,
    contextWindow: 'Image Generation',
    tierCategory: 'Specialized',
    tierCategoryAr: 'تخصصي (صوتيات ورؤية)',
    modelRank: 12,
    officialPricingUrl: 'https://together.ai/pricing',
    category: 'Image & Design'
  }
];

/**
 * Dynamic extraction function that harvests pricing info from allAIModels
 * whenever a model has `apiPricing` attached or falls back to known developer tiers.
 */
export function getAllDynamicPricingTiers(): LLMPricingTier[] {
  const dynamicTiersMap = new Map<string, LLMPricingTier>();

  // 1. Add baseline curated tiers
  for (const tier of OFFICIAL_PRICING_TIERS) {
    dynamicTiersMap.set(tier.id, tier);
  }

  // 2. Scan all models in database for explicit apiPricing or matchable names
  for (const model of allAIModels) {
    if (model.apiPricing) {
      const tierId = `model-rank-${model.rank}`;
      dynamicTiersMap.set(tierId, {
        id: tierId,
        name: model.name,
        developer: model.developer,
        inputPricePer1M: model.apiPricing.inputPricePer1M,
        outputPricePer1M: model.apiPricing.outputPricePer1M,
        cachedInputPricePer1M: model.apiPricing.cachedInputPricePer1M,
        contextWindow: model.apiPricing.contextWindow || '128K',
        tierCategory: model.apiPricing.tierCategory || (model.pricing === 'Open Source' ? 'Open Weights Hosting' : 'Cost-Efficient'),
        tierCategoryAr: model.apiPricing.tierCategoryAr || (model.pricing === 'Open Source' ? 'استضافة أوزان مفتوحة' : 'اقتصادي فائق الكفاءة'),
        modelRank: model.rank,
        officialPricingUrl: model.apiPricing.officialPricingUrl || model.url,
        category: model.category
      });
    }
  }

  return Array.from(dynamicTiersMap.values());
}

export interface UsagePreset {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  monthlyInputTokens: number;
  monthlyOutputTokens: number;
  monthlyRequests: number;
}

export const USAGE_PRESETS: UsagePreset[] = [
  {
    id: 'light-app',
    nameAr: 'تطبيق خفيف / موقع شخصي',
    nameEn: 'Light App / Hobbyist',
    descriptionAr: 'حوالي 5,000 استفسار شهرياً، وتلخيصات نصوص قصيرة',
    monthlyInputTokens: 5_000_000, // 5M tokens
    monthlyOutputTokens: 2_000_000, // 2M tokens
    monthlyRequests: 5_000
  },
  {
    id: 'saas-startup',
    nameAr: 'منصة SaaS متوسطة / روبوت خدمة عملاء',
    nameEn: 'Medium SaaS / Customer Support',
    descriptionAr: 'حوالي 50,000 محادثة متقدمة وتحليلات وثائق مستمرة',
    monthlyInputTokens: 50_000_000, // 50M tokens
    monthlyOutputTokens: 20_000_000, // 20M tokens
    monthlyRequests: 50_000
  },
  {
    id: 'enterprise-heavy',
    nameAr: 'مؤسسة / استهلاك ضخم RAG & Agents',
    nameEn: 'Enterprise Heavy RAG & Workflows',
    descriptionAr: 'معالجة ملايين الوثائق ومئات آلاف المهام الآلية',
    monthlyInputTokens: 300_000_000, // 300M tokens
    monthlyOutputTokens: 100_000_000, // 100M tokens
    monthlyRequests: 250_000
  }
];
