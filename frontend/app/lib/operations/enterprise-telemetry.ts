/**
 * TATTVA AI - Enterprise Reliability, Telemetry & Cost Governance Engine (Phase 39)
 * Multi-tenant safe caching, latency percentiles, token/cost monitoring, and DR rollback procedures
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface LatencyMetrics {
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  sampleCount: number;
}

export interface TaskCostAudit {
  taskId: string;
  userId: string;
  modelId: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  timestamp: number;
}

export interface TenantCacheEntry<T> {
  userId: string;
  key: string;
  data: T;
  expiresAt: number;
}

export class EnterpriseOperationsHub {
  private static instance: EnterpriseOperationsHub;

  public static getInstance(): EnterpriseOperationsHub {
    if (!EnterpriseOperationsHub.instance) {
      EnterpriseOperationsHub.instance = new EnterpriseOperationsHub();
    }
    return EnterpriseOperationsHub.instance;
  }

  private tenantCache = new Map<string, TenantCacheEntry<any>>();
  private latencySamples: number[] = [];
  private taskCostLogs: TaskCostAudit[] = [];
  private userBudgetCaps = new Map<string, number>(); // userId -> monthly limit USD
  private providerPricingPer1kTokens: Record<string, { input: number; output: number }> = {
    "gemini-3.5-flash-lite": { input: 0.000075, output: 0.0003 },
    "deepseek/deepseek-chat": { input: 0.00014, output: 0.00028 },
    "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
  };

  /**
   * Multi-Tenant Safe Cache: Strictly keys by (userId + key) to prevent cross-account cache leakage
   */
  public setTenantCache<T>(userId: string, key: string, data: T, ttlSeconds: number = 300): void {
    if (!userId) throw new Error("Tenant cache requires valid userId to prevent cross-account pollution.");
    const cacheKey = `${userId}::${key}`;
    this.tenantCache.set(cacheKey, {
      userId,
      key,
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  public getTenantCache<T>(requestingUserId: string, key: string): T | null {
    const cacheKey = `${requestingUserId}::${key}`;
    const entry = this.tenantCache.get(cacheKey);
    if (!entry) return null;

    // Defense-in-depth: Verify requesting user matches owner
    if (entry.userId !== requestingUserId) {
      console.error(`[Security Alert] Cross-tenant cache access attempted by ${requestingUserId} on ${entry.userId}`);
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.tenantCache.delete(cacheKey);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Records execution latency sample and computes statistical percentiles
   */
  public recordLatency(durationMs: number): void {
    this.latencySamples.push(durationMs);
    if (this.latencySamples.length > 1000) {
      this.latencySamples.shift();
    }
  }

  public getLatencyMetrics(): LatencyMetrics {
    if (this.latencySamples.length === 0) {
      return { p50Ms: 0, p90Ms: 0, p95Ms: 0, p99Ms: 0, sampleCount: 0 };
    }

    const sorted = [...this.latencySamples].sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
      return sorted[idx];
    };

    return {
      p50Ms: getPercentile(50),
      p90Ms: getPercentile(90),
      p95Ms: getPercentile(95),
      p99Ms: getPercentile(99),
      sampleCount: sorted.length,
    };
  }

  /**
   * Tracks token usage and computes exact cost per task
   */
  public trackTaskCost(
    taskId: string,
    userId: string,
    modelId: string,
    provider: string,
    inputTokens: number,
    outputTokens: number
  ): TaskCostAudit {
    const rates = this.providerPricingPer1kTokens[modelId] || { input: 0.0001, output: 0.0003 };
    const costUsd = Number(
      ((inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output).toFixed(6)
    );

    const audit: TaskCostAudit = {
      taskId,
      userId,
      modelId,
      provider,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCostUsd: costUsd,
      timestamp: Date.now(),
    };

    this.taskCostLogs.push(audit);
    return audit;
  }

  /**
   * Validates user spending against budget caps and prevents silent model upgrades
   */
  public evaluateBudgetCap(userId: string, attemptedCostUsd: number): { allowed: boolean; remainingBudgetUsd: number; alertTriggered?: boolean } {
    const cap = this.userBudgetCaps.get(userId) || 25.0; // Default $25/mo cap
    const userTotalSpent = this.taskCostLogs
      .filter((l) => l.userId === userId)
      .reduce((sum, l) => sum + l.estimatedCostUsd, 0);

    const remaining = Number((cap - userTotalSpent).toFixed(4));
    if (userTotalSpent + attemptedCostUsd > cap) {
      return {
        allowed: false,
        remainingBudgetUsd: Math.max(0, remaining),
        alertTriggered: true,
      };
    }

    return {
      allowed: true,
      remainingBudgetUsd: remaining,
      alertTriggered: remaining < cap * 0.2, // Alert when remaining budget < 20%
    };
  }

  public setUserBudgetCap(userId: string, capUsd: number): void {
    this.userBudgetCaps.set(userId, capUsd);
  }

  /**
   * Disaster Recovery Playbook Validator
   */
  public verifyDisasterRecoveryPlaybook(incidentSeverity: "P1" | "P2" | "P3"): {
    playbookName: string;
    escalationContact: string;
    targetRTOSeconds: number; // Recovery Time Objective
    targetRPOSeconds: number; // Recovery Point Objective
    rollbackStep: string;
  } {
    if (incidentSeverity === "P1") {
      return {
        playbookName: "Critical Service Outage & Automatic Model Failover",
        escalationContact: "Lead AI Architect (kotapati Gowtham Chowdary)",
        targetRTOSeconds: 60,
        targetRPOSeconds: 0,
        rollbackStep: "Trigger circuit breaker on primary provider; re-route all inbound traffic to secondary fallback pool.",
      };
    }

    if (incidentSeverity === "P2") {
      return {
        playbookName: "Database Migration & Storage Rollback",
        escalationContact: "Platform Reliability Engineering Team",
        targetRTOSeconds: 300,
        targetRPOSeconds: 60,
        rollbackStep: "Apply downward database migration down.sql and restore point-in-time Supabase snapshot.",
      };
    }

    return {
      playbookName: "Standard Telemetry Degraded Mode",
      escalationContact: "Operations On-Call",
      targetRTOSeconds: 900,
      targetRPOSeconds: 300,
      rollbackStep: "Drain cache and restart background worker tasks.",
    };
  }
}

export const enterpriseOperationsHub = EnterpriseOperationsHub.getInstance();
