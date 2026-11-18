/**
 * TATTVA AI - Data Governance & Lifecycle Management Engine (Phase 47)
 * Unified Facade for Retention Policies, GDPR/CCPA Data Export, Account Purging, and Access Auditing.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { RetentionManager } from "./retention-manager";
import { ExportManager } from "./export-manager";
import { PurgeManager } from "./purge-manager";
import { AccessAuditor } from "./access-auditor";
import {
  DataRetentionPolicy,
  DataExportArchive,
  AccountPurgeRequest,
  AccessAuditLog,
  GovernanceMetrics,
  ExportFormat,
  GovernanceAction,
} from "./types";

export class DataGovernanceEngine {
  private static instance: DataGovernanceEngine;

  private retentionManager: RetentionManager;
  private exportManager: ExportManager;
  private purgeManager: PurgeManager;
  private accessAuditor: AccessAuditor;

  private constructor() {
    this.retentionManager = RetentionManager.getInstance();
    this.exportManager = ExportManager.getInstance();
    this.purgeManager = PurgeManager.getInstance();
    this.accessAuditor = AccessAuditor.getInstance();
  }

  public static getInstance(): DataGovernanceEngine {
    if (!DataGovernanceEngine.instance) {
      DataGovernanceEngine.instance = new DataGovernanceEngine();
    }
    return DataGovernanceEngine.instance;
  }

  /**
   * Data Retention Policies
   */
  public getRetentionPolicy(workspaceId: string = "default"): DataRetentionPolicy {
    return this.retentionManager.getPolicy(workspaceId);
  }

  public updateRetentionPolicy(
    workspaceId: string = "default",
    updates: Partial<Omit<DataRetentionPolicy, "workspaceId" | "updatedAt">>,
    actorId: string = "admin"
  ): DataRetentionPolicy {
    const updated = this.retentionManager.updatePolicy(workspaceId, updates);
    this.accessAuditor.logEvent({
      actorId,
      action: "policy_update",
      targetType: "workspace",
      targetId: workspaceId,
      details: updates,
    });
    return updated;
  }

  public evaluateExpiredRecords<T extends { id: string; type: string; createdAt: number }>(
    records: T[],
    workspaceId: string = "default"
  ) {
    return this.retentionManager.evaluateExpiredRecords(records, workspaceId);
  }

  /**
   * GDPR / CCPA Data Export
   */
  public async requestExport(params: {
    userId: string;
    userEmail?: string;
    format?: ExportFormat;
    ipAddress?: string;
  }): Promise<DataExportArchive> {
    const archive = await this.exportManager.generateUserExport(params);
    this.accessAuditor.logEvent({
      actorId: params.userId,
      action: "export",
      targetType: "user",
      targetId: params.userId,
      ipAddress: params.ipAddress,
      details: { exportId: archive.exportId, format: archive.format },
    });
    return archive;
  }

  public getExport(exportId: string, requestingUserId?: string): DataExportArchive | null {
    return this.exportManager.getExport(exportId, requestingUserId);
  }

  public listUserExports(userId: string): DataExportArchive[] {
    return this.exportManager.listUserExports(userId);
  }

  /**
   * "Right to be Forgotten" Account Purge
   */
  public async requestPurge(params: {
    userId: string;
    userEmail: string;
    ipAddress?: string;
  }): Promise<AccountPurgeRequest> {
    const request = await this.purgeManager.requestPurge(params);
    this.accessAuditor.logEvent({
      actorId: params.userId,
      action: "purge",
      targetType: "user",
      targetId: params.userId,
      ipAddress: params.ipAddress,
      details: { requestId: request.requestId, status: request.status },
    });
    return request;
  }

  public async confirmPurge(params: {
    requestId: string;
    confirmationCode: string;
    requestingUserId: string;
    ipAddress?: string;
  }): Promise<{ success: boolean; request: AccountPurgeRequest | null; error?: string }> {
    const result = await this.purgeManager.confirmPurge(params);
    if (result.success && result.request) {
      this.accessAuditor.logEvent({
        actorId: params.requestingUserId,
        action: "purge",
        targetType: "user",
        targetId: result.request.userId,
        ipAddress: params.ipAddress,
        status: "success",
        details: { requestId: params.requestId, status: "purged" },
      });
    }
    return result;
  }

  public getPurgeRequest(requestId: string, requestingUserId?: string): AccountPurgeRequest | null {
    return this.purgeManager.getPurgeRequest(requestId, requestingUserId);
  }

  /**
   * Access Auditing & Metrics
   */
  public listAuditLogs(filters?: {
    actorId?: string;
    action?: GovernanceAction;
    limit?: number;
  }): AccessAuditLog[] {
    return this.accessAuditor.listLogs(filters);
  }

  public getMetrics(): GovernanceMetrics {
    return this.accessAuditor.getMetrics();
  }
}

// Explicit named exports
export { RetentionManager } from "./retention-manager";
export { ExportManager } from "./export-manager";
export { PurgeManager } from "./purge-manager";
export { AccessAuditor } from "./access-auditor";
export * from "./types";
