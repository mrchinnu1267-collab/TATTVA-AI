/**
 * TATTVA AI - Cost Optimizer, Budget Guard & Response Caching (Phase 21)
 * Tracks token spending, enforces budget ceilings, and serves cached responses
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface CachedResponse {
  queryHash: string;
  response: string;
  createdAt: number;
  ttlMs: number;
  hits: number;
}

export class CostOptimizer {
  private static instance: CostOptimizer;
  private cache: Map<string, CachedResponse> = new Map();
  private userSpending: Map<string, number> = new Map();
  private maxCacheSize = 500;

  // Pricing per 1M tokens ($)
  private pricingTable: Record<string, { promptPer1M: number; completionPer1M: number }> = {
    "gemini-3.5-flash-lite": { promptPer1M: 0.075, completionPer1M: 0.30 },
    "gemini-3.6-flash": { promptPer1M: 0.15, completionPer1M: 0.60 },
    "tattva-slm-3b": { promptPer1M: 0.02, completionPer1M: 0.05 },
    "default": { promptPer1M: 0.15, completionPer1M: 0.60 },
  };

  public static getInstance(): CostOptimizer {
    if (!CostOptimizer.instance) {
      CostOptimizer.instance = new CostOptimizer();
    }
    return CostOptimizer.instance;
  }

  private hashQuery(query: string, model: string): string {
    return `${model}::${query.trim().toLowerCase()}`;
  }

  /**
   * Retrieves cached response if valid and not expired
   */
  public getCachedResponse(query: string, model: string): string | null {
    const key = this.hashQuery(query, model);
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.createdAt > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.response;
  }

  /**
   * Stores response in cache with time-to-live
   */
  public setCachedResponse(query: string, model: string, response: string, ttlMs: number = 3600000) {
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    const key = this.hashQuery(query, model);
    this.cache.set(key, {
      queryHash: key,
      response,
      createdAt: Date.now(),
      ttlMs,
      hits: 0,
    });
  }

  /**
   * Calculates token cost in USD
   */
  public calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const rates = this.pricingTable[model] || this.pricingTable["default"];
    const promptCost = (promptTokens / 1000000) * rates.promptPer1M;
    const completionCost = (completionTokens / 1000000) * rates.completionPer1M;
    return Number((promptCost + completionCost).toFixed(6));
  }

  /**
   * Tracks user spending and enforces budget limits
   */
  public recordAndCheckBudget(
    userId: string,
    costUsd: number,
    dailyLimitUsd: number = 5.0
  ): { allowed: boolean; currentSpend: number; remaining: number } {
    const current = (this.userSpending.get(userId) || 0) + costUsd;
    this.userSpending.set(userId, current);

    const allowed = current <= dailyLimitUsd;
    const remaining = Math.max(0, Number((dailyLimitUsd - current).toFixed(4)));

    return {
      allowed,
      currentSpend: Number(current.toFixed(4)),
      remaining,
    };
  }
}

export const costOptimizer = CostOptimizer.getInstance();
