/**
 * TATTVA AI - Tenant Quota & Usage Enforcement Engine (Phase 45)
 * Enforces rate limits, daily request ceilings, monthly token quotas, and storage bounds.
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

    // Reset daily requests if new day
    if (usage.lastRequestDate !== todayKey) {
      usage.lastRequestDate = todayKey;
      usage.requestsToday = 0;
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
    const storageLimitBytes = plan.storageLimitBytes;

    const remainingTokens = Math.max(0, tokenLimit - usage.tokensUsed);
    const remainingRequests = Math.max(0, requestLimit - usage.requestsToday);
    const remainingStorageBytes = Math.max(0, storageLimitBytes - usage.storageBytesUsed);

    // Rate / quota checks
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
        storageBytesUsed: usage.storageBytesUsed,
        storageLimitBytes,
        remainingStorageBytes,
        reason: `Daily request limit reached (${usage.requestsToday}/${requestLimit}). Upgrade plan to increase quota.`,
      };
    }

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
        storageBytesUsed: usage.storageBytesUsed,
        storageLimitBytes,
        remainingStorageBytes,
        reason: `Monthly token allocation exhausted (${usage.tokensUsed.toLocaleString()}/${tokenLimit.toLocaleString()}).`,
      };
    }

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
      storageBytesUsed: usage.storageBytesUsed,
      storageLimitBytes,
      remainingStorageBytes,
    };
  }

  /**
   * Records incremental usage consumption
   */
  public async recordUsage(
    userId: string,
    tokens: number = 0,
    storageDeltaBytes: number = 0
  ): Promise<QuotaUsage> {
    const usage = this.getOrCreateUsage(userId);
    usage.tokensUsed += Math.max(0, tokens);
    usage.requestsToday += 1;
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
