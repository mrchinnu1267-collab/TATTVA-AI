/**
 * TATTVA AI - Beta Bug & Feedback Management Engine (Phase 29)
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import {
  BetaFeedbackRecord,
  BetaFeedbackCategory,
  BetaBugSeverity,
  BetaBugStatus,
  BetaClientPlatform,
} from "./types";

export class BetaFeedbackAndBugManager {
  private static instance: BetaFeedbackAndBugManager;
  private records: Map<string, BetaFeedbackRecord> = new Map();

  public static getInstance(): BetaFeedbackAndBugManager {
    if (!BetaFeedbackAndBugManager.instance) {
      BetaFeedbackAndBugManager.instance = new BetaFeedbackAndBugManager();
    }
    return BetaFeedbackAndBugManager.instance;
  }

  /**
   * Submits structured beta feedback or bug report with privacy guarantees
   */
  public submitReport(params: {
    testerId: string;
    category: BetaFeedbackCategory;
    description: string;
    appVersion: string;
    platform: BetaClientPlatform;
    severity?: BetaBugSeverity;
    includePrivateConversations?: boolean;
    includeRawFiles?: boolean;
  }): { success: boolean; record?: BetaFeedbackRecord; error?: string } {
    if (!params.description || params.description.trim().length < 5) {
      return { success: false, error: "Please provide a detailed description (minimum 5 characters)." };
    }

    // Strict privacy policy: reject inclusion of private chat conversations or raw files
    if (params.includePrivateConversations || params.includeRawFiles) {
      console.warn("[BETA PRIVACY GUARD] Stripped raw conversation or file attachments from feedback report");
    }

    // Default severity based on category
    let severity: BetaBugSeverity = params.severity || "Medium";
    if (params.category === "bug_report" && !params.severity) {
      severity = "High";
    }

    const id = `BETA-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const record: BetaFeedbackRecord = {
      id,
      category: params.category,
      description: params.description.trim(),
      appVersion: params.appVersion,
      platform: params.platform,
      severity,
      status: "New",
      submittedAt: new Date().toISOString(),
      testerId: params.testerId,
    };

    this.records.set(id, record);
    return { success: true, record };
  }

  /**
   * Admin updates bug triage status, notes, or resolution
   */
  public updateBugStatus(
    id: string,
    newStatus: BetaBugStatus,
    adminNotes?: string,
    resolution?: string
  ): boolean {
    const record = this.records.get(id);
    if (!record) return false;

    record.status = newStatus;
    if (adminNotes) record.adminNotes = adminNotes;
    if (resolution) record.resolution = resolution;
    return true;
  }

  public getRecord(id: string): BetaFeedbackRecord | undefined {
    return this.records.get(id);
  }

  public listRecords(filters?: {
    status?: BetaBugStatus;
    severity?: BetaBugSeverity;
    category?: BetaFeedbackCategory;
    platform?: BetaClientPlatform;
  }): BetaFeedbackRecord[] {
    let list = Array.from(this.records.values());

    if (filters?.status) list = list.filter((r) => r.status === filters.status);
    if (filters?.severity) list = list.filter((r) => r.severity === filters.severity);
    if (filters?.category) list = list.filter((r) => r.category === filters.category);
    if (filters?.platform) list = list.filter((r) => r.platform === filters.platform);

    // Sort by severity (Critical -> High -> Medium -> Low) then date descending
    const order: Record<BetaBugSeverity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return list.sort((a, b) => {
      if (order[a.severity] !== order[b.severity]) {
        return order[a.severity] - order[b.severity];
      }
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
  }

  public getSummaryCounts(): {
    total: number;
    byStatus: Record<BetaBugStatus, number>;
    bySeverity: Record<BetaBugSeverity, number>;
  } {
    const byStatus: Record<BetaBugStatus, number> = {
      New: 0,
      "Under Review": 0,
      Confirmed: 0,
      "In Progress": 0,
      Fixed: 0,
      Testing: 0,
      Closed: 0,
    };

    const bySeverity: Record<BetaBugSeverity, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
    };

    for (const record of this.records.values()) {
      byStatus[record.status] = (byStatus[record.status] || 0) + 1;
      bySeverity[record.severity] = (bySeverity[record.severity] || 0) + 1;
    }

    return {
      total: this.records.size,
      byStatus,
      bySeverity,
    };
  }

  public clear(): void {
    this.records.clear();
  }
}

export const betaFeedbackAndBugManager = BetaFeedbackAndBugManager.getInstance();
