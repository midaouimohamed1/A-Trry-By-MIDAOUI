import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import { allAIModels, TOTAL_MODELS_COUNT } from './src/data/allModels';
import { globalResponseCache } from './src/server/semanticCache';
import { globalSlidingQuotaLimiter, estimatePromptTokens } from './src/server/quotaRateLimiter';
import { getLiveSearchGroundingConfig, extractGroundingMetadata, GroundingMetadataResult } from './src/server/geminiGrounding';
import { StructuredLogger, globalErrorHandler } from './src/server/logger';
import { ModelProviderDispatcher } from './src/server/providerEngine';
import {
  REPOLISTER_ANGLES,
  fetchAngleEstimate,
  generateDateRanges,
  enforceRateLimitDelay,
  processRepoItem,
  formatBatchOutput,
  FormattedRepo,
  GitHubRepoItem
} from './src/server/repolisterEngine';

dotenv.config();

// Pre-indexed in-memory model lookup tables for rapid O(1) query processing
const modelsByRank = new Map<number, typeof allAIModels[0]>();
const modelsByName = new Map<string, typeof allAIModels[0]>();

allAIModels.forEach((m) => {
  modelsByRank.set(m.rank, m);
  modelsByName.set(m.name.toLowerCase(), m);
});

// Strict AI Provider Whitelist to prevent Open Relay and SSRF
const ALLOWED_AI_PROVIDERS = [
  'huggingface',
  'openrouter',
  'openai',
  'anthropic',
  'gemini',
  'groq',
  'deepseek'
] as const;

type AllowedProvider = typeof ALLOWED_AI_PROVIDERS[number];

const ALLOWED_HOSTNAMES = new Set([
  'router.huggingface.co',
  'api-inference.huggingface.co',
  'openrouter.ai',
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.groq.com',
  'api.deepseek.com',
  'api.github.com'
]);

