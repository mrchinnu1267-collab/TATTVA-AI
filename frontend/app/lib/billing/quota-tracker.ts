/**
 * TATTVA AI - Tenant Quota & Usage Enforcement Engine
 * Enforces rate limits, daily request ceilings, monthly token quotas, tool usage limits, and storage bounds.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { QuotaUsage, QuotaCheckResult, SubscriptionTier } from "./types";
import { PlanManager } from "./plan-manager";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export class QuotaTracker {
  private static instance: QuotaTracker;
  private usageMap: Map<string, QuotaUsage> = new Map();
  private planManager: PlanManager;
  private storageDir: string;
  private storageFile: string;

  private constructor() {
    this.planManager = PlanManager.getInstance();
    this.storageDir = path.join(process.cwd(), ".tattva_billing");
    this.storageFile = path.join(this.storageDir, "usage.json");
    this.loadState().catch(() => {});
  }

  public static getInstance(): QuotaTracker {
    if (!QuotaTracker.instance) {
      QuotaTracker.instance = new QuotaTracker();
    }
    return QuotaTracker.instance;
  }

  private getMonthKey(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  private getTodayKey(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
      d.getUTCDate()
    ).padStart(2, "0")}`;
  }

  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFile, "utf-8");
      const list: QuotaUsage[] = JSON.parse(data);
      for (const item of list) {
        this.usageMap.set(item.userId, item);
      }
    } catch {
      // Memory state fallback
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      const list = Array.from(this.usageMap.values());
      await fs.writeFile(this.storageFile, JSON.stringify(list, null, 2), "utf-8");
    } catch {
      // Memory state fallback
    }
  }

  private getOrCreateUsage(userId: string): QuotaUsage {
    const monthKey = this.getMonthKey();
    const todayKey = this.getTodayKey();

    let usage = this.usageMap.get(userId);

    if (!usage) {
      usage = {
        userId,
        monthKey,
        tokensUsed: 0,
        requestsToday: 0,
        toolsUsedToday: 0,
        lastRequestDate: todayKey,
        storageBytesUsed: 0,
        lastUpdated: Date.now(),
      };
      this.usageMap.set(userId, usage);
      return usage;
    }

    // Reset monthly token counter if new month
    if (usage.monthKey !== monthKey) {
      usage.monthKey = monthKey;
      usage.tokensUsed = 0;
    }

    // Reset daily requests and tool counts if new day
    if (usage.lastRequestDate !== todayKey) {
      usage.lastRequestDate = todayKey;
      usage.requestsToday = 0;
      usage.toolsUsedToday = 0;
    }

    return usage;
  }

  /**
   * Checks whether the user can execute a request with given token/storage requirements
   */
  public checkQuota(
    userId: string,
    tier: SubscriptionTier = "free",
    additionalTokens: number = 0,
    additionalStorageBytes: number = 0
  ): QuotaCheckResult {
    const plan = this.planManager.getPlan(tier);
    const usage = this.getOrCreateUsage(userId);

    const tokenLimit = plan.tokenLimitMonthly;
    const requestLimit = plan.requestLimitDaily;
    const toolLimit = plan.toolLimitDaily || 25;
    const storageLimitBytes = plan.storageLimitBytes;

    const remainingTokens = Math.max(0, tokenLimit - usage.tokensUsed);
    const remainingRequests = Math.max(0, requestLimit - usage.requestsToday);
    const remainingTools = Math.max(0, toolLimit - (usage.toolsUsedToday || 0));
    const remainingStorageBytes = Math.max(0, storageLimitBytes - usage.storageBytesUsed);

    // Daily message request ceiling check
    if (usage.requestsToday + 1 > requestLimit) {
      return {
        allowed: false,
        tier,
        tokensUsed: usage.tokensUsed,
        tokenLimit,
        remainingTokens,
        requestsToday: usage.requestsToday,
        requestLimit,
        remainingRequests: 0,
        toolsUsedToday: usage.toolsUsedToday || 0,
        toolLimit,
        remainingTools,
        storageBytesUsed: usage.storageBytesUsed,
        storageLimitBytes,
        remainingStorageBytes,
        reason: `Daily message request limit reached (${usage.requestsToday}/${requestLimit}). Subscribe to TATTVA AI Go (₹40/mo) for higher limits.`,
      };
    }

    // Monthly token limit check
    if (usage.tokensUsed + additionalTokens > tokenLimit) {
      return {
        allowed: false,
        tier,
        tokensUsed: usage.tokensUsed,
        tokenLimit,
        remainingTokens: 0,
        requestsToday: usage.requestsToday,
        requestLimit,
        remainingRequests,
        toolsUsedToday: usage.toolsUsedToday || 0,
        toolLimit,
        remainingTools,
        storageBytesUsed: usage.storageBytesUsed,
        storageLimitBytes,
        remainingStorageBytes,
        reason: `Monthly token allocation exhausted (${usage.tokensUsed.toLocaleString()}/${tokenLimit.toLocaleString()}). Upgrade to TATTVA AI Go for 1.5M monthly tokens.`,
      };
    }

    // Storage capacity check
    if (usage.storageBytesUsed + additionalStorageBytes > storageLimitBytes) {
      return {
        allowed: false,
        tier,
        tokensUsed: usage.tokensUsed,
        tokenLimit,
        remainingTokens,
        requestsToday: usage.requestsToday,
        requestLimit,
        remainingRequests,
        toolsUsedToday: usage.toolsUsedToday || 0,
        toolLimit,
        remainingTools,
        storageBytesUsed: usage.storageBytesUsed,
        storageLimitBytes,
        remainingStorageBytes: 0,
        reason: `Storage capacity reached (${Math.round(usage.storageBytesUsed / 1024 / 1024)}MB/${Math.round(storageLimitBytes / 1024 / 1024)}MB).`,
      };
    }

    return {
      allowed: true,
      tier,
      tokensUsed: usage.tokensUsed,
      tokenLimit,
      remainingTokens,
      requestsToday: usage.requestsToday,
      requestLimit,
      remainingRequests,
      toolsUsedToday: usage.toolsUsedToday || 0,
      toolLimit,
      remainingTools,
      storageBytesUsed: usage.storageBytesUsed,
      storageLimitBytes,
      remainingStorageBytes,
    };
  }

  /**
   * Checks tool usage quota specifically
   */
  public checkToolQuota(userId: string, tier: SubscriptionTier = "free"): { allowed: boolean; reason?: string } {
    const plan = this.planManager.getPlan(tier);
    const usage = this.getOrCreateUsage(userId);
    const toolLimit = plan.toolLimitDaily || (tier === "go" ? 150 : 25);

    if ((usage.toolsUsedToday || 0) >= toolLimit) {
      return {
        allowed: false,
        reason: `Daily tool execution limit reached (${usage.toolsUsedToday}/${toolLimit}). ${tier === "free" ? "Upgrade to TATTVA AI Go (₹40/mo) for 150 daily tool calls." : "Tool quota resets at midnight UTC."}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Records incremental usage consumption
   */
  public async recordUsage(
    userId: string,
    tokens: number = 0,
    storageDeltaBytes: number = 0,
    toolsUsed: number = 0
  ): Promise<QuotaUsage> {
    const usage = this.getOrCreateUsage(userId);
    usage.tokensUsed += Math.max(0, tokens);
    usage.requestsToday += 1;
    usage.toolsUsedToday = (usage.toolsUsedToday || 0) + Math.max(0, toolsUsed);
    usage.storageBytesUsed = Math.max(0, usage.storageBytesUsed + storageDeltaBytes);
    usage.lastUpdated = Date.now();

    await this.saveState();
    return usage;
  }

  /**
   * Retrieves user usage snapshot with plan metrics
   */
  public getUserUsage(userId: string, tier: SubscriptionTier = "free"): QuotaCheckResult {
    return this.checkQuota(userId, tier, 0, 0);
  }

  /**
   * Retrieves aggregate telemetry metrics across all tenants
   */
  public getAggregateMetrics(): { totalTokens: number; totalStorage: number; activeUsers: number } {
    let totalTokens = 0;
    let totalStorage = 0;
    for (const u of this.usageMap.values()) {
      totalTokens += u.tokensUsed;
      totalStorage += u.storageBytesUsed;
    }
    return {
      totalTokens,
      totalStorage,
      activeUsers: this.usageMap.size,
    };
  }
}
