import { AIModel } from '../types';
import { models_1_100 } from './models_1_100';
import { models_101_200 } from './models_101_200';
import { models_201_300 } from './models_201_300';
import { models_301_400 } from './models_301_400';
import { models_401_450 } from './models_401_450';
import { models_451_500 } from './models_451_500';
import { models_501_600 } from './models_501_600';
import { models_601_700 } from './models_601_700';
import { models_701_800 } from './models_701_800';
import { models_801_900 } from './models_801_900';
import { models_901_1000 } from './models_901_1000';

const rawModelsList: AIModel[] = [
  ...models_1_100,
  ...models_101_200,
  ...models_201_300,
  ...models_301_400,
  ...models_401_450,
  ...models_451_500,
  ...models_501_600,
  ...models_601_700,
  ...models_701_800,
  ...models_801_900,
  ...models_901_1000
];

export const allAIModels: AIModel[] = rawModelsList.map((m) => ({
  ...m,
  lastUpdated: m.lastUpdated || '2026-08',
  verified: m.verified !== undefined ? m.verified : true
}));

export const TOTAL_MODELS_COUNT = allAIModels.length;

export const DATASET_METADATA = {
  version: '2026.2.1',
  lastUpdated: '2026-08-14T12:00:00Z',
  lastUpdatedFormattedAr: '14 أغسطس 2026 (تحديث حي)',
  lastUpdatedFormattedEn: 'August 14, 2026 (Live Update)',
  totalModels: TOTAL_MODELS_COUNT,
  apiModelsCount: allAIModels.filter((m) => m.apiPricing || m.license.includes('API')).length,
  source: 'OpenRouter & Global Official Benchmarks',
  refreshInterval: 'يومي / Real-Time Live Index'
};

export const CATEGORIES = [
  { id: 'All', nameAr: 'جميع الفئات', nameEn: 'All Categories', count: TOTAL_MODELS_COUNT },
  { id: 'LLMs & Chatbots', nameAr: 'نماذج لغوية وروبوتات دردشة', nameEn: 'LLMs & Chatbots' },
  { id: 'Code & Development', nameAr: 'البرمجة والتطوير', nameEn: 'Code & Development' },
  { id: 'Image & Design', nameAr: 'الصور والتصميم', nameEn: 'Image & Design' },
  { id: 'Image & Art Generation', nameAr: 'توليد الصور والفنون', nameEn: 'Image & Art Generation' },
  { id: 'Design & UI/UX', nameAr: 'التصميم وتجربة المستخدم', nameEn: 'Design & UI/UX' },
  { id: 'Video & Animation', nameAr: 'الفيديو والرسوم المتحركة', nameEn: 'Video & Animation' },
  { id: 'Audio, Voice & Music', nameAr: 'الصوتيات والموسيقى', nameEn: 'Audio, Voice & Music' },
  { id: 'Search & Research', nameAr: 'البحث والاستكشاف', nameEn: 'Search & Research' },
  { id: 'Productivity & Writing', nameAr: 'الإنتاجية والكتابة', nameEn: 'Productivity & Writing' },
  { id: 'AI Agents & Automation', nameAr: 'الوكلاء والأتمتة', nameEn: 'AI Agents & Automation' },
  { id: 'Marketing & SEO', nameAr: 'التسويق وصناعة المحتوى', nameEn: 'Marketing & SEO' },
  { id: 'Vision & Multimodal', nameAr: 'الرؤية والوسائط المتعددة', nameEn: 'Vision & Multimodal' },
  { id: '3D & Gaming', nameAr: 'الثلاثي الأبعاد والألعاب', nameEn: '3D & Gaming' },
  { id: 'Data Science & MLOps', nameAr: 'علوم البيانات والبنية التحتية', nameEn: 'Data Science & MLOps' },
  { id: 'Business & Finance', nameAr: 'الأعمال والمالية', nameEn: 'Business & Finance' },
  { id: 'Education & Science', nameAr: 'التعليم والعلوم الأكاديمية', nameEn: 'Education & Science' },
  { id: 'Healthcare & Bio', nameAr: 'الرعاية الصحية والطب', nameEn: 'Healthcare & Bio' }
] as const;

export const PRICING_OPTIONS = [
  { id: 'All', nameAr: 'جميع الخطط', nameEn: 'All Pricing' },
  { id: 'Free', nameAr: 'مجاني بالكامل', nameEn: 'Free' },
  { id: 'Freemium', nameAr: 'مجاني / مدفوع (Freemium)', nameEn: 'Freemium' },
  { id: 'Open Source', nameAr: 'مفتوح المصدر (Open Source)', nameEn: 'Open Source' },
  { id: 'Paid', nameAr: 'مدفوع (Paid / Enterprise)', nameEn: 'Paid' }
] as const;
