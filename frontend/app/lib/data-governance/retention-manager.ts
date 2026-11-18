/**
 * TATTVA AI - Data Retention Policy Manager (Phase 47)
 * Configures retention windows per tenant and identifies expired records for safe purging.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { DataRetentionPolicy } from "./types";

export class RetentionManager {
  private static instance: RetentionManager;
  private policies: Map<string, DataRetentionPolicy> = new Map();

  private defaultPolicy: DataRetentionPolicy = {
    workspaceId: "default",
    chatRetentionDays: 90,
    researchRetentionDays: 180,
    documentRetentionDays: 365,
    auditLogRetentionDays: 730,
    codeArtifactRetentionDays: 180,
    autoPurgeEnabled: true,
    updatedAt: Date.now(),
  };

  private constructor() {
    this.policies.set("default", this.defaultPolicy);
  }

  public static getInstance(): RetentionManager {
    if (!RetentionManager.instance) {
      RetentionManager.instance = new RetentionManager();
    }
    return RetentionManager.instance;
  }

  public getPolicy(workspaceId: string = "default"): DataRetentionPolicy {
    const existing = this.policies.get(workspaceId);
    if (existing) return existing;
    const cloned = { ...this.defaultPolicy, workspaceId, updatedAt: Date.now() };
    this.policies.set(workspaceId, cloned);
    return cloned;
  }

  public updatePolicy(
    workspaceId: string = "default",
    updates: Partial<Omit<DataRetentionPolicy, "workspaceId" | "updatedAt">>
  ): DataRetentionPolicy {
    const current = this.getPolicy(workspaceId);
    const updated: DataRetentionPolicy = {
      ...current,
      ...updates,
      workspaceId,
      updatedAt: Date.now(),
    };
    this.policies.set(workspaceId, updated);
    return updated;
  }

  /**
   * Evaluates a collection of timestamped records against active retention windows.
   * Returns records that exceed the policy expiration threshold.
   */
  public evaluateExpiredRecords<T extends { id: string; type: string; createdAt: number }>(
    records: T[],
    workspaceId: string = "default"
  ): { expired: T[]; retained: T[]; retentionThresholdMs: Record<string, number> } {
    const policy = this.getPolicy(workspaceId);
    const now = Date.now();

    const dayMs = 24 * 60 * 60 * 1000;
    const thresholds: Record<string, number> = {
      chat: now - policy.chatRetentionDays * dayMs,
      research: now - policy.researchRetentionDays * dayMs,
      document: now - policy.documentRetentionDays * dayMs,
      codeArtifact: now - policy.codeArtifactRetentionDays * dayMs,
      auditLog: now - policy.auditLogRetentionDays * dayMs,
    };

    const expired: T[] = [];
    const retained: T[] = [];

    for (const rec of records) {
      const cutoff = thresholds[rec.type] || thresholds.chat;
      if (rec.createdAt < cutoff) {
        expired.push(rec);
      } else {
        retained.push(rec);
      }
    }

    return { expired, retained, retentionThresholdMs: thresholds };
  }

  public listAllPolicies(): DataRetentionPolicy[] {
    return Array.from(this.policies.values());
  }
}
