/**
 * Intelligent Arabic Error Normalizer for AI Providers
 * Maps raw upstream API errors (401, 403, 429, 500, 503, etc.)
 * into friendly, actionable Arabic guidance with recovery suggestions.
 */

export interface NormalizedError {
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  recoveryActionAr: string;
  recoveryActionEn: string;
  providerDocUrl?: string;
  statusCategory: 'auth' | 'quota' | 'maintenance' | 'timeout' | 'generic';
}

export function normalizeAIError(
  rawError: any,
  provider?: string,
  modelName?: string
): NormalizedError {
  const errorStr = String(rawError?.message || rawError || '').toLowerCase();
  const statusCode = Number(rawError?.status || rawError?.statusCode || 0);

  // 1. Authentication & API Key Errors (401 / Unauthorized)
  if (
    statusCode === 401 ||
    errorStr.includes('unauthorized') ||
    errorStr.includes('invalid_api_key') ||
    errorStr.includes('authentication') ||
    errorStr.includes('api key not found') ||
    errorStr.includes('invalid token')
  ) {
    return {
      titleAr: 'مفتاح الـ API غير صالح أو منتهي',
      titleEn: 'Invalid or Expired API Key',
      messageAr: `المفتاح المدخل لمزود (${provider || 'الذكاء الاصطناعي'}) غير صحيح أو تم إلغاؤه من حسابك لدى المزود.`,
      messageEn: `The API key provided for ${provider || 'the AI provider'} is invalid, malformed, or revoked.`,
      recoveryActionAr: 'يرجى التحقق من نسخ المفتاح كاملاً بدون مسافات إضافية، أو إنشاء مفتاح جديد من لوحة تحكم المزود.',
      recoveryActionEn: 'Please verify the full key was copied without trailing spaces, or generate a fresh key in your provider dashboard.',
      providerDocUrl: getProviderDashboardUrl(provider),
      statusCategory: 'auth'
    };
  }

  // 2. Quota & Rate Limit Errors (429 / Insufficient Quota)
  if (
    statusCode === 429 ||
    errorStr.includes('rate limit') ||
    errorStr.includes('quota') ||
    errorStr.includes('insufficient_quota') ||
    errorStr.includes('too many requests') ||
    errorStr.includes('credit')
  ) {
    return {
      titleAr: 'تم استهلاك رصيد الحساب أو تجاوز معدل الطلبات',
      titleEn: 'Rate Limit Exceeded or Depleted Credits',
      messageAr: `حسابك لدى (${provider || 'المزود'}) استنفذ الرصيد التجريبي المجاني أو وصل إلى الحد الأقصى للطلبات في الدقيقة.`,
      messageEn: `Your account with ${provider || 'the provider'} has hit its rate limit or exhausted its balance/free tier quota.`,
      recoveryActionAr: 'انتظر بضع ثوانٍ ثم أعد المحاولة، أو تحقق من وجود رصيد نشط في لوحة تحكم حسابك.',
      recoveryActionEn: 'Wait a few moments before retrying, or review active credits and billing in your provider console.',
      providerDocUrl: getProviderBillingUrl(provider),
      statusCategory: 'quota'
    };
  }

  // 3. Permission / Forbidden (403)
  if (statusCode === 403 || errorStr.includes('permission') || errorStr.includes('forbidden')) {
    return {
      titleAr: 'عدم وجود صلاحية للوصول إلى هذا النموذج',
      titleEn: 'Access Forbidden / Restricted Model',
      messageAr: `النموذج المحدد (${modelName || ''}) يتطلب موافقة خاصة أو اشتراكاً مدفوعاً لم يتم تفعيله في حسابك.`,
      messageEn: `The requested model (${modelName || ''}) requires explicit access approval or a paid tier not enabled for this key.`,
      recoveryActionAr: 'اختر نموذجاً آخر متاحاً مجاناً، أو قدم طلب موافقة على النموذج في منصة المزود.',
      recoveryActionEn: 'Select an alternate public model or request model access via the provider settings.',
      providerDocUrl: getProviderDashboardUrl(provider),
      statusCategory: 'auth'
    };
  }

  // 4. Overloaded / Maintenance (503 / 502 / Service Unavailable)
  if (
    statusCode === 503 ||
    statusCode === 502 ||
    errorStr.includes('overloaded') ||
    errorStr.includes('loading') ||
    errorStr.includes('currently loading') ||
    errorStr.includes('service unavailable')
  ) {
    return {
      titleAr: 'خوادم النموذج قيد التحميل أو الصيانة',
      titleEn: 'Model Server Warming Up or Busy',
      messageAr: `خوادم مزود (${provider || 'الخدمة'}) مشغولة حالياً أو تقوم بتحميل أوزان النموذج إلى الذاكرة السحابية (Cold Start).`,
      messageEn: `The provider servers for ${provider || 'the service'} are warming up model weights into GPU memory (cold start).`,
      recoveryActionAr: 'يرجى الانتظار من 15 إلى 30 ثانية ثم النقر على زر إعادة التشغيل.',
      recoveryActionEn: 'Please wait 15-30 seconds for cold start completion, then retry.',
      statusCategory: 'maintenance'
    };
  }

  // 5. Timeout Errors (504 / Abort)
  if (errorStr.includes('timeout') || errorStr.includes('abort') || statusCode === 504) {
    return {
      titleAr: 'انتهت مهلة انتظار الاستجابة',
      titleEn: 'Request Timeout',
      messageAr: 'استغرقت معالجة الطلب وقتاً أطول من الحد المسموح (25 ثانية) نظراً لحجم النص أو بطء استجابة المزود.',
      messageEn: 'The request took longer than the allowable timeout threshold due to provider latency or complex generation.',
      recoveryActionAr: 'جرب تقليل طول النص (Prompt) أو اختيار نموذج أسرع مثل Gemini Flash أو Llama 3.1 8B Instant.',
      recoveryActionEn: 'Try shortening your prompt or picking a faster latency-optimized model.',
      statusCategory: 'timeout'
    };
  }

  // Generic Fallback
  return {
    titleAr: 'تعذر إتمام الاستدعاء',
    titleEn: 'API Dispatch Error',
    messageAr: rawError?.message || 'حدث خطأ غير متوقع أثناء محاولة التواصل مع خادم النموذج.',
    messageEn: rawError?.message || 'An unexpected error occurred while communicating with the model endpoint.',
    recoveryActionAr: 'تأكد من اتصالك بالإنترنت وصحة المفتاح والنموذج المختار، ثم أعد المحاولة.',
    recoveryActionEn: 'Check your internet connection, verify key formatting and provider model selection, then retry.',
    statusCategory: 'generic'
  };
}

function getProviderDashboardUrl(provider?: string): string {
  switch (provider) {
    case 'gemini':
      return 'https://aistudio.google.com/app/apikey';
    case 'openai':
      return 'https://platform.openai.com/api-keys';
    case 'anthropic':
      return 'https://console.anthropic.com/settings/keys';
    case 'groq':
      return 'https://console.groq.com/keys';
    case 'openrouter':
      return 'https://openrouter.ai/keys';
    case 'deepseek':
      return 'https://platform.deepseek.com/api_keys';
    case 'huggingface':
      return 'https://huggingface.co/settings/tokens';
    default:
      return 'https://huggingface.co/settings/tokens';
  }
}

function getProviderBillingUrl(provider?: string): string {
  switch (provider) {
    case 'openai':
      return 'https://platform.openai.com/account/billing';
    case 'anthropic':
      return 'https://console.anthropic.com/settings/billing';
    case 'openrouter':
      return 'https://openrouter.ai/credits';
    case 'deepseek':
      return 'https://platform.deepseek.com/top_up';
    default:
      return getProviderDashboardUrl(provider);
  }
}
