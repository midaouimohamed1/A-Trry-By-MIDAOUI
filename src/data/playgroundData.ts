import { SupportedProvider, ProviderConfig, PlaygroundExecutionResult } from '../types';

export const SUPPORTED_PROVIDERS: ProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google AI Studio (Gemini)',
    keyPlaceholder: 'AIzaSy... (Gemini API Key - مجاني وسريع)',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (استدلال متقدم والأحدث)', modelRank: 3 },
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite (فائق السرعة واقتصادي)', modelRank: 3 },
      { id: 'gemini-flash-latest', name: 'Gemini Flash Latest (النسخة المستقرة)', modelRank: 3 },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (قدرات برمجية معقدة)', modelRank: 3 }
    ]
  },
  {
    id: 'huggingface',
    name: 'Hugging Face (Inference API)',
    keyPlaceholder: 'hf_... (Hugging Face User Access Token)',
    docsUrl: 'https://huggingface.co/settings/tokens',
    models: [
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B Instruct Turbo', modelRank: 8 },
      { id: 'deepseek-ai/DeepSeek-V4-Flash-0731', name: 'DeepSeek V4 Flash', modelRank: 5 },
      { id: 'Qwen/Qwen2.5-7B-Instruct-Turbo', name: 'Qwen 2.5 7B Instruct Turbo', modelRank: 42 },
      { id: 'google/gemma-4-31B-it', name: 'Gemma 4 31B IT', modelRank: 3 },
      { id: 'zai-org/GLM-5.2', name: 'GLM 5.2', modelRank: 15 },
      { id: 'meta-models/Muse-Glimmer-30B', name: 'Muse Glimmer 30B', modelRank: 12 }
    ]
  },
  {
    id: 'groq',
    name: 'Groq (Ultra-Fast Inference)',
    keyPlaceholder: 'gsk_... (Groq API Key)',
    docsUrl: 'https://console.groq.com/keys',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', modelRank: 8 },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', modelRank: 8 },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', modelRank: 17 }
    ]
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (الكل في واحد)',
    keyPlaceholder: 'sk-or-v1-... (OpenRouter API Key)',
    docsUrl: 'https://openrouter.ai/keys',
    models: [
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Reasoning)', modelRank: 5 },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', modelRank: 5 },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', modelRank: 2 },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', modelRank: 3 },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', modelRank: 8 },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', modelRank: 1 },
      { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B Instruct', modelRank: 42 }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI Direct',
    keyPlaceholder: 'sk-proj-... (OpenAI Secret Key)',
    docsUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o mini', modelRank: 1 },
      { id: 'gpt-4o', name: 'GPT-4o', modelRank: 1 },
      { id: 'o3-mini', name: 'OpenAI o3-mini', modelRank: 1 },
      { id: 'o1', name: 'OpenAI o1', modelRank: 1 }
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic Direct',
    keyPlaceholder: 'sk-ant-api03-... (Anthropic API Key)',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', modelRank: 2 },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', modelRank: 2 },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', modelRank: 2 }
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek Direct',
    keyPlaceholder: 'sk-... (DeepSeek API Key)',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3 (Chat)', modelRank: 5 },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoner)', modelRank: 5 }
    ]
  }
];

export const TEST_PROMPT_PRESETS = [
  {
    id: 'coding',
    titleAr: '💻 منطق البرمجة وتوليد كود',
    titleEn: '💻 Code Generation & Typing',
    prompt: 'Write a TypeScript function to debounce an async function with full typing and an immediate option. Include comments explaining how edge cases are handled.'
  },
  {
    id: 'reasoning',
    titleAr: '🧠 الاستدلال وحل الأحجيات',
    titleEn: '🧠 Logic & Reasoning Puzzle',
    prompt: 'A farmer has 17 sheep, and all but 9 die. How many sheep does the farmer have left? Explain your step-by-step reasoning clearly.'
  },
  {
    id: 'arabic-creative',
    titleAr: '✍️ بلاغة وصياغة عربية متقدمة',
    titleEn: '✍️ Eloquent Arabic Prose',
    prompt: 'اكتب فقرة موجزة وبليغة تشرح مفهوم الذكاء الاصطناعي التوليدي لمبتدئ، مستخدماً تشبيهاً بيانياً جذاباً ومصطلحات عربية سليمة.'
  },
  {
    id: 'translation-code',
    titleAr: '⚡ تحليل وتلخيص تقني',
    titleEn: '⚡ Technical Summary & Arch',
    prompt: 'Compare the architectural difference between Transformer-based Attention and State Space Models (e.g. Mamba) in 3 bullet points with pros and cons.'
  }
];

/**
 * Client-Side BYOK Execution Engine.
 * Note: Session-only execution with zero server logging and pure in-memory keys.
 */