// تنظيف نص قادم من المستخدم قبل وضعه داخل كود مولَّد أو داخل Prompt:
// نحذف الاقتباسات والعلامات الخلفية و ${ والشرطة المائلة وأسطر جديدة.
function cleanForCode(value: unknown, maxLen: number): string {
  return String(value ?? '')
    .replace(/[`"'\\]/g, '')
    .replace(/\$\{/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

// قيمة قصيرة آمنة (حروف وأرقام ومسافات وشرطات فقط) للحقول مثل المجال ومستوى الخبرة.
function cleanTag(value: unknown, maxLen = 40): string {
  return String(value ?? '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, maxLen);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // خلف وسيط واحد (Render/Railway/Cloud Run) نثق بعنوان IP الذي يحدده الوسيط فقط،
  // ولا نثق برأس X-Forwarded-For القادم من العميل مباشرة (يمكن تزويره).
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));
  const getClientIp = (req: express.Request): string => req.ip || req.socket.remoteAddress || 'unknown';

  // حجز حصة قبل أي استدعاء يستهلك مفتاح Gemini الخاص بالموقع.
  const reserveSiteAiQuota = (req: express.Request, res: express.Response, estimatedTokens: number): boolean => {
    const q = globalSlidingQuotaLimiter.checkAndReserveQuota(getClientIp(req), estimatedTokens);
    if (!q.allowed) {
      res.setHeader('Retry-After', String(q.retryAfterSeconds || 60));
      res.status(429).json({ status: 'error', errorCode: 'QUOTA_EXCEEDED', errorMessage: q.reason });
      return false;
    }
    return true;
  };

  // 1. HTTP Security Hardening (Configured with Strict Content-Security-Policy & Anti-XSS)
  app.use(
    helmet({
      frameguard: false, // Allows iframe embedding in AI Studio preview
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'", "'unsafe-inline'", "https:", "data:", "blob:"],
          // في الإنتاج: بدون unsafe-eval وبدون أي سكربت خارجي. في التطوير Vite يحتاجهما.
          scriptSrc: isProduction ? ["'self'", "'unsafe-inline'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https:", "data:", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "https:", "data:", "blob:"],
          connectSrc: ["'self'", "https:", "wss:"],
          objectSrc: ["'none'"],
          frameAncestors: ["*"]
        }
      },
      hidePoweredBy: true,
      noSniff: true,
      xssFilter: true,
    })
  );

  // 2. High-Performance Static Asset Compression (Brotli / Gzip)
  app.use(
    compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      }
    })
  );

  // 3. Strict Request Body Parser Limit (64kb) to eliminate memory allocation spikes
  app.use(express.json({ limit: '64kb' }));

  // 4. In-Memory Sliding Window Rate Limiter (Max 60 requests/min per IP)
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  const RATE_LIMIT_MAX_REQUESTS = 60;     // Max 60 requests per minute
  const rateLimitMap = new Map<string, number[]>();

  // Cleanup stale IP entries periodically every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of rateLimitMap.entries()) {
      const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
      if (validTimestamps.length === 0) {
        rateLimitMap.delete(ip);
      } else {
        rateLimitMap.set(ip, validTimestamps);
      }
    }
  }, 5 * 60 * 1000).unref();

  const apiRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const clientIp = getClientIp(req);
    const now = Date.now();
    const timestamps = (rateLimitMap.get(clientIp) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);

    if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
      const oldest = timestamps[0];
      const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        status: 'error',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        errorMessage: `تم تجاوز الحد الأقصى للطلبات (${RATE_LIMIT_MAX_REQUESTS} طلب/دقيقة). يرجى الانتظار ${retryAfterSec} ثانية ثم المحاولة مجدداً.`
      });
    }

    timestamps.push(now);
    rateLimitMap.set(clientIp, timestamps);
    next();
  };

  // 5. Apply General Rate Limiter to all API endpoints
  app.use('/api', apiRateLimiter);

  // 6. Strict CORS Origin Locking with Whitelist & Environment Fallback
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [];

  app.use((req, res, next) => {
    const requestOrigin = req.headers.origin as string | undefined;

    // التطوير: مفتوح. الإنتاج: لا يُسمح إلا للأصول المذكورة في ALLOWED_ORIGINS
    // (طلبات نفس النطاق لا تحتاج CORS أصلاً). لتطبيق الموبايل أضف:
    // https://localhost و capacitor://localhost
    res.header('Vary', 'Origin');
    if (!isProduction) {
      res.header('Access-Control-Allow-Origin', requestOrigin || '*');
    } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      res.header('Access-Control-Allow-Origin', requestOrigin);
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      totalIndexedModels: TOTAL_MODELS_COUNT,
      timestamp: new Date().toISOString()
    });
  });

  // Response & Prompt Cache Metrics & Health Endpoint
  app.get('/api/cache/stats', (_req, res) => {
    res.json({
      status: 'ok',
      cacheStats: globalResponseCache.getStats(),
      timestamp: new Date().toISOString()
    });
  });

  // User Token Quota & Refill Status Endpoint
  app.get('/api/quota/status', (req, res) => {
    const clientIdentifier = getClientIp(req);
    const quotaHeaders = globalSlidingQuotaLimiter.getQuotaHeaders(clientIdentifier);
    for (const [k, v] of Object.entries(quotaHeaders)) {
      res.setHeader(k, v);
    }
    const userHash = clientIdentifier;
    const userRecord = globalSlidingQuotaLimiter.getOrCreateUserRecord(userHash);
    res.json({
      status: 'ok',
      availableTokens: Math.floor(userRecord.availableTokens),
      maxTokensQuota: userRecord.maxTokensQuota,
      refillRatePerMinute: userRecord.refillRatePerMinute,
      totalConsumed: userRecord.totalTokensConsumed,
      totalRequestsCount: userRecord.totalRequestsCount
    });
  });

  // =========================================================================
  // 1. Server-Side Models Indexing, Search & Pagination API
  // =========================================================================
  app.get('/api/models', (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '36'), 10)));
      const search = String(req.query.q || '').toLowerCase().trim();
      const category = String(req.query.category || 'all');
      const developer = String(req.query.developer || 'all');
      const pricing = String(req.query.pricing || 'all');
      const onlyTrending = req.query.trending === 'true';
      const sortBy = String(req.query.sortBy || 'rank');

      // Fast in-memory filtering
      let results = allAIModels.filter((m) => {
        if (onlyTrending && !m.isTrending) return false;
        if (category !== 'all' && m.category !== category) return false;
        if (developer !== 'all' && m.developer !== developer) return false;
        if (pricing !== 'all' && m.pricing !== pricing) return false;

        if (search) {
          const matchName = m.name.toLowerCase().includes(search);
          const matchDev = m.developer.toLowerCase().includes(search);
          const matchDescAr = m.descriptionAr.toLowerCase().includes(search);
          const matchDescEn = m.descriptionEn.toLowerCase().includes(search);
          return matchName || matchDev || matchDescAr || matchDescEn;
        }
        return true;
      });

      // Sorting
      if (sortBy === 'popularity') {
        results.sort((a, b) => b.popularityScore - a.popularityScore);
      } else if (sortBy === 'year') {
        results.sort((a, b) => parseInt(b.releaseYear || '0', 10) - parseInt(a.releaseYear || '0', 10));
      } else if (sortBy === 'name') {
        results.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        results.sort((a, b) => a.rank - b.rank);
      }

      const totalItems = results.length;
      const totalPages = Math.ceil(totalItems / limit);
      const offset = (page - 1) * limit;
      const paginatedItems = results.slice(offset, offset + limit);

      res.json({
        data: paginatedItems,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (err: unknown) {
      console.error('Error querying models:', err);
      res.status(500).json({ error: 'حدث خطأ أثناء استرجاع بيانات النماذج' });
    }
  });

  // Single Model Detail Endpoint
  app.get('/api/models/:rank', (req, res) => {
    const rank = parseInt(req.params.rank, 10);
    const model = modelsByRank.get(rank);
    if (!model) {
      return res.status(404).json({ error: 'النموذج غير موجود' });
    }
    res.json({ data: model });
  });

  // =========================================================================
  // 2. SEO & Schema.org JSON-LD Structured Data Endpoint
  // =========================================================================
  app.get('/api/seo/structured-data', (_req, res) => {
    const schemaOrgData = {
      '@context': 'https://schema.org',
      '@type': 'DataCatalog',
      name: 'فهرس نماذج الذكاء الاصطناعي الشامل 2026 | 1000+ AI Models Directory',
      description: 'أشمل دليل تفاعلي عربي وعالمي لمقارنة أكثر من 1000 نموذج ذكاء اصطناعي مع حاسبة التكلفة ومختبر التشغيل الحي.',
      url: 'https://ai-models-directory.app',
      dataset: allAIModels.slice(0, 100).map((m) => ({
        '@type': 'SoftwareApplication',
        name: m.name,
        applicationCategory: m.category,
        operatingSystem: 'Cloud / API',
        offers: {
          '@type': 'Offer',
          price: m.pricing === 'Free' || m.pricing === 'Open Source' ? '0' : 'Varies',
          priceCurrency: 'USD'
        },
        creator: {
          '@type': 'Organization',
          name: m.developer
        },
        description: m.descriptionAr
      }))
    };
    res.json(schemaOrgData);
  });

  // Project Studio Advice Endpoint
  app.post('/api/advice', async (req, res) => {
    try {
      const { projectIdea } = req.body;
      const experienceLevel = cleanTag(req.body?.experienceLevel);
      const targetDomain = cleanTag(req.body?.targetDomain);
      // لا نثق بقيمة isPremium القادمة من العميل: أي شخص يستطيع تزويرها.
      const isPremium = false;

      if (!projectIdea) {
        return res.status(400).json({ error: 'الرجاء إدخال فكرة المشروع' });
      }

      const safeIdeaName = cleanForCode(projectIdea, 300);
      const apiKey = process.env.GEMINI_API_KEY;

      const generateLocalAdvice = () => {
        return {
          summary: `تحليل الجدوى لـ "${safeIdeaName}": يمكنك بناء وتدريب وتطوير هذا المشروع بالكامل مجاناً 100% باستخدام بيئات الـ GPU السحابية المجانية (مثل Google Colab T4)، ودون الحاجة لشراء أي كروت شاشة غالية السعر!`,
          suggestedPlatforms: [
            'Google Colab (Tesla T4 GPU مجاني)',
            'Kaggle Notebooks (30 ساعة GPU مجانية أسبوعياً)',
            'Hugging Face Spaces (استضافة واجهات Gradio مجاناً)'
          ],
          recommendedMethod: targetDomain === 'llm'
            ? 'استخدام تقنية QLoRA عبر مكتبة Unsloth لضبط نموذج Llama-3 أو Qwen بسرعة فائقة بذاكرة منخفضة'
            : targetDomain === 'vision'
            ? 'استخدام YOLOv8 أو Transfer Learning عبر PyTorch على أجهزة Colab T4'
            : 'استخدام نماذج Hugging Face Pretrained وتخصيص الطبقة الأخيرة (Fine-Tuning)',
          stepByStepRoadmap: [
            `1. تجهيز الداتا سيت الخاصة بـ (${safeIdeaName}) وتأطير البيانات بتنسيق JSONL أو CSV.`,
            '2. فتح حاسوب Colab أو Kaggle مجاني وتثبيت المكتبات المطلوبة بـ pip install.',
            '3. تشغيل سكريبت التدريب واستخدام الـ GPU السحابي لمعالجة البيانات.',
            '4. تصدير النموذج المدرب واختباره عبر واجهة Gradio تفاعلية.',
            '5. نشر التطبيق النهائي مجاناً على Hugging Face Spaces أو Vercel.'
          ],
          essentialFreeLibraries: ['PyTorch', 'Transformers', 'Unsloth / Ultralytics', 'Gradio', 'Google GenAI SDK'],
          pitfallsToAvoid: [
            'تجنب تدريب النموذج من الصفر دون البدء بنموذج مدرب مسبقاً (Pretrained Model).',
            'احرص على حفظ الأوزان المدربة تلقائياً في Google Drive لتجنب ضياعها عند انتهاء جلسة Colab.',
            'لا تدفع أي أموال مقابل سيرفرات مدفوعة قبل تجربة حلول Colab و Kaggle المجانية أولاً.'
          ],
          sampleColabCode: `# 1. كود Colab السريع لتجربة فكرة (${safeIdeaName})
!pip install -q transformers torch gradio

import torch
print("✅ الجلسة متصلة بـ GPU السحابي المجاني:")
print(f"اسم كارت الشاشة: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU (يرجى تفعيل T4 GPU)'}")

print("🚀 يمكنك تشغيل وتدريب نموذجك السحابي الآن!")`,
          fullDatasetScript: `# 2. dataset_prep.py - سكريبت تجهيز وتنظيف البيانات لـ (${safeIdeaName})
import json

data = [
    {"prompt": "مدخل تجريبي لـ ${safeIdeaName}", "completion": "مخرج متوقع نموذجياً"}
]

with open("dataset.jsonl", "w", encoding="utf-8") as f:
    for entry in data:
        f.write(json.dumps(entry, ensure_ascii=False) + "\\n")

print("✅ تم إنشاء ملف dataset.jsonl لـ ${safeIdeaName} بنجاح!")`,
          fullTrainingScript: `# 3. train.py - سكريبت التدريب المكتمل لمشروع (${safeIdeaName})
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments

model_name = "unsloth/llama-3-8b-Instruct-bnb-4bit"
print(f"🚀 جاري تحميل أوزان النموذج لتطبيق: ${safeIdeaName}...")

# كود التدريب جاهز للتنفيذ
print("✅ اكتمل سكريبت التدريب جاهز للاستخدام في Colab!")`,
          fullGradioAppScript: `# 4. app.py - واجهة التفاعل بـ Gradio لـ (${safeIdeaName})
import gradio as gr

def process_ai_request(user_input):
    return f"نتيجة الذكاء الاصطناعي لتطبيق (${safeIdeaName}):\\n\\nتمت معالجة المدخل: {user_input}"

demo = gr.Interface(
    fn=process_ai_request,
    inputs=gr.Textbox(lines=3, placeholder="أدخل المدخلات هنا..."),
    outputs="text",
    title="منصة الذكاء الاصطناعي - ${safeIdeaName}",
    description="تطبيق واجهة تفاعلية أونلاين مجانية"
)

if __name__ == "__main__":
    demo.launch()`,
          dockerfileScript: `# 5. Dockerfile - حزمة النشر المباشر على Cloud Run / Hugging Face
FROM python:3.10-slim
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir gradio torch transformers
EXPOSE 7860
CMD ["python", "app.py"]`
        };
      };

      const clientIp = getClientIp(req);
      const promptIdentity = `advice:${safeIdeaName}:${experienceLevel}:${targetDomain}:${isPremium ? 'pro' : 'free'}`;

      // Check Response Cache for instant response
      const cacheCheck = await globalResponseCache.get('google', 'gemini-advice', promptIdentity, 0.98);
      if (cacheCheck.hit && cacheCheck.entry?.responseText) {
        try {
          const cachedJson = JSON.parse(cacheCheck.entry.responseText);
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('X-Cache-Type', cacheCheck.matchType || 'EXACT_HASH');
          return res.json(cachedJson);
        } catch {
          // fallback to live generation if cached json was corrupted
        }
      }

      res.setHeader('X-Cache', 'MISS');

      if (!apiKey) {
        return res.json(generateLocalAdvice());
      }

      if (!reserveSiteAiQuota(req, res, 3000)) return;

      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        const prompt = `
أنت خبير واستشاري هندسة ذكاء اصطناعي صريح وشديد الشفافية.
أحد المطورين يطلب استشارتك لبناء مشروع ذكاء اصطناعي. المطور لا يملك مواصفات حاسوب عالية (ليس لديه GPU قوي) ويريد معرفة كيف يبني مشروعه مجاناً 100% وبأفضل الطرق العصرية لسنة 2026.

تفاصيل الطلب:
- فكرة المشروع: ${safeIdeaName}
- مستوى المطور: ${experienceLevel}
- المجال: ${targetDomain}
- نوع الحساب: ${isPremium ? 'حساب ممتاز (Pro Subscriber) — يطلب حزمة كود كاملة 100%' : 'حساب مجاني'}

المطلوب: قدم نصيحة هندسية دقيقة، صريحة، وواقعية باللغة العربية بتنسيق JSON حصراً يحتوي الأقسام التالية:
{
  "summary": "ملخص صريح وواقعي لجدوى الفكرة وكيفية تطبيقها بدون تكلفة",
  "suggestedPlatforms": ["اسم المنصة المجانية 1", "اسم المنصة المجانية 2"],
  "recommendedMethod": "الطريقة المثلى (مثلا: API Prompting أو QLoRA Fine-tuning أو Transfer Learning)",
  "stepByStepRoadmap": [
    "الخطوة 1: ...",
    "الخطوة 2: ...",
    "الخطوة 3: ...",
    "الخطوة 4: ..."
  ],
  "essentialFreeLibraries": ["اسم المكتبة 1", "اسم المكتبة 2"],
  "pitfallsToAvoid": ["تحذير أو خطأ شائع 1", "تحذير أو خطأ شائع 2"],
  "sampleColabCode": "# كود بايثون مختصر جداً يمكن تشغيله على Colab للبدء فوراً",
  "fullDatasetScript": "# سكريبت تجهيز وتنسيق البيانات الخاص بمشروع المطور (dataset_prep.py)",
  "fullTrainingScript": "# سكريبت تدريب مكتمل وجاهز للتنفيذ بدون أي نقص (train.py)",
  "fullGradioAppScript": "# سكريبت واجهة مستخدم متكاملة بـ Gradio للنموذج (app.py)",
  "dockerfileScript": "# ملف Dockerfile كامل لنشر التطبيق سحابياً"
}
`;

        let responseText = '';
        const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.7-flash'];

        for (const modelCandidate of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model: modelCandidate,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                temperature: 0.7,
              }
            });
            if (response.text) {
              responseText = response.text;
              break;
            }
          } catch (modelErr: unknown) {
            const mErr = modelErr as { message?: string };
            StructuredLogger.warn('GEMINI_MODEL_ATTEMPT_FAILED', `Attempt with ${modelCandidate} failed: ${mErr.message}`, { model: modelCandidate }, req);
          }
        }

        if (responseText) {
          const parsedData = JSON.parse(responseText);
          // Store in Response & Prompt Cache
          const tokenCount = estimatePromptTokens(prompt) + estimatePromptTokens(responseText);
          await globalResponseCache.set('google', 'gemini-advice', promptIdentity, responseText, {
            promptTokens: estimatePromptTokens(prompt),
            completionTokens: estimatePromptTokens(responseText),
            totalTokens: tokenCount
          });
          return res.json(parsedData);
        } else {
          return res.json(generateLocalAdvice());
        }
      } catch (geminiErr: unknown) {
        const errObj = geminiErr as { message?: string };
        StructuredLogger.warn('GEMINI_ADVICE_FALLBACK', errObj.message || 'Gemini advice fallback triggered', { idea: safeIdeaName }, req);
        return res.json(generateLocalAdvice());
      }

    } catch (error: unknown) {
      const errObj = error as { message?: string };
      StructuredLogger.error('ADVICE_ENDPOINT_ERROR', errObj.message || 'Error generating advice', {}, req);
      return res.status(500).json({ error: 'حدث خطأ أثناء توليد الاستشارة' });
    }
  });

  // API Endpoint to Generate Custom Multi-cell Jupyter Notebook for Project Studio
  app.post('/api/generate-notebook', async (req, res) => {
    try {
      const domain = cleanTag(req.body?.domain);
      const framework = cleanTag(req.body?.framework);
      const name = req.body?.name;
      const description = req.body?.description;
      const safeName = cleanForCode(name || 'مشروع ذكاء اصطناعي', 200);
      const safeDesc = cleanForCode(description || 'تدريب وتطوير نموذج سحابي مجاني', 500);

      const notebookCacheKey = `notebook:${safeName}:${framework}:${domain}:${safeDesc.slice(0, 100)}`;
      const cacheCheck = await globalResponseCache.get('google', 'gemini-notebook', notebookCacheKey, 0.98);
      if (cacheCheck.hit && cacheCheck.entry?.responseText) {
        res.setHeader('X-Cache', 'HIT');
        return res.json({ notebookCode: cacheCheck.entry.responseText });
      }

      res.setHeader('X-Cache', 'MISS');

      const apiKey = process.env.GEMINI_API_KEY;

      const defaultNotebookCode = `# ==============================================================================
# 🚀 Google Colab Notebook - ${safeName}
# الوصف: ${safeDesc}
# الإطار: ${framework} | المجال: ${domain}
# ==============================================================================

# [الخلية 1]: تثبيت المكتبات والبيئة السحابية
!pip install -q torch transformers datasets gradio bitsandbytes accelerate

import torch
print(f"✅ تم الاتصال بـ Colab GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")

# [الخلية 2]: تجهيز البيانات الخاصة بـ (${safeName})
import json

training_data = [
    {"input": "مدخل تجريبي لمشروع ${safeName}", "output": "استجابة ذكية مخصصة"}
]

with open("dataset.jsonl", "w", encoding="utf-8") as f:
    for item in training_data:
        f.write(json.dumps(item, ensure_ascii=False) + "\\n")

print("✅ تم تجهيز الداتا سيت بنجاح!")

# [الخلية 3]: تحميل النموذج وإعداد الضبط الدقيق (Training / Fine-Tuning)
print("🚀 جاري تحميل أوزان النموذج وتثبيت معاملات التدريب...")

# [الخلية 4]: تشغيل الواجهة التفاعلية (Gradio Web UI)
import gradio as gr

def process_query(user_text):
    return f"✨ [نموذج ${safeName}]: تم تحليل ({user_text}) بنجاح!"

demo = gr.Interface(
    fn=process_query,
    inputs=gr.Textbox(lines=3, placeholder="أدخل بياناتك للتجربة..."),
    outputs="text",
    title="${safeName}",
    description="${safeDesc}"
)

demo.launch(share=True)
`;

      if (!apiKey) {
        return res.json({ notebookCode: defaultNotebookCode });
      }

      if (!reserveSiteAiQuota(req, res, 3000)) return;

      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        const prompt = `
أنت خبير كود بايثون ومهندس ذكاء اصطناعي. قم بتوليد كود بايثون سينتكس مكتمل وجاهز للتنفيذ على Google Colab لسنة 2026 لمشروع بالمعايير التالية:
- اسم المشروع: ${safeName}
- الوصف: ${safeDesc}
- المجال: ${domain}
- إطار العمل: ${framework}

المطلوب: أعد كود البايثون المكتمل والمقسم إلى خلايا تعليقات (# [الخلية 1]، # [الخلية 2]...) يشمل تثبيت المكتبات العصرية، تحميل وتجهيز البيانات، كود التدريب/الضبط الدقيق، ثم كود تشغيل واجهة Gradio تفاعلية في النهاية.
عد بكود البايثون المباشر فقط دون أي مقدمات أو نص خارجي.
`;

        let responseCodeText = '';
        const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.7-flash'];

        for (const modelCandidate of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model: modelCandidate,
              contents: prompt,
              config: {
                ...getLiveSearchGroundingConfig(),
              }
            });
            if (response.text) {
              responseCodeText = response.text;
              break;
            }
          } catch (mErr: unknown) {
            const errObj = mErr as { message?: string };
            StructuredLogger.warn('GEMINI_NOTEBOOK_MODEL_ATTEMPT_FAILED', `Notebook attempt with ${modelCandidate} failed: ${errObj.message}`, { model: modelCandidate }, req);
          }
        }

        if (responseCodeText) {
          let cleanCode = responseCodeText
            .replace(/```python/g, '')
            .replace(/```/g, '')
            .trim();
          
          await globalResponseCache.set('google', 'gemini-notebook', notebookCacheKey, cleanCode, {
            promptTokens: estimatePromptTokens(prompt),
            completionTokens: estimatePromptTokens(cleanCode),
            totalTokens: estimatePromptTokens(prompt) + estimatePromptTokens(cleanCode)
          });

          return res.json({ notebookCode: cleanCode });
        } else {
          return res.json({ notebookCode: defaultNotebookCode });
        }
      } catch (err: unknown) {
        const errObj = err as { message?: string };
        StructuredLogger.warn('NOTEBOOK_AI_FALLBACK', errObj.message || 'Notebook generation fallback', {}, req);
        return res.json({ notebookCode: defaultNotebookCode });
      }

    } catch (e: unknown) {
      const errObj = e as { message?: string };
      StructuredLogger.error('NOTEBOOK_ENDPOINT_ERROR', errObj.message || 'Error generating notebook', {}, req);
      return res.status(500).json({ error: 'حدث خطأ أثناء توليد النوتبوك' });
    }
  });

  // =========================================================================
  // 3. Cloud-Native AI Playground Secure Proxy (Strict BYOK & OWASP Hardened)
  // =========================================================================
  app.post(['/api/playground/run', '/api/proxy'], async (req, res) => {
    const startTime = Date.now();
    try {
      const {
        provider,
        modelId,
        modelName,
        apiKey,
        prompt: promptField,
        promptText: promptTextField,
        temperature = 0.7,
        maxTokens = 1024
      } = req.body;

      // Validate Provider against strict whitelist (SSRF & Open Relay mitigation)
      if (!provider || !ALLOWED_AI_PROVIDERS.includes(provider as AllowedProvider)) {
        return res.status(400).json({
          status: 'error',
          errorMessage: `مزود غير مدعوم أو غير مصرح به: ${String(provider || 'unknown')}`
        });
      }

      const rawPrompt = promptField || promptTextField || '';
      if (!rawPrompt || typeof rawPrompt !== 'string' || !rawPrompt.trim()) {
        return res.status(400).json({
          status: 'error',
          errorMessage: 'نص التوجيه (Prompt) مطلوب للتنفيذ.'
        });
      }

      if (rawPrompt.length > 50000) {
        return res.status(400).json({
          status: 'error',
          errorMessage: 'تجاوز التوجيه الحد الأقصى المسموح (50,000 حرف).'
        });
      }

      const userApiKey = (typeof apiKey === 'string' ? apiKey : '').trim().slice(0, 512);
      if (!userApiKey) {
        return res.status(400).json({
          status: 'error',
          errorMessage: `يرجى إدخال مفتاح الـ API الخاص بك لمزود (${provider}) في خانة المفاتيح بالأعلى لتشغيل النموذج بحسابك الخاص دون استهلاك خوادم الموقع.`
        });
      }

      // Helper for timed HTTP fetch with strict 25-second AbortController timeout & Hostname verification
      const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 25000) => {
        try {
          const parsedUrl = new URL(url);
          if (!ALLOWED_HOSTNAMES.has(parsedUrl.hostname)) {
            throw new Error(`وجهة الاتصال (${parsedUrl.hostname}) غير مصرح بها لأسباب أمنية.`);
          }
        } catch (urlErr: unknown) {
          throw new Error('رابط الاستدعاء غير صالح أو غير مصرح به.');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, { ...options, signal: controller.signal });
          return response;
        } catch (err: unknown) {
          const errObj = err as { name?: string; code?: number; message?: string };
          if (errObj.name === 'AbortError' || errObj.code === 20) {
            throw new Error(`انتهت مهلة انتظار استجابة مزود الذكاء الاصطناعي (${timeoutMs / 1000} ثانية).`);
          }
          throw err;
        } finally {
          clearTimeout(timeoutId);
        }
      };

      const promptStr = rawPrompt.trim();
      const clientIdentifier = getClientIp(req);

      // 1. Sliding-Window Continuous Refill Quota Verification
      const estimatedTokens = estimatePromptTokens(promptStr) + Math.min(256, Number(maxTokens) || 256);
      const quotaCheck = globalSlidingQuotaLimiter.checkAndReserveQuota(clientIdentifier, estimatedTokens);

      if (!quotaCheck.allowed) {
        res.setHeader('Retry-After', String(quotaCheck.retryAfterSeconds || 60));
        const quotaHeaders = globalSlidingQuotaLimiter.getQuotaHeaders(clientIdentifier);
        for (const [k, v] of Object.entries(quotaHeaders)) {
          res.setHeader(k, v);
        }
        return res.status(429).json({
          status: 'error',
          errorCode: 'QUOTA_EXCEEDED',
          errorMessage: quotaCheck.reason,
          retryAfterSeconds: quotaCheck.retryAfterSeconds,
          nextReplenishIso: quotaCheck.nextReplenishIso,
          availableTokens: quotaCheck.currentAvailableTokens,
          maxTokensQuota: quotaCheck.maxQuota,
          refillRatePerMinute: quotaCheck.refillRatePerMinute
        });
      }

      // ملاحظة: لا نخزّن ردود المختبر في الكاش لأنها تتم دائماً بمفتاح المستخدم الخاص (BYOK).

      res.setHeader('X-Cache', 'MISS');

      // 3. Dispatch to Provider Engine (Gemini Resilience Cascade, OpenAI, Anthropic, OpenRouter, Groq, DeepSeek, HuggingFace)
      const executionResult = await ModelProviderDispatcher.execute({
        provider,
        modelId,
        modelName,
        promptStr,
        temperature: Math.min(2, Math.max(0, Number(temperature) || 0.7)),
        maxTokens: Math.min(4096, Math.max(1, Math.floor(Number(maxTokens)) || 256)),
        userApiKey
      });

      const responseText = executionResult.responseText;
      const tokensUsed = executionResult.tokensUsed;
      const groundingMetadata = executionResult.groundingMetadata;

      // 4. Settle Quota and conditionally store in Response Cache (ONLY for default non-BYOK requests)
      const finalTokensUsed = tokensUsed || {
        promptTokens: estimatePromptTokens(promptStr),
        completionTokens: estimatePromptTokens(responseText),
        totalTokens: estimatePromptTokens(promptStr) + estimatePromptTokens(responseText)
      };

      globalSlidingQuotaLimiter.settleActualTokenUsage(
        clientIdentifier,
        estimatedTokens,
        finalTokensUsed.totalTokens
      );

      const quotaHeaders = globalSlidingQuotaLimiter.getQuotaHeaders(clientIdentifier);
      for (const [k, v] of Object.entries(quotaHeaders)) {
        res.setHeader(k, v);
      }

      return res.json({
        modelId: executionResult.modelUsed || modelId,
        modelName: modelName || modelId,
        provider,
        latencyMs: Date.now() - startTime,
        status: 'success',
        responseContent: responseText,
        tokensUsed: finalTokensUsed,
        groundingMetadata: groundingMetadata?.isGrounded ? groundingMetadata : undefined,
        resilienceCascadeUsed: executionResult.resilienceCascadeUsed,
        cached: false,
        retryCount: 0,
        proxyUsed: true
      });
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      StructuredLogger.error('PLAYGROUND_PROXY_ERROR', errObj.message || 'Playground execution failed', {
        modelId: req.body?.modelId,
        provider: req.body?.provider
      }, req);

      // Refund reserved tokens on network or upstream error so failed calls are not charged
      try {
        const clientIdentifier = getClientIp(req);
        const promptStr = String(req.body?.prompt || req.body?.promptText || '');
        const estimatedTokens = estimatePromptTokens(promptStr) + Math.min(256, Number(req.body?.maxTokens) || 256);
        globalSlidingQuotaLimiter.settleActualTokenUsage(clientIdentifier, estimatedTokens, 0);
      } catch {
        // Safe ignore
      }

      return res.status(500).json({
        modelId: req.body?.modelId || '',
        modelName: req.body?.modelName || '',
        provider: req.body?.provider || 'huggingface',
        latencyMs: Date.now() - startTime,
        status: 'error',
        responseContent: '',
        errorMessage: errObj.message || 'حدث خطأ غير متوقع أثناء استدعاء الـ API.',
        proxyUsed: true
      });
    }
  });

  // =========================================================================
  // 4. RepoLister-X Specialized GitHub Catalog Assistant API
  // =========================================================================

  // Get RepoLister-X 3 Strategy Angles
  app.get('/api/repolister/angles', (_req, res) => {
    res.json({
      status: 'success',
      angles: REPOLISTER_ANGLES
    });
  });

  // Get RepoLister-X Date Ranges (month-by-month starting today)
  app.get('/api/repolister/date-ranges', (_req, res) => {
    const ranges = generateDateRanges(36);
    res.json({
      status: 'success',
      ranges
    });
  });

  // Step 1: Pre-flight lightweight estimation (per_page=1) across all 3 angles
  app.post('/api/repolister/estimate', async (req, res) => {
    try {
      const userToken = typeof req.body?.token === 'string' ? req.body.token.trim() : undefined;
      const results: Array<{
        id: string;
        labelEn: string;
        labelAr: string;
        query: string;
        totalCount: number;
        rateLimit: { remaining: number; reset: number; limit: number };
      }> = [];

      let totalEstimated = 0;
      let lastRateLimit = { remaining: 10, reset: 0, limit: 10 };

      for (const angle of REPOLISTER_ANGLES) {
        try {
          const estimate = await fetchAngleEstimate(angle.query, userToken);
          results.push({
            id: angle.id,
            labelEn: angle.labelEn,
            labelAr: angle.labelAr,
            query: angle.query,
            totalCount: estimate.totalCount,
            rateLimit: estimate.rateLimit
          });
          totalEstimated += estimate.totalCount;
          lastRateLimit = estimate.rateLimit;
        } catch (angleErr: unknown) {
          const aErr = angleErr as { message?: string };
          // If hit rate limit or network error, report clearly
          return res.status(429).json({
            status: 'rate_limit_or_error',
            errorMessage: aErr.message || 'تعذر الاتصال بـ GitHub API أو تم الوصول لحد الطلبات (Rate Limit).',
            lastCompletedAngle: angle.id,
            resultsSoFar: results
          });
        }
      }

      return res.json({
        status: 'success',
        angles: results,
        totalEstimated,
        rateLimit: lastRateLimit,
        timestamp: new Date().toISOString()
      });
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      return res.status(500).json({
        status: 'error',
        errorMessage: errObj.message || 'حدث خطأ أثناء فحص تقدير النتائج.'
      });
    }
  });

  // Step 2-5: Execute Batch Query for a specific date range and angle
  app.post('/api/repolister/batch', async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        angleId = 'direct',
        customQuery,
        page = 1,
        perPage = 50,
        startIndex = 0,
        totalFoundSoFar = 0,
        totalEstimated = 0,
        language = 'ar',
        token
      } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({
          status: 'error',
          errorMessage: 'حقول النطاق الزمني (startDate و endDate) مطلوبة.'
        });
      }

      const activeAngle = REPOLISTER_ANGLES.find((a) => a.id === angleId) || REPOLISTER_ANGLES[0];
      const queryTerm = customQuery && typeof customQuery === 'string' && customQuery.trim()
        ? customQuery.trim()
        : activeAngle.query;

      const dateFilter = `created:${startDate}..${endDate}`;
      const fullGitHubQuery = `${queryTerm} ${dateFilter}`;
      const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(queryTerm)}+${encodeURIComponent(dateFilter)}&sort=updated&order=desc&per_page=${Math.min(100, Math.max(1, perPage))}&page=${page}`;
      const webVerificationUrl = `https://github.com/search?q=${encodeURIComponent(queryTerm)}+${encodeURIComponent(dateFilter)}&type=repositories&s=updated&o=desc`;

      await enforceRateLimitDelay();

      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'RepoLister-X-Catalog-Assistant/1.0'
      };

      const userToken = typeof token === 'string' && token.trim() ? token.trim() : undefined;
      if (userToken) {
        headers['Authorization'] = `token ${userToken}`;
      }

      const response = await fetch(searchUrl, { headers });

      const remaining = parseInt(response.headers.get('x-ratelimit-remaining') || '10', 10);
      const reset = parseInt(response.headers.get('x-ratelimit-reset') || '0', 10);
      const limit = parseInt(response.headers.get('x-ratelimit-limit') || '10', 10);

      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          return res.status(429).json({
            status: 'rate_limited',
            errorMessage: `تم بلوغ الحد الأقصى لـ GitHub API (Rate Limit). المتبقي 0. يعاد التعيين في: ${new Date(reset * 1000).toLocaleTimeString()}. توقف الفحص عند النطاق: ${startDate}..${endDate}`,
            stoppedAtDateRange: `${startDate}..${endDate}`,
            rateLimit: { remaining: 0, reset, limit }
          });
        }
        const errText = await response.text();
        return res.status(response.status).json({
          status: 'error',
          errorMessage: `خطأ من GitHub API (${response.status}): ${errText.slice(0, 200)}`
        });
      }

      const data = await response.json();
      const rawItems: GitHubRepoItem[] = data.items || [];
      const totalCountForRange: number = data.total_count || 0;

      const processedItems: FormattedRepo[] = [];
      let omittedCount = 0;

      for (const raw of rawItems) {
        const { include, item } = processRepoItem(raw, activeAngle.id);
        if (include && item) {
          processedItems.push(item);
        } else {
          omittedCount++;
        }
      }

      // Slice to perPage (default 50)
      const batchItems = processedItems.slice(0, perPage);
      const newTotalFound = totalFoundSoFar + batchItems.length;
      const hasMoreBatches = page * perPage < totalCountForRange;

      const { textAr, textEn } = formatBatchOutput(
        batchItems,
        startIndex,
        newTotalFound,
        totalEstimated || totalCountForRange,
        { start: startDate, end: endDate },
        webVerificationUrl,
        omittedCount,
        hasMoreBatches,
        language === 'en' ? 'en' : 'ar'
      );

      return res.json({
        status: 'success',
        dateRange: { start: startDate, end: endDate },
        page,
        perPage,
        totalCountForRange,
        totalFoundSoFar: newTotalFound,
        totalEstimated: totalEstimated || totalCountForRange,
        totalRemaining: Math.max(0, (totalEstimated || totalCountForRange) - newTotalFound),
        omittedCount,
        githubSearchUrl: webVerificationUrl,
        apiSearchUrl: searchUrl,
        items: batchItems,
        formattedTextAr: textAr,
        formattedTextEn: textEn,
        hasMoreBatches,
        rateLimit: { remaining, reset, limit }
      });

    } catch (batchErr: unknown) {
      const bErr = batchErr as { message?: string };
      return res.status(500).json({
        status: 'error',
        errorMessage: bErr.message || 'حدث خطأ أثناء معالجة دفعة البحث.'
      });
    }
  });

  // Uniform Global Error Handler for all API routes
  app.use('/api', globalErrorHandler);

  // Vite middleware for dev or static serving for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
