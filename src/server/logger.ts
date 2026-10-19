import express from 'express';
import { hashUserIdentifier } from './quotaRateLimiter';

export interface StructuredLogPayload {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  eventType: string;
  clientHash?: string;
  path?: string;
  method?: string;
  message: string;
  details?: Record<string, unknown>;
  latencyMs?: number;
}

/**
 * Sanitizes strings to prevent sensitive API keys or authorization headers from leaking into server logs.
 */
export function sanitizeLogData(input: unknown): unknown {
  if (typeof input === 'string') {
    // Redact tokens, bearer keys, and api keys
    return input
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
      .replace(/sk-[0-9A-Za-z-_]{32,}/g, '[REDACTED_API_KEY]')
      .replace(/gsk_[0-9A-Za-z-_]{32,}/g, '[REDACTED_API_KEY]')
      .replace(/hf_[0-9A-Za-z-_]{32,}/g, '[REDACTED_API_KEY]');
  }
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const cleanObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      if (/key|secret|token|password|auth/i.test(key)) {
        cleanObj[key] = '[REDACTED]';
      } else {
        cleanObj[key] = sanitizeLogData(val);
      }
    }
    return cleanObj;
  }
  return input;
}

/**
 * Production-ready JSON Structured Logger.
 */
export class StructuredLogger {
  public static log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', eventType: string, message: string, details?: Record<string, unknown>, req?: express.Request): void {
    const clientIp = req ? ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown') : undefined;
    const clientHash = clientIp ? hashUserIdentifier(clientIp) : undefined;

    const payload: StructuredLogPayload = {
      timestamp: new Date().toISOString(),
      level,
      eventType,
      clientHash,
      path: req?.originalUrl || req?.url,
      method: req?.method,
      message,
      details: details ? (sanitizeLogData(details) as Record<string, unknown>) : undefined
    };

    const formatted = JSON.stringify(payload);
    if (level === 'ERROR') {
      console.error(formatted);
    } else if (level === 'WARN') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  public static info(eventType: string, message: string, details?: Record<string, unknown>, req?: express.Request): void {
    this.log('INFO', eventType, message, details, req);
  }

  public static warn(eventType: string, message: string, details?: Record<string, unknown>, req?: express.Request): void {
    this.log('WARN', eventType, message, details, req);
  }

  public static error(eventType: string, message: string, details?: Record<string, unknown>, req?: express.Request): void {
    this.log('ERROR', eventType, message, details, req);
  }
}

/**
 * Uniform Global Express Error Handling Middleware.
 */
export function globalErrorHandler(
  err: Error & { status?: number; statusCode?: number; code?: string },
  req: express.Request,
  res: express.Response,
  _next: express.NextFunction
): void {
  const statusCode = err.status || err.statusCode || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;

  StructuredLogger.error('UNCAUGHT_HTTP_ERROR', err.message, {
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    statusCode,
    errorCode: err.code || 'INTERNAL_SERVER_ERROR'
  }, req);

  res.status(statusCode).json({
    status: 'error',
    errorCode: err.code || (isClientError ? 'CLIENT_REQUEST_ERROR' : 'INTERNAL_SERVICE_ERROR'),
    errorMessage: err.message || 'حدث خطأ غير متوقع أثناء معالجة الطلب.',
    timestamp: new Date().toISOString()
  });
}
