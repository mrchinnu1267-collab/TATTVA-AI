/**
 * TATTVA AI - Governance Access Auditor (Phase 47)
 * Logs all sensitive data governance, export, and account deletion actions with IP, actor, and timestamp.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { AccessAuditLog, GovernanceAction, GovernanceMetrics } from "./types";
import crypto from "crypto";

export class AccessAuditor {
  private static instance: AccessAuditor;
  private logs: AccessAuditLog[] = [];
  private maxLogs: number = 1000;

  private constructor() {
    this.seedInitialAuditLog();
  }

  public static getInstance(): AccessAuditor {
    if (!AccessAuditor.instance) {
      AccessAuditor.instance = new AccessAuditor();
    }
    return AccessAuditor.instance;
  }

  private seedInitialAuditLog(): void {
    this.logs.push({
      id: `aud_${crypto.randomBytes(6).toString("hex")}`,
      timestamp: Date.now() - 3600000 * 24,
      actorId: "system",
      action: "policy_update",
      targetType: "workspace",
      targetId: "default",
      ipAddress: "127.0.0.1",
      userAgent: "TATTVA-System-Daemon/2.47",
      status: "success",
      details: { info: "Default 90-day retention initialized" },
    });
  }

  public logEvent(params: {
    actorId: string;
    action: GovernanceAction;
    targetType: "user" | "chat" | "document" | "workspace" | "billing" | "ticket";
    targetId: string;
    ipAddress?: string;
    userAgent?: string;
    status?: "success" | "denied" | "error";
    details?: Record<string, any>;
  }): AccessAuditLog {
    const entry: AccessAuditLog = {
      id: `aud_${crypto.randomBytes(6).toString("hex")}`,
      timestamp: Date.now(),
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      ipAddress: params.ipAddress || "127.0.0.1",
      userAgent: params.userAgent || "Internal/Agent",
      status: params.status || "success",
      details: params.details,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    return entry;
  }

  public listLogs(filters?: {
    actorId?: string;
    action?: GovernanceAction;
    limit?: number;
  }): AccessAuditLog[] {
    let result = this.logs;
    if (filters?.actorId) {
      result = result.filter((l) => l.actorId === filters.actorId);
    }
    if (filters?.action) {
      result = result.filter((l) => l.action === filters.action);
    }
    if (filters?.limit) {
      result = result.slice(0, filters.limit);
    }
    return result;
  }

  public getMetrics(): GovernanceMetrics {
    const exportsCount = this.logs.filter((l) => l.action === "export").length;
    const purgeCount = this.logs.filter((l) => l.action === "purge").length;

    return {
      totalExportsGenerated: exportsCount,
      totalPurgeRequests: purgeCount,
      activeRetentionPolicies: 1,
      totalAuditedEvents: this.logs.length,
      lastAuditedTimestamp: this.logs[0]?.timestamp || Date.now(),
    };
  }
}
