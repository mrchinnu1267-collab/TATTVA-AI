/**
 * TATTVA AI - Beta Tester Access & Lifecycle Manager (Phase 29)
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { BetaTesterAccount, BetaTesterStatus, BetaTesterTier } from "./types";

export class BetaTesterManager {
  private static instance: BetaTesterManager;
  private testers: Map<string, BetaTesterAccount> = new Map();

  // Valid invite codes with configured duration (in days) and tiers
  private validInviteCodes: Map<string, { tier: BetaTesterTier; validityDays: number }> = new Map([
    ["TATTVA-BETA-2026", { tier: "standard_beta", validityDays: 30 }],
    ["TATTVA-VIP-FOUNDER", { tier: "vip_tester", validityDays: 60 }],
    ["TATTVA-INTERNAL-DEV", { tier: "internal_team", validityDays: 180 }],
  ]);

  private dailyLimits: Record<BetaTesterTier, number> = {
    standard_beta: 100,
    vip_tester: 500,
    internal_team: 2000,
  };

  public static getInstance(): BetaTesterManager {
    if (!BetaTesterManager.instance) {
      BetaTesterManager.instance = new BetaTesterManager();
    }
    return BetaTesterManager.instance;
  }

  /**
   * Validates invitation code and calculates expiration timestamp
   */
  public checkInviteCode(code: string): { valid: boolean; tier?: BetaTesterTier; expiresAt?: number } {
    const config = this.validInviteCodes.get(code.trim().toUpperCase());
    if (!config) return { valid: false };

    const expiresAt = Date.now() + config.validityDays * 24 * 60 * 60 * 1000;
    return {
      valid: true,
      tier: config.tier,
      expiresAt,
    };
  }

  /**
   * Registers a tester with invitation code
   */
  public registerTester(params: {
    userId: string;
    email: string;
    inviteCode: string;
    requiresApproval?: boolean;
  }): { success: boolean; account?: BetaTesterAccount; error?: string } {
    const inviteCheck = this.checkInviteCode(params.inviteCode);
    if (!inviteCheck.valid) {
      return { success: false, error: "Invalid invitation code. Access to TATTVA AI Beta is by invitation only." };
    }

    const tier = inviteCheck.tier!;
    const status: BetaTesterStatus = params.requiresApproval ? "pending_approval" : "active";
    const today = new Date().toISOString().split("T")[0];

    const account: BetaTesterAccount = {
      id: `tester_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`,
      userId: params.userId,
      email: params.email.toLowerCase().trim(),
      inviteCode: params.inviteCode,
      tier,
      status,
      dailyRequestLimit: this.dailyLimits[tier],
      requestsUsedToday: 0,
      lastRequestDate: today,
      expiresAt: inviteCheck.expiresAt!,
      createdAt: Date.now(),
    };

    this.testers.set(params.userId, account);
    return { success: true, account };
  }

  /**
   * Admin approves a pending tester
   */
  public approveTester(userId: string, adminId: string): boolean {
    const account = this.testers.get(userId);
    if (!account) return false;

    account.status = "active";
    account.approvedBy = adminId;
    return true;
  }

  /**
   * Admin revokes access for a tester
   */
  public revokeTester(userId: string): boolean {
    const account = this.testers.get(userId);
    if (!account) return false;

    account.status = "revoked";
    return true;
  }

  /**
   * Verifies if a user is currently authorized to access beta features
   */
  public isAuthorized(userId: string): { authorized: boolean; reason?: string } {
    const account = this.testers.get(userId);
    if (!account) {
      return { authorized: false, reason: "User is not registered for the beta program" };
    }

    if (account.status === "pending_approval") {
      return { authorized: false, reason: "Tester account is pending administrative approval" };
    }

    if (account.status === "revoked") {
      return { authorized: false, reason: "Tester access has been revoked by administration" };
    }

    if (Date.now() > account.expiresAt) {
      account.status = "expired";
      return { authorized: false, reason: "Beta invitation validity period has expired" };
    }

    return { authorized: true };
  }

  /**
   * Checks and enforces daily quota
   */
  public checkAndRecordUsage(userId: string): { allowed: boolean; remainingRequests: number; error?: string } {
    const auth = this.isAuthorized(userId);
    if (!auth.authorized) {
      return { allowed: false, remainingRequests: 0, error: auth.reason };
    }

    const account = this.testers.get(userId)!;
    const today = new Date().toISOString().split("T")[0];

    // Reset quota if new calendar day
    if (account.lastRequestDate !== today) {
      account.requestsUsedToday = 0;
      account.lastRequestDate = today;
    }

    if (account.requestsUsedToday >= account.dailyRequestLimit) {
      return {
        allowed: false,
        remainingRequests: 0,
        error: `Daily beta request quota reached (${account.dailyRequestLimit} requests/day). Resets at midnight UTC.`,
      };
    }

    account.requestsUsedToday++;
    const remaining = account.dailyRequestLimit - account.requestsUsedToday;
    return { allowed: true, remainingRequests: remaining };
  }

  public getTester(userId: string): BetaTesterAccount | undefined {
    return this.testers.get(userId);
  }

  public listTesters(statusFilter?: BetaTesterStatus): BetaTesterAccount[] {
    const all = Array.from(this.testers.values());
    if (statusFilter) {
      return all.filter((t) => t.status === statusFilter);
    }
    return all;
  }

  public clear(): void {
    this.testers.clear();
  }
}

export const betaTesterManager = BetaTesterManager.getInstance();
