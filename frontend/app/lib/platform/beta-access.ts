/**
 * TATTVA AI - Beta Access & Whitelist Gate (Phase 23)
 * Controls rollout access via invitation codes, email whitelists, and tier allocations
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface BetaUser {
  userId: string;
  email: string;
  inviteCode: string;
  tier: "standard_beta" | "vip_tester" | "internal_team";
  dailyRequestLimit: number;
  joinedAt: number;
  feedbackSubmittedCount: number;
}

export class BetaAccessManager {
  private static instance: BetaAccessManager;
  private whitelistedEmails: Set<string> = new Set([
    "lead.architect@tattva.ai",
    "qa.tester@tattva.ai",
    "beta.pioneer@tattva.ai",
  ]);

  private validInviteCodes: Map<string, BetaUser["tier"]> = new Map([
    ["TATTVA-BETA-2026", "standard_beta"],
    ["TATTVA-VIP-FOUNDER", "vip_tester"],
    ["TATTVA-INTERNAL-DEV", "internal_team"],
  ]);

  private activeBetaUsers: Map<string, BetaUser> = new Map();

  public static getInstance(): BetaAccessManager {
    if (!BetaAccessManager.instance) {
      BetaAccessManager.instance = new BetaAccessManager();
    }
    return BetaAccessManager.instance;
  }

  public validateInviteCode(code: string): { valid: boolean; tier?: BetaUser["tier"] } {
    const tier = this.validInviteCodes.get(code.trim().toUpperCase());
    return {
      valid: Boolean(tier),
      tier,
    };
  }

  public registerBetaUser(params: {
    userId: string;
    email: string;
    inviteCode: string;
  }): { success: boolean; user?: BetaUser; error?: string } {
    const normEmail = params.email.toLowerCase().trim();
    const inviteCheck = this.validateInviteCode(params.inviteCode);

    if (!inviteCheck.valid && !this.whitelistedEmails.has(normEmail)) {
      return {
        success: false,
        error: "Invalid invitation code or unlisted email. Beta access is currently restricted.",
      };
    }

    const tier = inviteCheck.tier || "standard_beta";
    const limits = {
      standard_beta: 100,
      vip_tester: 500,
      internal_team: 2000,
    };

    const betaUser: BetaUser = {
      userId: params.userId,
      email: normEmail,
      inviteCode: params.inviteCode,
      tier,
      dailyRequestLimit: limits[tier],
      joinedAt: Date.now(),
      feedbackSubmittedCount: 0,
    };

    this.activeBetaUsers.set(params.userId, betaUser);
    return { success: true, user: betaUser };
  }

  public isBetaAuthorized(userId: string): boolean {
    return this.activeBetaUsers.has(userId);
  }

  public getBetaUser(userId: string): BetaUser | undefined {
    return this.activeBetaUsers.get(userId);
  }
}

export const betaAccessManager = BetaAccessManager.getInstance();
