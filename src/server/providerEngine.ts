import { GoogleGenAI } from '@google/genai';
import { getLiveSearchGroundingConfig, extractGroundingMetadata, GroundingMetadataResult } from './geminiGrounding';
import { StructuredLogger } from './logger';

export interface ProviderExecutionParams {
  provider: string;
  modelId: string;
  modelName?: string;
  promptStr: string;
  temperature: number;
  maxTokens: number;
  userApiKey?: string;
}

export interface ProviderExecutionResponse {
  responseText: string;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  groundingMetadata?: GroundingMetadataResult;
  resilienceCascadeUsed?: boolean;
  modelUsed?: string;
  errorMessage?: string;
}

/**
 * Utility: Fetch with timeout guard
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 25000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err: unknown) {
    clearTimeout(id);
    const e = err as { name?: string; message?: string };
    if (e.name === 'AbortError') {
      throw new Error(`انتهت مهلة انتظار خادم الذكاء الاصطناعي (${Math.round(timeoutMs / 1000)} ثانية).`);
    }
    throw err;
  }
}

/**
 * Normalizes Gemini model names to current canonical API IDs
 */
export function normalizeGeminiModelId(rawId: string): string {
  const id = (rawId || '').trim();
  if (!id) return 'gemini-2.5-flash';
  if (id === 'gemini-2.5-pro' || id === 'gemini-2.0-pro' || id === 'gemini-pro') return 'gemini-3.1-pro-preview';
  if (id === 'gemini-2.5-flash-lite' || id === 'gemini-2.0-flash-lite' || id === 'gemini-lite') return 'gemini-2.5-flash-lite';
  if (id === 'gemini-2.0-flash' || id === 'gemini-1.5-flash' || id === 'gemini-3.5-flash') return 'gemini-2.5-flash';
  return id;
}

/**
 * Modular Provider Dispatcher & Resilience Cascade
 */
export class ModelProviderDispatcher {
  /**
   * Dispatches the prompt to the specified provider handler
   */
  public static async execute(params: ProviderExecutionParams): Promise<ProviderExecutionResponse> {
    const { provider } = params;

    switch (provider) {
      case 'gemini':
        return this.executeGeminiCascade(params);
      case 'openai':
        return this.executeOpenAI(params);
      case 'anthropic':
        return this.executeAnthropic(params);
      case 'openrouter':
        return this.executeOpenRouter(params);
      case 'groq':
        return this.executeGroq(params);
      case 'deepseek':
        return this.executeDeepSeek(params);
      case 'huggingface':
        return this.executeHuggingFace(params);
      default:
        throw new Error(`المزود (${provider}) غير مدعوم حالياً.`);
    }
  }

