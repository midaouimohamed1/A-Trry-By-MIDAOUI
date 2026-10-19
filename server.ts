import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

  // Security Headers
  app.use(
    helmet({
      frameguard: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'", "'unsafe-inline'", "https:", "data:", "blob:"],
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

  // Asset Compression
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

  app.use(express.json({ limit: '64kb' }));

  // Basic Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'RepoLister-X Dedicated GitHub Catalog Assistant',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // =========================================================================
  // RepoLister-X API Endpoints
  // =========================================================================

  // 1. Get Angles Definition
  app.get('/api/repolister/angles', (_req, res) => {
    res.json({
      status: 'success',
      angles: REPOLISTER_ANGLES
    });
  });

  // 2. Get Date Ranges (month-by-month starting today backwards)
  app.get('/api/repolister/date-ranges', (_req, res) => {
    const ranges = generateDateRanges(36);
    res.json({
      status: 'success',
      ranges
    });
  });

  // 3. Step 1: Pre-flight lightweight estimation (per_page=1) across ALL 3 angles
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

      // Query all 3 angles, never skip any
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

  // 4. Steps 2-5: Execute Batch Query covering the 3 angles for a date slice
  app.post('/api/repolister/batch', async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        angleId = 'all',
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

      // Combine all 3 angles or specific angle
      let queryTerm = '';
      if (angleId === 'all') {
        queryTerm = `("clean room" OR "clean-room" OR "black box specification") OR ("technical specification" "reverse engineering" OR "cleanroom software") OR ("behavioral specification" "implementation")`;
      } else {
        const found = REPOLISTER_ANGLES.find((a) => a.id === angleId);
        queryTerm = found ? found.query : REPOLISTER_ANGLES[0].query;
      }

      const dateFilter = `created:${startDate}..${endDate}`;
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
      const angleBreakdown = { direct: 0, adjacent: 0, crossDomain: 0 };

      for (const raw of rawItems) {
        // Classify which angle found it
        const text = `${raw.name} ${raw.description || ''} ${(raw.topics || []).join(' ')}`.toLowerCase();
        let angle: 'direct' | 'adjacent' | 'cross-domain' = 'direct';
        if (text.includes('clean room') || text.includes('clean-room') || text.includes('black box')) {
          angle = 'direct';
          angleBreakdown.direct++;
        } else if (text.includes('technical spec') || text.includes('compliance') || text.includes('reverse engineering')) {
          angle = 'adjacent';
          angleBreakdown.adjacent++;
        } else {
          angle = 'cross-domain';
          angleBreakdown.crossDomain++;
        }

        const { include, item } = processRepoItem(raw, angle);
        if (include && item) {
          processedItems.push(item);
        } else {
          omittedCount++;
        }
      }

      // 50 per batch
      const batchItems = processedItems.slice(0, 50);
      const newTotalFound = totalFoundSoFar + batchItems.length;
      const hasMoreBatches = page * 50 < totalCountForRange;

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
        perPage: 50,
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
        angleBreakdown,
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

  // Global Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(500).json({ status: 'error', errorMessage: err?.message || 'Internal Server Error' });
  });

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
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RepoLister-X Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
