/**
 * Error Reporting & Telemetry Service
 * Catches, structures, and logs runtime errors and performance anomalies.
 * Designed to integrate with external monitoring services (e.g. Sentry, Datadog)
 * while providing local diagnostic telemetry.
 */

export interface TelemetryErrorEvent {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  componentStack?: string;
  source: string;
  url: string;
  userAgent: string;
  severity: 'fatal' | 'error' | 'warning' | 'info';
  metadata?: Record<string, unknown>;
}

const MAX_STORED_ERRORS = 50;
const TELEMETRY_STORAGE_KEY = 'ai_app_telemetry_errors';

class TelemetryService {
  private errors: TelemetryErrorEvent[] = [];
  private remoteEndpoint: string | null = null;

  constructor() {
    this.loadPersistedErrors();
  }

  private loadPersistedErrors() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(TELEMETRY_STORAGE_KEY);
        if (saved) {
          this.errors = JSON.parse(saved);
        }
      }
    } catch {
      this.errors = [];
    }
  }

  private persistErrors() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          TELEMETRY_STORAGE_KEY,
          JSON.stringify(this.errors.slice(-MAX_STORED_ERRORS))
        );
      }
    } catch (err) {
      console.warn('Could not persist telemetry errors:', err);
    }
  }

  public setRemoteEndpoint(endpoint: string) {
    this.remoteEndpoint = endpoint;
  }

  public captureException(
    error: Error | unknown,
    context?: {
      source?: string;
      componentStack?: string;
      severity?: 'fatal' | 'error' | 'warning' | 'info';
      metadata?: Record<string, unknown>;
    }
  ): TelemetryErrorEvent {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const event: TelemetryErrorEvent = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      message: errorObj.message || 'Unknown runtime error',
      stack: errorObj.stack,
      componentStack: context?.componentStack,
      source: context?.source || 'ReactComponent',
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Server',
      severity: context?.severity || 'error',
      metadata: context?.metadata
    };

    console.error('[Telemetry Captured Error]:', event);

    this.errors.push(event);
    this.persistErrors();

    // Dispatch remote telemetry if configured
    if (this.remoteEndpoint && typeof fetch !== 'undefined') {
      try {
        fetch(this.remoteEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
          keepalive: true
        }).catch(() => {
          // Fail silently without disrupting user experience
        });
      } catch {}
    }

    return event;
  }

  public getErrors(): TelemetryErrorEvent[] {
    return [...this.errors];
  }

  public clearErrors(): void {
    this.errors = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TELEMETRY_STORAGE_KEY);
    }
  }
}

export const telemetry = new TelemetryService();
