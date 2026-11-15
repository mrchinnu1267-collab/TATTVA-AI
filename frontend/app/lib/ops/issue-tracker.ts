/**
 * TATTVA AI - Bug & Issue Management Engine
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { IssueRecord, IssueSeverity, IssueStatus } from "./types";

export class IssueTracker {
  private static instance: IssueTracker;
  private issues: Map<string, IssueRecord> = new Map();

  public static getInstance(): IssueTracker {
    if (!IssueTracker.instance) {
      IssueTracker.instance = new IssueTracker();
    }
    return IssueTracker.instance;
  }

  /**
   * Registers a structured problem ticket
   */
  public reportIssue(params: {
    title: string;
    severity: IssueSeverity;
    affectedFeature: string;
    isSecurityOrDataLoss: boolean;
    problemDescription: string;
    reproductionSteps: string[];
    assignedTo?: string;
  }): { success: boolean; issue?: IssueRecord; error?: string } {
    if (!params.title || !params.problemDescription || !params.affectedFeature) {
      return { success: false, error: "Missing required title, description, or feature name" };
    }

    if (!params.reproductionSteps || params.reproductionSteps.length === 0) {
      return { success: false, error: "Reproduction steps are strictly required for engineering intake" };
    }

    // Force critical severity if security or data loss is identified
    const effectiveSeverity = params.isSecurityOrDataLoss ? "critical" : params.severity;

    const id = `ISSUE-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const record: IssueRecord = {
      id,
      title: params.title,
      severity: effectiveSeverity,
      status: "open",
      affectedFeature: params.affectedFeature,
      isSecurityOrDataLoss: params.isSecurityOrDataLoss,
      problemDescription: params.problemDescription,
      reproductionSteps: params.reproductionSteps,
      assignedTo: params.assignedTo || "unassigned",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.issues.set(id, record);
    return { success: true, issue: record };
  }

  /**
   * Updates an issue with root cause analysis and proposed remediation
   */
  public updateRootCause(id: string, rootCause: string, proposedSolution: string): boolean {
    const record = this.issues.get(id);
    if (!record) return false;

    record.rootCause = rootCause;
    record.proposedSolution = proposedSolution;
    record.status = "fix_in_progress";
    record.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Records test results and transitions issue to resolved
   * Strictly enforces that test verification must pass before resolution
   */
  public resolveIssue(id: string, testResults: { suite: string; passed: boolean }): {
    success: boolean;
    error?: string;
  } {
    const record = this.issues.get(id);
    if (!record) {
      return { success: false, error: "Issue not found" };
    }

    if (!testResults.passed) {
      return { success: false, error: "Cannot resolve issue: Verification test suite failed" };
    }

    if (!record.rootCause || !record.proposedSolution) {
      return { success: false, error: "Cannot resolve issue without documented root cause and solution" };
    }

    record.testResults = {
      ...testResults,
      timestamp: new Date().toISOString(),
    };
    record.status = "resolved";
    record.resolutionStatus = `Verified by automated test suite: ${testResults.suite}`;
    record.updatedAt = new Date().toISOString();

    return { success: true };
  }

  public getIssue(id: string): IssueRecord | undefined {
    return this.issues.get(id);
  }

  public listIssues(filter?: { severity?: IssueSeverity; status?: IssueStatus }): IssueRecord[] {
    let list = Array.from(this.issues.values());
    if (filter?.severity) {
      list = list.filter((i) => i.severity === filter.severity);
    }
    if (filter?.status) {
      list = list.filter((i) => i.status === filter.status);
    }

    // Always sort security and critical issues first
    return list.sort((a, b) => {
      if (a.isSecurityOrDataLoss && !b.isSecurityOrDataLoss) return -1;
      if (!a.isSecurityOrDataLoss && b.isSecurityOrDataLoss) return 1;
      const order: Record<IssueSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    });
  }

  public clear(): void {
    this.issues.clear();
  }
}

export const issueTracker = IssueTracker.getInstance();