export async function executePromptOnModel(
  provider: SupportedProvider,
  modelId: string,
  modelName: string,
  apiKey: string,
  promptText: string,
  temperature: number = 0.7,
  signal?: AbortSignal
): Promise<PlaygroundExecutionResult> {
  const startTime = performance.now();
  const trimmedKey = apiKey.trim();

  if (!trimmedKey) {
    return {
      modelId,
      modelName,
      provider,
      latencyMs: 0,
      status: 'error',
      responseContent: '',
      errorMessage: 'مفتاح الـ API مطلوب لتشغيل هذا النموذج.'
    };
  }

  // 1. Primary Route: Serverless Cloud Proxy (/api/playground/run)
  // Bypasses CORS, handles exponential backoff for Hugging Face cold starts, and secures token headers.
  try {
    const proxyRes = await fetch('/api/playground/run', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider,
        modelId,
        modelName,
        apiKey: trimmedKey,
        prompt: promptText,
        temperature,
        maxTokens: 1024
      })
    });

    const data: PlaygroundExecutionResult = await proxyRes.json();
    return {
      ...data,
      latencyMs: Math.round(performance.now() - startTime)
    };
  } catch (proxyErr: any) {
    console.warn('Playground Server Proxy error, trying direct browser fallback:', proxyErr);
  }

  // 2. Secondary Fallback: Direct Browser Execution
  try {
    let responseText = '';
    let tokensUsed: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

    if (provider === 'huggingface') {
      let res = await fetch('https://router.huggingface.co/hf-inference/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trimmedKey}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: promptText }],
          temperature,
          max_tokens: 1024
        })
      });

      if (!res.ok) {
        // Fallback to legacy inference endpoint if router returned error
        res = await fetch(`https://api-inference.huggingface.co/models/${modelId}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${trimmedKey}`
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: promptText }],
            temperature,
            max_tokens: 1024
          })
        });
      }

      if (!res.ok) {
        // Fallback to direct model pipeline endpoint
        const directRes = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${trimmedKey}`
          },
          body: JSON.stringify({
            inputs: promptText,
            parameters: { max_new_tokens: 1024, temperature }
          })
        });

        if (directRes.ok) {
          const directData = await directRes.json();
          if (Array.isArray(directData) && directData[0]?.generated_text) {
            responseText = directData[0].generated_text;
          } else if (typeof directData === 'string') {
            responseText = directData;
          } else {
            responseText = JSON.stringify(directData);
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error || `Hugging Face Error (HTTP ${res.status}): ${res.statusText}`);
        }
      } else {
        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || 'لا يوجد رد.';
        if (data.usage) {
          tokensUsed = {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0
          };
        }
      }
    } else if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trimmedKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Models Directory Playground'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: promptText }],
          temperature
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `HTTP ${res.status}: ${res.statusText}`);
      }
      responseText = data.choices?.[0]?.message?.content || 'لا يوجد رد.';
      if (data.usage) {
        tokensUsed = {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0
        };
      }
    } else if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trimmedKey}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: promptText }],
          temperature: modelId.startsWith('o') ? undefined : temperature
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `HTTP ${res.status}: ${res.statusText}`);
      }
      responseText = data.choices?.[0]?.message?.content || 'لا يوجد رد.';
      if (data.usage) {
        tokensUsed = {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0
        };
      }
    } else if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trimmedKey}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: promptText }],
          temperature
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `HTTP ${res.status}: ${res.statusText}`);
      }
      responseText = data.choices?.[0]?.message?.content || 'لا يوجد رد.';
      if (data.usage) {
        tokensUsed = {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0
        };
      }
    } else if (provider === 'deepseek') {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${trimmedKey}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: promptText }],
          temperature
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `HTTP ${res.status}: ${res.statusText}`);
      }
      responseText = data.choices?.[0]?.message?.content || 'لا يوجد رد.';
      if (data.usage) {
        tokensUsed = {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0
        };
      }
    } else if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${trimmedKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { temperature }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `HTTP ${res.status}: ${res.statusText}`);
      }
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لا يوجد رد.';
      if (data.usageMetadata) {
        tokensUsed = {
          promptTokens: data.usageMetadata.promptTokenCount || 0,
          completionTokens: data.usageMetadata.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata.totalTokenCount || 0
        };
      }
    } else if (provider === 'anthropic') {
      // Anthropic direct from browser requires dangerously-allow-browser or proxy due to CORS header.
      // We recommend OpenRouter for unified browser requests or direct with header.
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': trimmedKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: modelId,
            max_tokens: 1024,
            messages: [{ role: 'user', content: promptText }]
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message || `HTTP ${res.status}`);
        }
        responseText = data.content?.[0]?.text || 'لا يوجد رد.';
        if (data.usage) {
          tokensUsed = {
            promptTokens: data.usage.input_tokens || 0,
            completionTokens: data.usage.output_tokens || 0,
            totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
          };
        }
      } catch (err: any) {
        throw new Error(`Anthropic CORS restriction: استخدم موفر OpenRouter لاختبار Claude مباشرة من المتصفح، أو تحقق من المفتاح: ${err?.message}`);
      }
    }

    const latencyMs = Math.round(performance.now() - startTime);

    return {
      modelId,
      modelName,
      provider,
      latencyMs,
      status: 'success',
      responseContent: responseText,
      tokensUsed
    };
  } catch (error: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      modelId,
      modelName,
      provider,
      latencyMs,
      status: 'error',
      responseContent: '',
      errorMessage: error?.message || 'حدث خطأ أثناء التواصل مع مزود الـ API.'
    };
  }
}
