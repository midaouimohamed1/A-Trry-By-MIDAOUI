export type AICategory =
  | 'All'
  | 'LLMs & Chatbots'
  | 'Code & Development'
  | 'Image & Art Generation'
  | 'Video & Animation'
  | 'Audio, Voice & Music'
  | 'Search & Research'
  | 'Productivity & Writing'
  | '3D & Gaming'
  | 'AI Agents & Automation'
  | 'Data Science & MLOps'
  | 'Design & UI/UX'
  | 'Marketing & SEO'
  | 'Education & Science'
  | 'Healthcare & Bio'
  | 'Business & Finance'
  | 'Vision & Multimodal';

export type AIPricing = 'Free' | 'Freemium' | 'Paid' | 'Open Source';

export interface ModelApiPricing {
  inputPricePer1M: number; // USD per 1M input tokens
  outputPricePer1M: number; // USD per 1M output tokens
  cachedInputPricePer1M?: number; // USD per 1M cached tokens
  contextWindow?: string; // e.g. "128K", "1M", "200K"
  officialPricingUrl?: string;
  tierCategory?: 'Flagship' | 'Cost-Efficient' | 'Reasoning' | 'Open Weights Hosting' | 'Specialized';
  tierCategoryAr?: string;
}

export interface AIModel {
  rank: number;
  name: string;
  developer: string;
  category: string;
  categoryAr: string;
  popularityScore: number; // 1-100
  pricing: AIPricing;
  pricingAr: string;
  url: string;
  descriptionAr: string;
  descriptionEn: string;
  keyFeaturesAr: string[];
  keyFeaturesEn: string[];
  releaseYear: string;
  license: string;
  isTrending?: boolean;
  highlight?: string;
  apiPricing?: ModelApiPricing;
  openRouterModelId?: string;
  lastUpdated?: string; // ISO Date or formatted string (e.g. '2026-08')
  verified?: boolean;
}

export interface ModelsDatasetMetadata {
  version: string;
  lastUpdated: string;
  lastUpdatedFormattedAr: string;
  totalModels: number;
  apiModelsCount: number;
  source: string;
}

export interface PDFExportOptions {
  title: string;
  includeFeatures: boolean;
  includeLinks: boolean;
  categoryFilter: string;
  maxCount: number;
  language: 'ar' | 'en' | 'both';
  sortOrder: 'rank_asc' | 'rank_desc' | 'name_asc' | 'popularity_desc';
}

// 1. API Cost Calculator Types
export interface LLMPricingTier {
  id: string;
  name: string;
  developer: string;
  inputPricePer1M: number; // USD per 1M input tokens
  outputPricePer1M: number; // USD per 1M output tokens
  cachedInputPricePer1M?: number; // USD per 1M cached tokens
  contextWindow: string; // e.g., "128K", "1M", "2M"
  tierCategory: 'Flagship' | 'Cost-Efficient' | 'Reasoning' | 'Open Weights Hosting' | 'Specialized';
  tierCategoryAr: string;
  modelRank?: number;
  officialPricingUrl: string;
  category?: string;
}

export interface CostCalculationResult {
  tier: LLMPricingTier;
  monthlyInputCost: number;
  monthlyOutputCost: number;
  totalMonthlyCost: number;
  totalAnnualCost: number;
  costPer1kRequests: number;
}

// 2. AI Model Finder Wizard Types
export type WizardUseCase =
  | 'code'
  | 'reasoning'
  | 'writing'
  | 'multimodal'
  | 'agents'
  | 'research';

export type WizardBudget =
  | 'free'
  | 'low_cost'
  | 'performance'
  | 'open_source';

export type WizardPrivacy =
  | 'self_hosted'
  | 'cloud_api'
  | 'web_ui';

export interface WizardAnswers {
  useCase: WizardUseCase | null;
  budget: WizardBudget | null;
  privacy: WizardPrivacy | null;
}

export interface WizardRecommendation {
  model: AIModel;
  matchScore: number; // percentage (e.g. 98%)
  matchBadge: string;
  matchBadgeAr: string;
  reasonsAr: string[];
  reasonsEn: string[];
}

// 3. Export System Types (Simplified: Markdown & JSON only)
export type ExportFormat = 'markdown' | 'json';

// 4. BYOK (Bring Your Own Key) Playground Types
export type SupportedProvider = 'huggingface' | 'openrouter' | 'openai' | 'anthropic' | 'gemini' | 'groq' | 'deepseek';

export interface ProviderConfig {
  id: SupportedProvider;
  name: string;
  keyPlaceholder: string;
  models: {
    id: string;
    name: string;
    modelRank?: number;
  }[];
  docsUrl: string;
}

export interface PlaygroundGroundingMetadata {
  isGrounded: boolean;
  webSearchQueries?: string[];
  searchChunks?: Array<{
    uri: string;
    title: string;
  }>;
}

export interface PlaygroundExecutionResult {
  modelId: string;
  modelName: string;
  provider: SupportedProvider;
  latencyMs: number;
  status: 'idle' | 'loading' | 'warming_up' | 'success' | 'error';
  responseContent: string;
  errorMessage?: string;
  isWarmingUp?: boolean;
  warmupMessage?: string;
  retryCount?: number;
  proxyUsed?: boolean;
  cached?: boolean;
  cacheMatchType?: string;
  cacheSimilarityScore?: number;
  groundingMetadata?: PlaygroundGroundingMetadata;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

