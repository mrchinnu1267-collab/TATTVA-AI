/**
 * TATTVA AI - Human-in-the-Loop Approval Gate (Phase 44)
 * Manages human approval workflows for sensitive, irreversible, or high-risk operations.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { HumanApprovalRequest, GovernanceRiskTier, ApprovalStatus } from "./types";
import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export class ApprovalGate {
  private static instance: ApprovalGate;
  private approvals: Map<string, HumanApprovalRequest> = new Map();
  private storageDir: string;
  private storageFile: string;

  private constructor() {
    this.storageDir = path.join(process.cwd(), ".tattva_governance");
    this.storageFile = path.join(this.storageDir, "approvals.json");
    this.loadState().catch(() => {});
  }

  public static getInstance(): ApprovalGate {
    if (!ApprovalGate.instance) {
      ApprovalGate.instance = new ApprovalGate();
    }
    return ApprovalGate.instance;
  }

  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFile, "utf-8");
      const list: HumanApprovalRequest[] = JSON.parse(data);
      for (const item of list) {
        this.approvals.set(item.id, item);
      }
    } catch {
      // Storage file does not exist yet; will be created on save
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      const list = Array.from(this.approvals.values());
      await fs.writeFile(this.storageFile, JSON.stringify(list, null, 2), "utf-8");
    } catch {
      // Graceful fallback to memory
    }
  }

  /**
   * Evaluates whether an operation strictly requires human approval
   */
  public isApprovalRequired(operationType: string, riskTier: GovernanceRiskTier): boolean {
    if (riskTier === "critical" || riskTier === "high") return true;

    const SENSITIVE_OPERATIONS = [
      "database_purge",
      "credential_rotation",
      "execute_arbitrary_shell",
      "delete_production_workspace",
      "modify_security_policies",
      "financial_transaction",
      "export_full_database",
    ];

    return SENSITIVE_OPERATIONS.includes(operationType.toLowerCase());
  }

  /**
   * Creates a new pending human approval request
   */
  public async requestApproval(params: {
    requestedBy: string;
    operationType: string;
    toolName?: string;
    riskTier?: GovernanceRiskTier;
    reason: string;
    contextPayload?: Record<string, any>;
  }): Promise<HumanApprovalRequest> {
    const id = `req_${crypto.randomBytes(6).toString("hex")}`;
    const request: HumanApprovalRequest = {
      id,
      createdAt: Date.now(),
      requestedBy: params.requestedBy || "agent-runtime",
      operationType: params.operationType,
      toolName: params.toolName,
      riskTier: params.riskTier || "high",
      reason: params.reason,
      contextPayload: params.contextPayload || {},
      status: "pending",
    };

    this.approvals.set(id, request);
    await this.saveState();
    return request;
  }

  /**
   * Lists all pending approval requests
   */
  public listPending(): HumanApprovalRequest[] {
    return Array.from(this.approvals.values()).filter((r) => r.status === "pending");
  }

  /**
   * Lists all approval requests
   */
  public listAll(): HumanApprovalRequest[] {
    return Array.from(this.approvals.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Resolves a pending approval request (approve or reject)
   */
  public async resolve(
    id: string,
    decision: "approved" | "rejected",
    resolvedBy: string,
    resolutionNotes?: string
  ): Promise<HumanApprovalRequest | null> {
    const req = this.approvals.get(id);
    if (!req) return null;

    req.status = decision;
    req.resolvedAt = Date.now();
    req.resolvedBy = resolvedBy;
    req.resolutionNotes = resolutionNotes || `Operation ${decision} by ${resolvedBy}`;

    this.approvals.set(id, req);
    await this.saveState();
    return req;
  }
}
