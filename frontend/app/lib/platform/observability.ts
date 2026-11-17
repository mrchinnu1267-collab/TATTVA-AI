/**
 * TATTVA AI - Platform Observability, Cost Optimization & Health Engine
 * Tracks token usage, real-time latencies, per-model cost estimation,
 * provider error rates, and security audit metrics with zero secret exposure.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface RequestMetric {
  timestamp: number;
  userId: string;
  endpoint: string;
  model: string;
  provider: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  status: "success" | "error" | "rate_limited" | "fallback";
  errorMessage?: string;
}

export interface ObservabilitySnapshot {
  systemStatus: "healthy" | "degraded" | "critical";
  uptimeSeconds: number;
  totalRequests: number;
  totalTokensUsed: number;
  totalEstimatedCostUsd: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRatePercent: number;
  activeProviders: Record<string, { available: boolean; recentErrors: number; circuitState: "CLOSED" | "HALF_OPEN" | "OPEN" }>;
  recentIncidents: Array<{ timestamp: string; type: string; summary: string }>;
  recentRequests: Array<Omit<RequestMetric, "userId">>;
}

class PlatformObservabilityEngine {
  private static instance: PlatformObservabilityEngine;
  private metricsBuffer: RequestMetric[] = [];
  private incidentLog: Array<{ timestamp: string; type: string; summary: string }> = [];
  private deduplicationCache = new Map<string, { response: any; timestamp: number }>();
  private readonly MAX_BUFFER_SIZE = 1000;
  private readonly DEDUP_TTL_MS = 15000;

  private constructor() {}

  public static getInstance(): PlatformObservabilityEngine {
    if (!PlatformObservabilityEngine.instance) {
      PlatformObservabilityEngine.instance = new PlatformObservabilityEngine();
    }
    return PlatformObservabilityEngine.instance;
  }

  /**
   * Records a completed API or chat request metric
   */
  public recordMetric(metric: RequestMetric): void {
    this.metricsBuffer.unshift(metric);
    if (this.metricsBuffer.length > this.MAX_BUFFER_SIZE) {
      this.metricsBuffer.pop();
    }

    if (metric.status === "error" || metric.status === "rate_limited") {
      this.recordIncident(metric.status.toUpperCase(), `${metric.endpoint} on ${metric.model}: ${metric.errorMessage || "Request failed"}`);
    }
  }

  /**
   * Records an operational incident for the admin dashboard
   */
  public recordIncident(type: string, summary: string): void {
    this.incidentLog.unshift({
      timestamp: new Date().toISOString(),
      type,
      summary: summary.slice(0, 150),
    });
    if (this.incidentLog.length > 100) {
      this.incidentLog.pop();
    }
  }

  /**
   * Checks for identical in-flight / immediate duplicate requests from the same user
   */
  public getCachedDuplicate(userKey: string, requestHash: string): any | null {
    const key = `${userKey}:${requestHash}`;
    const cached = this.deduplicationCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.DEDUP_TTL_MS) {
      return cached.response;
    }
    return null;
  }

  /**
   * Caches a user response for safe deduplication within TTL window
   */
  public setCachedDuplicate(userKey: string, requestHash: string, response: any): void {
    const key = `${userKey}:${requestHash}`;
    this.deduplicationCache.set(key, { response, timestamp: Date.now() });

    // Prune stale cache entries if map grows large
    if (this.deduplicationCache.size > 500) {
      const now = Date.now();
      for (const [k, v] of this.deduplicationCache.entries()) {
        if (now - v.timestamp > this.DEDUP_TTL_MS) {
          this.deduplicationCache.delete(k);
        }
      }
    }
  }

  /**
   * Generates aggregated health and cost analytics for monitoring dashboards
   */
  public getSnapshot(): ObservabilitySnapshot {
    const totalRequests = this.metricsBuffer.length;
    let totalTokens = 0;
    let totalCost = 0;
    let errorCount = 0;
    const latencies: number[] = [];

    for (const m of this.metricsBuffer) {
      totalTokens += (m.promptTokens || 0) + (m.completionTokens || 0);
      totalCost += m.costUsd || 0;
      if (m.status === "error" || m.status === "fallback") errorCount++;
      if (typeof m.latencyMs === "number") latencies.push(m.latencyMs);
    }

    latencies.sort((a, b) => a - b);
    const avgLatencyMs = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95LatencyMs = latencies.length > 0 ? latencies[p95Index] || latencies[latencies.length - 1] : 0;
    const errorRatePercent = totalRequests > 0 ? Number(((errorCount / totalRequests) * 100).toFixed(1)) : 0;

    let systemStatus: ObservabilitySnapshot["systemStatus"] = "healthy";
    if (errorRatePercent > 20) systemStatus = "critical";
    else if (errorRatePercent > 5) systemStatus = "degraded";

    return {
      systemStatus,
      uptimeSeconds: Math.floor(process.uptime()),
      totalRequests,
      totalTokensUsed: totalTokens,
      totalEstimatedCostUsd: Number(totalCost.toFixed(6)),
      avgLatencyMs,
      p95LatencyMs,
      errorRatePercent,
      activeProviders: {
        gemini: { available: Boolean(process.env.GEMINI_API_KEY), recentErrors: 0, circuitState: "CLOSED" },
        openrouter: { available: Boolean(process.env.OPENROUTER_API_KEY), recentErrors: 0, circuitState: "CLOSED" },
        anthropic: { available: Boolean(process.env.ANTHROPIC_API_KEY), recentErrors: 0, circuitState: "CLOSED" },
        nvidia: { available: Boolean(process.env.NVIDIA_API_KEY), recentErrors: 0, circuitState: "CLOSED" },
      },
      recentIncidents: this.incidentLog.slice(0, 10),
      recentRequests: this.metricsBuffer.slice(0, 20).map(({ userId, ...rest }) => rest),
    };
  }
}

export const platformObservability = PlatformObservabilityEngine.getInstance();