  /**
   * Gemini Multi-Model Resilience Cascade
   * Automatically attempts lightweight fallback models if primary model is rate-limited (429) or overloaded
   */
  private static async executeGeminiCascade(params: ProviderExecutionParams): Promise<ProviderExecutionResponse> {
    const gemKey = params.userApiKey || process.env.GEMINI_API_KEY || '';
    if (!gemKey) {
      throw new Error('مفتاح Google Gemini غير متوفر. يرجى إدخال مفتاحك الخاص في المختبر.');
    }

    const ai = new GoogleGenAI({
      apiKey: gemKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-byok',
        },
      },
    });

    const targetModel = normalizeGeminiModelId(params.modelId);
    const candidateModels = [
      targetModel,
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-3.7-flash',
      'gemini-3.5-flash-lite'
    ];

    const uniqueModels = Array.from(new Set(candidateModels));
    let lastGeminiError = '';
    let cascadeTriggered = false;

    for (const candidate of uniqueModels) {
      try {
        const response = await Promise.race([
          ai.models.generateContent({
            model: candidate,
            contents: params.promptStr,
            config: {
              ...getLiveSearchGroundingConfig({ temperature: Number(params.temperature) }),
            }
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('انتهت مهلة انتظار استجابة Gemini (25 ثانية).')), 25000)
          )
        ]);

        if (response.text) {
          const groundingMetadata = extractGroundingMetadata(response);
          const tokensUsed = response.usageMetadata
            ? {
                promptTokens: response.usageMetadata.promptTokenCount || 0,
                completionTokens: response.usageMetadata.candidatesTokenCount || 0,
                totalTokens: response.usageMetadata.totalTokenCount || 0
              }
            : undefined;

          return {
            responseText: response.text,
            tokensUsed,
            groundingMetadata,
            resilienceCascadeUsed: cascadeTriggered,
            modelUsed: candidate
          };
        }
      } catch (gemErr: unknown) {
        cascadeTriggered = true;
        const ge = gemErr as { message?: string };
        lastGeminiError = ge.message || 'فشل الاتصال بـ Google Gemini';
        StructuredLogger.warn('GEMINI_CASCADE_FAILOVER', `Candidate ${candidate} encountered error, trying next: ${lastGeminiError}`);
      }
    }

    throw new Error(lastGeminiError || 'تعذر تشغيل نموذج Gemini حالياً بمفتاحك المدخل.');
  }

  /**
   * OpenAI API Provider
   */
  private static async executeOpenAI(params: ProviderExecutionParams): Promise<ProviderExecutionResponse> {
    const oaiKey = params.userApiKey || process.env.OPENAI_API_KEY || '';
    if (!oaiKey) {
      throw new Error('مفتاح OpenAI API مطلوب للتشغيل.');
    }

    const oaiRes = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${oaiKey}`
      },
      body: JSON.stringify({
        model: params.modelId,
        messages: [{ role: 'user', content: params.promptStr }],
        temperature: params.modelId.startsWith('o') ? undefined : Number(params.temperature)
      })
    }, 25000);

    const data = (await oaiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      error?: { message?: string };
    };

    if (!oaiRes.ok) {
      throw new Error(data?.error?.message || `OpenAI Error (${oaiRes.status}): ${oaiRes.statusText}`);
    }

    return {
      responseText: data.choices?.[0]?.message?.content || 'لا يوجد رد.',
      tokensUsed: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0
      } : undefined,
      modelUsed: params.modelId
    };
  }

  /**
   * Anthropic Claude API Provider
   */
  private static async executeAnthropic(params: ProviderExecutionParams): Promise<ProviderExecutionResponse> {
    const antKey = params.userApiKey || process.env.ANTHROPIC_API_KEY || '';
    if (!antKey) {
      throw new Error('مفتاح Anthropic Claude API مطلوب للتشغيل.');
    }

    const antRes = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': antKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: params.modelId,
        max_tokens: Number(params.maxTokens),
        temperature: Number(params.temperature),
        messages: [{ role: 'user', content: params.promptStr }]
      })
    }, 25000);

    const data = (await antRes.json()) as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
      error?: { message?: string };
    };

    if (!antRes.ok) {
      throw new Error(data?.error?.message || `Anthropic Error (${antRes.status}): ${antRes.statusText}`);
    }

    return {
      responseText: data.content?.[0]?.text || 'لا يوجد رد.',
      tokensUsed: data.usage ? {
        promptTokens: data.usage.input_tokens || 0,
        completionTokens: data.usage.output_tokens || 0,
        totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
      } : undefined,
      modelUsed: params.modelId
    };
  }

  /**
   * OpenRouter API Provider
   */
  private static async executeOpenRouter(params: ProviderExecutionParams): Promise<ProviderExecutionResponse> {
    const orKey = params.userApiKey || process.env.OPENROUTER_API_KEY || '';
    if (!orKey) {
      throw new Error('مفتاح OpenRouter API مطلوب للتشغيل.');
    }

    const orRes = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${orKey}`,
        'HTTP-Referer': 'https://ai-models-directory.app',
        'X-Title': 'AI Models Directory BYOK Playground'
      },
      body: JSON.stringify({
        model: params.modelId,
        messages: [{ role: 'user', content: params.promptStr }],
        temperature: Number(params.temperature)
      })
    }, 25000);

    const data = (await orRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      error?: { message?: string };
    };

    if (!orRes.ok) {
      throw new Error(data?.error?.message || `OpenRouter Error (${orRes.status}): ${orRes.statusText}`);
    }

    return {
      responseText: data.choices?.[0]?.message?.content || 'لا يوجد رد.',
      tokensUsed: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0
      } : undefined,
      modelUsed: params.modelId
    };
  }

  /**
   * Groq High-Speed Inference Provider
   */
  private static async executeGroq(params: ProviderExecutionParams): Promise<ProviderExecutionResponse> {
    const groqKey = params.userApiKey || process.env.GROQ_API_KEY || '';
    if (!groqKey) {
      throw new Error('مفتاح Groq API مطلوب للتشغيل.');
    }

    const groqRes = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: params.modelId,
        messages: [{ role: 'user', content: params.promptStr }],
        temperature: Number(params.temperature)
      })
    }, 25000);

    const data = (await groqRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      error?: { message?: string };
    };

    if (!groqRes.ok) {
      throw new Error(data?.error?.message || `Groq Error (${groqRes.status}): ${groqRes.statusText}`);
    }

    return {
      responseText: data.choices?.[0]?.message?.content || 'لا يوجد رد.',
      tokensUsed: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0
      } : undefined,
      modelUsed: params.modelId
    };
  }

  /**
   * DeepSeek API Provider
   */
  private static async executeDeepSeek(params: ProviderExecutionParams): Promise<ProviderExecutionResponse> {
    const dsKey = params.userApiKey || process.env.DEEPSEEK_API_KEY || '';
    if (!dsKey) {
      throw new Error('مفتاح DeepSeek API مطلوب للتشغيل.');
    }

    const dsRes = await fetchWithTimeout('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dsKey}`
      },
      body: JSON.stringify({
        model: params.modelId,
        messages: [{ role: 'user', content: params.promptStr }],
        temperature: Number(params.temperature)
      })
    }, 25000);

    const data = (await dsRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      error?: { message?: string };
    };

    if (!dsRes.ok) {
      throw new Error(data?.error?.message || `DeepSeek Error (${dsRes.status}): ${dsRes.statusText}`);
    }

    return {
      responseText: data.choices?.[0]?.message?.content || 'لا يوجد رد.',
      tokensUsed: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0
      } : undefined,
      modelUsed: params.modelId
    };
  }

  /**
   * Hugging Face Serverless Inference API
   */
  private static async executeHuggingFace(params: ProviderExecutionParams): Promise<ProviderExecutionResponse> {
    const hfKey = params.userApiKey || process.env.HUGGINGFACE_API_KEY || '';
    if (!hfKey) {
      throw new Error('مفتاح Hugging Face Token مطلوب للتشغيل.');
    }

    let targetModel = params.modelId;
    if (params.modelId === 'meta-llama/Llama-3.3-70B-Instruct') targetModel = 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
    if (params.modelId === 'meta-llama/Meta-Llama-3-8B-Instruct') targetModel = 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';
    if (params.modelId.includes('DeepSeek-R1-Distill-Qwen-32B')) targetModel = 'deepseek-ai/DeepSeek-V4-Flash-0731';
    if (params.modelId.includes('Qwen2.5-Coder-32B')) targetModel = 'Qwen/Qwen2.5-7B-Instruct-Turbo';
    if (params.modelId.includes('gemma-2-9b')) targetModel = 'google/gemma-4-31B-it';

    const routerProviders = ['together', 'novita', 'fal-ai', 'hf-inference'];
    let lastHfError = '';

    for (const prov of routerProviders) {
      try {
        const hfRes = await fetchWithTimeout(`https://router.huggingface.co/${prov}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${hfKey}`
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: 'user', content: params.promptStr }],
            temperature: Number(params.temperature),
            max_tokens: Number(params.maxTokens)
          })
        }, 20000);

        const data = (await hfRes.json().catch(() => ({}))) as {
          choices?: Array<{ message?: { content?: string; reasoning?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
          error?: string | Record<string, unknown>;
        };

        if (hfRes.status === 402) {
          throw new Error('⚠️ انتهى الرصيد الشهري المضمن في مفتاح Hugging Face الخاص بك (402 Payment Required).');
        }

        if (hfRes.status === 401) {
          throw new Error('رمز الوصول (Hugging Face Token) المدخل غير صالح أو منتهي الصلاحية (401 Unauthorized).');
        }

        if (hfRes.ok && (data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning)) {
          const msg = data.choices[0].message;
          let responseText = msg.content || msg.reasoning || '';
          if (msg.reasoning && !msg.content) {
            responseText = `[تفكير النموذج]:\n${msg.reasoning}`;
          }

          return {
            responseText,
            tokensUsed: data.usage ? {
              promptTokens: data.usage.prompt_tokens || 0,
              completionTokens: data.usage.completion_tokens || 0,
              totalTokens: data.usage.total_tokens || 0
            } : undefined,
            modelUsed: targetModel
          };
        } else if (data.error) {
          lastHfError = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        }
      } catch (provErr: unknown) {
        const pe = provErr as { message?: string };
        lastHfError = pe.message || 'خطأ في الاتصال بالخادم';
      }
    }

    throw new Error(lastHfError || 'تعذر الحصول على رد من خوادم Hugging Face لهذا النموذج.');
  }
}
