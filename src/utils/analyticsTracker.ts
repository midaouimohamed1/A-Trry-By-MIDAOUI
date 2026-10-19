/**
 * Historical Usage & Token Consumption Analytics Tracker
 * Tracks token usage, model execution counts, latencies, and interaction trends.
 */

export interface TokenUsageRecord {
  id: string;
  timestamp: string;
  provider: string;
  modelId: string;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  latencyMs: number;
  status: 'success' | 'error';
}

export interface ModelInteractionMetrics {
  rank: number;
  name: string;
  viewCount: number;
  bookmarkCount: number;
  compareCount: number;
  playgroundRuns: number;
  lastInteracted: string;
}

const TOKEN_USAGE_KEY = 'ai_analytics_token_usage_v1';
const MODEL_METRICS_KEY = 'ai_analytics_model_metrics_v1';

export class AnalyticsTracker {
  public static logTokenUsage(record: Omit<TokenUsageRecord, 'id' | 'timestamp'>): TokenUsageRecord {
    const newRecord: TokenUsageRecord = {
      ...record,
      id: `usage_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };

    try {
      if (typeof localStorage !== 'undefined') {
        const existing = this.getTokenUsageHistory();
        existing.unshift(newRecord);
        // Keep last 100 entries
        localStorage.setItem(TOKEN_USAGE_KEY, JSON.stringify(existing.slice(0, 100)));
      }
    } catch (err) {
      console.warn('Could not persist token usage log:', err);
    }

    return newRecord;
  }

  public static getTokenUsageHistory(): TokenUsageRecord[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(TOKEN_USAGE_KEY);
        return saved ? JSON.parse(saved) : [];
      }
    } catch {}
    return [];
  }

  public static getAggregateUsage(): {
    totalCalls: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalCostUSD: number;
    avgLatencyMs: number;
  } {
    const history = this.getTokenUsageHistory();
    const totalCalls = history.length;
    if (totalCalls === 0) {
      return {
        totalCalls: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        totalCostUSD: 0,
        avgLatencyMs: 0
      };
    }

    const totalPromptTokens = history.reduce((acc, h) => acc + (h.promptTokens || 0), 0);
    const totalCompletionTokens = history.reduce((acc, h) => acc + (h.completionTokens || 0), 0);
    const totalTokens = history.reduce((acc, h) => acc + (h.totalTokens || 0), 0);
    const totalCostUSD = history.reduce((acc, h) => acc + (h.estimatedCostUSD || 0), 0);
    const totalLatency = history.reduce((acc, h) => acc + (h.latencyMs || 0), 0);

    return {
      totalCalls,
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens,
      totalCostUSD,
      avgLatencyMs: Math.round(totalLatency / totalCalls)
    };
  }

  public static trackModelInteraction(
    rank: number,
    name: string,
    action: 'view' | 'bookmark' | 'compare' | 'playground'
  ) {
    try {
      if (typeof localStorage === 'undefined') return;
      const saved = localStorage.getItem(MODEL_METRICS_KEY);
      const metricsMap: Record<number, ModelInteractionMetrics> = saved ? JSON.parse(saved) : {};

      const current = metricsMap[rank] || {
        rank,
        name,
        viewCount: 0,
        bookmarkCount: 0,
        compareCount: 0,
        playgroundRuns: 0,
        lastInteracted: new Date().toISOString()
      };

      if (action === 'view') current.viewCount += 1;
      if (action === 'bookmark') current.bookmarkCount += 1;
      if (action === 'compare') current.compareCount += 1;
      if (action === 'playground') current.playgroundRuns += 1;
      current.lastInteracted = new Date().toISOString();

      metricsMap[rank] = current;
      localStorage.setItem(MODEL_METRICS_KEY, JSON.stringify(metricsMap));
    } catch (err) {
      console.warn('Could not track model interaction:', err);
    }
  }

  public static getPopularModelsMetrics(): ModelInteractionMetrics[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const saved = localStorage.getItem(MODEL_METRICS_KEY);
      if (!saved) return [];
      const metricsMap: Record<number, ModelInteractionMetrics> = JSON.parse(saved);
      return Object.values(metricsMap).sort((a, b) => {
        const scoreA = a.viewCount * 1 + a.bookmarkCount * 3 + a.compareCount * 2 + a.playgroundRuns * 4;
        const scoreB = b.viewCount * 1 + b.bookmarkCount * 3 + b.compareCount * 2 + b.playgroundRuns * 4;
        return scoreB - scoreA;
      });
    } catch {
      return [];
    }
  }

  public static clearHistory(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_USAGE_KEY);
      localStorage.removeItem(MODEL_METRICS_KEY);
    }
  }
}
