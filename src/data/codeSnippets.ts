export interface CodeSnippet {
  language: string;
  filename: string;
  code: string;
}

export const API_TESTER_SNIPPETS: CodeSnippet[] = [
  {
    language: 'Python',
    filename: 'test_api_key.py',
    code: `import os
import time
import json
import logging
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Optional, Dict, Any

# إعداد التسجيل المتقدم (Advanced Logging)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("APITester")

def mask_api_key(key: Optional[str]) -> str:
    """إخفاء المفتاح السري لمنع تسريبه في السجلات (OWASP Standards)"""
    if not key or len(key) < 8:
        return "***REDACTED***"
    return f"{key[:4]}...{key[-4:]}"

def test_api_connection(
    endpoint: str,
    env_var_name: str = "API_KEY",
    payload: Optional[Dict[str, Any]] = None,
    max_retries: int = 3,
    timeout_seconds: int = 15
) -> bool:
    # 1. إدارة المفاتيح والأمان (قراءة حصرياً من متغيرات البيئة)
    api_key = os.getenv(env_var_name)
    if not api_key:
        logger.error(f"❌ لم يتم العثور على متغير البيئة '{env_var_name}'. يرجى ضبطه أولاً.")
        return False

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json"
    }

    # تسجيل آمن للترويسات
    safe_headers = {k: (mask_api_key(v) if k.lower() == "authorization" else v) for k, v in headers.items()}
    logger.info(f"🚀 بدء إرسال الطلب إلى: {endpoint}")
    logger.info(f"📋 ترويسات الطلب: {json.dumps(safe_headers, ensure_ascii=False)}")
    if payload:
        logger.info(f"📦 جسم الطلب: {json.dumps(payload, ensure_ascii=False)}")

    # 4. التراجع التدريجي (Exponential Backoff) للأخطاء والـ Rate Limit
    session = requests.Session()
    retry_strategy = Retry(
        total=max_retries,
        backoff_factor=1.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["POST", "GET"]
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    try:
        start_time = time.time()
        response = session.post(
            endpoint,
            headers=headers,
            json=payload or {},
            timeout=timeout_seconds
        )
        latency = round((time.time() - start_time) * 1000, 2)

        # 2. ضمان ترميز UTF-8 الصحيح
        response.encoding = 'utf-8'
        logger.info(f"📥 حالة الاستجابة: HTTP {response.status_code} ({latency}ms)")

        if response.status_code == 200:
            try:
                json_data = response.json()
                logger.info(f"✅ تم التحقق من المفتاح بنجاح! محتوى الاستجابة:\n{json.dumps(json_data, indent=2, ensure_ascii=False)}")
                return True
            except json.JSONDecodeError:
                logger.warning(f"⚠️ الاستجابة ليست بتنسيق JSON: {response.text}")
                return True
        elif response.status_code in (401, 403):
            logger.error(f"❌ المفتاح غير صالح أو ليس لديه الصلاحيات الكافية ({response.status_code}).")
            return False
        elif response.status_code == 429:
            logger.error("⚠️ تجاوز حد الطلبات (429 Rate Limit Exceeded).")
            return False
        else:
            logger.error(f"❌ فشل الطلب (HTTP {response.status_code}): {response.text}")
            return False

    except requests.exceptions.Timeout:
        logger.error(f"⏳ انقضت مهلة الاتصال بالخادم بعد {timeout_seconds} ثانية (Timeout).")
        return False
    except requests.exceptions.RequestException as e:
        logger.error(f"💥 خطأ في الاتصال: {str(e)}")
        return False
    finally:
        session.close()

if __name__ == "__main__":
    test_api_connection(
        endpoint="https://api.openai.com/v1/models",
        env_var_name="OPENAI_API_KEY"
    )`
  },
  {
    language: 'Node.js (TypeScript)',
    filename: 'test_api_key.ts',
    code: `import process from 'node:process';

interface TestOptions {
  endpoint: string;
  envVarName?: string;
  payload?: Record<string, unknown>;
  maxRetries?: number;
  timeoutMs?: number;
}

function maskApiKey(key?: string): string {
  if (!key || key.length < 8) return '***REDACTED***';
  return \`\${key.slice(0, 4)}...\${key.slice(-4)}\`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function testApiConnection({
  endpoint,
  envVarName = 'API_KEY',
  payload,
  maxRetries = 3,
  timeoutMs = 15000,
}: TestOptions): Promise<boolean> {
  // 1. قراءة المفتاح من البيئة فقط (OWASP)
  const apiKey = process.env[envVarName];
  if (!apiKey) {
    console.error(\`❌ لم يتم العثور على متغير البيئة [\${envVarName}].\`);
    return false;
  }

  const headers: Record<string, string> = {
    'Authorization': \`Bearer \${apiKey}\`,
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json',
  };

  const safeHeaders = { ...headers, Authorization: \`Bearer \${maskApiKey(apiKey)}\` };
  console.log(\`🚀 [Request Start] URL: \${endpoint}\`);
  console.log(\`📋 Headers:\`, JSON.stringify(safeHeaders, null, 2));

  let attempt = 0;
  let delay = 1000;

  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: payload ? 'POST' : 'GET',
        headers,
        body: payload ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latency = Date.now() - startTime;
      console.log(\`📥 [Response] Status: \${response.status} (\${latency}ms)\`);

      // 2. التحقق من الترميز UTF-8
      const rawText = await response.text();
      let jsonData: any = null;
      try {
        jsonData = JSON.parse(rawText);
      } catch {
        jsonData = null;
      }

      if (response.status === 429 || (response.status >= 500 && response.status <= 504)) {
        if (attempt <= maxRetries) {
          console.warn(\`⚠️ استجابة \${response.status}. إعادة المحاولة بعد \${delay / 1000}s (محاولة \${attempt}/\${maxRetries})...\`);
          await sleep(delay);
          delay *= 2;
          continue;
        }
      }

      if (response.ok) {
        console.log(\`✅ المفتاح صالح وموثق بنجاح!\`, jsonData || rawText);
        return true;
      } else {
        console.error(\`❌ فشل الطلب (HTTP \${response.status}):\`, jsonData || rawText);
        return false;
      }
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        console.error(\`⏳ انقضت مهلة الاتصال بعد \${timeoutMs / 1000} ثانية.\`);
      } else {
        console.error(\`💥 خطأ أثناء محاولة الاتصال:\`, err.message);
      }

      if (attempt <= maxRetries) {
        await sleep(delay);
        delay *= 2;
      } else {
        return false;
      }
    }
  }

  return false;
}`
  },
  {
    language: 'Go',
    filename: 'test_api_key.go',
    code: `package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

func maskKey(key string) string {
	if len(key) < 8 {
		return "***REDACTED***"
	}
	return fmt.Sprintf("%s...%s", key[:4], key[len(key)-4:])
}

func testAPI(endpoint string, envVar string, maxRetries int) bool {
	apiKey := os.Getenv(envVar)
	if apiKey == "" {
		log.Printf("❌ متغير البيئة %s غير متوفر", envVar)
		return false
	}

	client := &http.Client{}
	delay := 1 * time.Second

	for attempt := 1; attempt <= maxRetries; attempt++ {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
		if err != nil {
			log.Printf("خطأ في بناء الطلب: %v", err)
			return false
		}

		req.Header.Set("Authorization", "Bearer "+apiKey)
		req.Header.Set("Content-Type", "application/json; charset=utf-8")
		req.Header.Set("Accept", "application/json")

		log.Printf("🚀 [محاولة %d] إرسال الطلب إلى %s (المفتاح: %s)", attempt, endpoint, maskKey(apiKey))

		start := time.Now()
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("💥 خطأ في الاتصال: %v", err)
			time.Sleep(delay)
			delay *= 2
			continue
		}

		func() {
			defer resp.Body.Close()
			body, _ := io.ReadAll(resp.Body)
			latency := time.Since(start).Milliseconds()

			log.Printf("📥 HTTP Status: %d (%dms)", resp.StatusCode, latency)

			if resp.StatusCode == http.StatusOK {
				log.Printf("✅ نجح الاتصال! الرد: %s", string(body))
			} else {
				log.Printf("⚠️ رد غير متوقع: %s", string(body))
			}
		}()

		if resp.StatusCode == http.StatusOK {
			return true
		}

		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
			time.Sleep(delay)
			delay *= 2
			continue
		}
		break
	}

	return false
}

func main() {
	testAPI("https://api.openai.com/v1/models", "OPENAI_API_KEY", 3)
}`
  },
  {
    language: 'PHP',
    filename: 'test_api_key.php',
    code: `<?php

function maskApiKey(?string $key): string {
    if (!$key || strlen($key) < 8) return '***REDACTED***';
    return substr($key, 0, 4) . '...' . substr($key, -4);
}

function testApiConnection(string $endpoint, string $envVar = 'API_KEY', int $maxRetries = 3): bool {
    $apiKey = getenv($envVar) ?: ($_ENV[$envVar] ?? null);
    if (!$apiKey) {
        error_log("❌ [Error] متغير البيئة {$envVar} غير معرف.");
        return false;
    }

    $delay = 1;

    for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
        $ch = curl_init($endpoint);

        $headers = [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json; charset=utf-8',
            'Accept: application/json'
        ];

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_ENCODING       => 'UTF-8',
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $maskedHeaders = $headers;
        $maskedHeaders[0] = 'Authorization: Bearer ' . maskApiKey($apiKey);
        error_log("🚀 [Request Attempt {$attempt}] Target: {$endpoint}");

        $startTime = microtime(true);
        $response = curl_exec($ch);
        $latency = round((microtime(true) - $startTime) * 1000);
        $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            error_log("💥 [cURL Error]: {$curlError}");
            sleep($delay);
            $delay *= 2;
            continue;
        }

        error_log("📥 [Response] Status: {$statusCode} ({$latency}ms)");

        if ($statusCode === 200) {
            $json = json_decode($response, true);
            error_log("✅ تم التحقق من المفتاح بنجاح: " . ($json ? json_encode($json, JSON_UNESCAPED_UNICODE) : $response));
            return true;
        } elseif ($statusCode === 429 || $statusCode >= 500) {
            error_log("⚠️ تجاوز الحد المسموح ({$statusCode}). إعادة المحاولة بعد {$delay}s...");
            sleep($delay);
            $delay *= 2;
            continue;
        } else {
            error_log("❌ فشل التحقق (HTTP {$statusCode}): {$response}");
            return false;
        }
    }

    return false;
}

testApiConnection('https://api.openai.com/v1/models', 'OPENAI_API_KEY');`
  },
  {
    language: 'Hugging Face (TypeScript)',
    filename: 'hf_inference_test.ts',
    code: `import process from 'node:process';

interface InferenceRequest {
  modelId: string;
  prompt: string;
  maxNewTokens?: number;
  temperature?: number;
}

interface InferenceResponse {
  generated_text?: string;
  error?: string;
  [key: string]: any;
}

/**
 * إرسال طلب استدلال آمن إلى Hugging Face Inference API
 * مع التحقق من ترويسات المصادقة Bearer ومصادقة المتغيرات البيئية
 */
export async function testHuggingFaceInference({
  modelId = 'meta-llama/Llama-3.3-70B-Instruct',
  prompt,
  maxNewTokens = 512,
  temperature = 0.7
}: InferenceRequest): Promise<InferenceResponse> {
  // 1. قراءة الـ Token حصرياً من متغيرات البيئة (OWASP Guidelines)
  const hfToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;

  if (!hfToken) {
    throw new Error('❌ خطأ أمني: لم يتم العثور على HF_TOKEN في متغيرات البيئة (process.env).');
  }

  // 2. ترويسات الطلب المعتمدة رسمياً
  const headers = {
    'Authorization': \`Bearer \${hfToken}\`,
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json'
  };

  // نقاط النهاية الأساسية (Router الحديث والـ Inference API)
  const endpoint = \`https://router.huggingface.co/hf-inference/v1/chat/completions\`;

  console.log(\`🚀 [Hugging Face] إرسال طلب إلى النموذج: \${modelId}\`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxNewTokens,
        temperature
      })
    });

    // 3. فحص الأخطاء والـ Status Codes
    if (response.status === 401 || response.status === 403) {
      throw new Error(\`❌ خطأ في المصادقة (HTTP \${response.status}): الـ Hugging Face Token غير صالح أو منتهي الصلاحية.\`);
    }

    if (response.status === 429) {
      throw new Error('⚠️ تم تجاوز حد الاستخدام المسموح (HTTP 429 Rate Limit Exceeded). يرجى تكرار المحاولة لاحقاً.');
    }

    if (response.status === 503) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(\`⏳ النموذج قيد التحميل في خوادم Hugging Face (503 Estimated Time: \${errJson.estimated_time || 'غير محدد'}s)\`);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(\`❌ فشل الطلب (HTTP \${response.status}): \${errText}\`);
    }

    const data = await response.json();
    console.log('✅ نجح الاستدلال من Hugging Face:', data);
    return data;
  } catch (error: any) {
    console.error('💥 استثناء أثناء طلب Hugging Face:', error.message);
    throw error;
  }
}`
  },
  {
    language: 'Hugging Face (Python)',
    filename: 'hf_inference_test.py',
    code: `import os
import json
import logging
import requests
from typing import Dict, Any, Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("HF_Inference")

def query_huggingface_model(
    prompt: str,
    model_id: str = "meta-llama/Llama-3.3-70B-Instruct",
    max_tokens: int = 512,
    temperature: float = 0.7,
    timeout: int = 30
) -> Optional[Dict[str, Any]]:
    """
    إرسال طلب استدلال آمن إلى Hugging Face Inference API
    وفق معايير الأمان وقراءة Token حصرياً من متغيرات البيئة.
    """
    # 1. قراءة الـ Token حصرياً من متغيرات البيئة
    hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
    if not hf_token:
        logger.error("❌ خطأ أمني: لم يتم العثور على HF_TOKEN في متغيرات البيئة (os.environ).")
        return None

    # 2. ترويسات الطلب القياسية
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json"
    }

    payload = {
        "model": model_id,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": temperature
    }

    endpoint = "https://router.huggingface.co/hf-inference/v1/chat/completions"
    logger.info(f"🚀 إرسال طلب إلى Hugging Face للنموذج: {model_id}")

    try:
        response = requests.post(endpoint, headers=headers, json=payload, timeout=timeout)
        response.encoding = 'utf-8'

        # 3. التحقق من حالات الاستجابة وأخطاء الـ API
        if response.status_code == 200:
            result = response.json()
            logger.info("✅ تم الاستدلال بنجاح من Hugging Face!")
            return result
        elif response.status_code in (401, 403):
            logger.error(f"❌ خطأ مصادقة ({response.status_code}): المفتاح غير صالح أو يفتقر لصلاحيات الاستدلال.")
        elif response.status_code == 429:
            logger.error("⚠️ تجاوز حد الطلبات المسموح (Rate Limit Exceeded HTTP 429).")
        elif response.status_code == 503:
            logger.warning(f"⏳ النموذج قيد التحميل في الذاكرة (Status 503): {response.text}")
        else:
            logger.error(f"❌ استجابة غير متوقعة (HTTP {response.status_code}): {response.text}")

        return None

    except requests.exceptions.Timeout:
        logger.error(f"⏳ انقضت مهلة الاتصال بعد {timeout} ثانية.")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"💥 خطأ غير متوقع في الشبكة: {str(e)}")
        return None

if __name__ == "__main__":
    query_huggingface_model(
        prompt="اشرح مفهوم الذكاء الاصطناعي التوليدي في 3 نقاط موجزة.",
        model_id="meta-llama/Llama-3.3-70B-Instruct"
    )`
  }
];
