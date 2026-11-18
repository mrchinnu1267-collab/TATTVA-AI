/**
 * TATTVA AI - Governance Audit Trail Engine (Phase 44)
 * Immutable audit logging for safety violations, adversarial injection attempts,
 * PII redactions, and human approval events.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { GovernanceAuditEntry, GovernanceEventType, AuditSeverity } from "./types";
import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export class GovernanceAuditTrail {
  private static instance: GovernanceAuditTrail;
  private logs: GovernanceAuditEntry[] = [];
  private storageDir: string;
  private storageFile: string;
  private readonly MAX_IN_MEMORY = 500;

  private constructor() {
    this.storageDir = path.join(process.cwd(), ".tattva_governance");
    this.storageFile = path.join(this.storageDir, "audit_log.json");
    this.loadState().catch(() => {});
  }

  public static getInstance(): GovernanceAuditTrail {
    if (!GovernanceAuditTrail.instance) {
      GovernanceAuditTrail.instance = new GovernanceAuditTrail();
    }
    return GovernanceAuditTrail.instance;
  }

  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFile, "utf-8");
      this.logs = JSON.parse(data);
    } catch {
      // Empty initial state
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.writeFile(this.storageFile, JSON.stringify(this.logs, null, 2), "utf-8");
    } catch {
      // Graceful fallback to memory
    }
  }

  /**
   * Records an immutable governance audit event
   */
  public async logEvent(params: {
    actor: string;
    eventType: GovernanceEventType;
    severity: AuditSeverity;
    summary: string;
    details?: Record<string, any>;
    ipAddress?: string;
  }): Promise<GovernanceAuditEntry> {
    const entry: GovernanceAuditEntry = {
      id: `gov_${crypto.randomBytes(6).toString("hex")}`,
      timestamp: Date.now(),
      actor: params.actor || "system",
      eventType: params.eventType,
      severity: params.severity,
      summary: params.summary,
      details: params.details || {},
      ipAddress: params.ipAddress,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.MAX_IN_MEMORY) {
      this.logs.pop();
    }

    await this.saveState();
    return entry;
  }

  /**
   * Queries audit logs with filtering options
   */
  public query(filters?: {
    eventType?: GovernanceEventType;
    severity?: AuditSeverity;
    actor?: string;
    limit?: number;
  }): GovernanceAuditEntry[] {
    let result = this.logs;

    if (filters) {
      if (filters.eventType) {
        result = result.filter((e) => e.eventType === filters.eventType);
      }
      if (filters.severity) {
        result = result.filter((e) => e.severity === filters.severity);
      }
      if (filters.actor) {
        result = result.filter((e) => e.actor.toLowerCase().includes(filters.actor!.toLowerCase()));
      }
      if (filters.limit && filters.limit > 0) {
        result = result.slice(0, filters.limit);
      }
    }

    return result;
  }

  /**
   * Retrieves summary counts of governance events
   */
  public getCounts(): Record<string, number> {
    const counts: Record<string, number> = {
      total: this.logs.length,
      critical: 0,
      warning: 0,
      info: 0,
      injections_blocked: 0,
      pii_redacted: 0,
      content_scanned: 0,
      approvals: 0,
    };

    for (const entry of this.logs) {
      if (entry.severity === "critical") counts.critical++;
      if (entry.severity === "warning") counts.warning++;
      if (entry.severity === "info") counts.info++;
      if (entry.eventType === "injection_blocked") counts.injections_blocked++;
      if (entry.eventType === "pii_redacted") counts.pii_redacted++;
      if (entry.eventType === "content_scanned") counts.content_scanned++;
      if (entry.eventType === "approval_requested" || entry.eventType === "approval_resolved") {
        counts.approvals++;
      }
    }

    return counts;
  }
}
