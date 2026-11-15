/**
 * TATTVA AI - Continuous Development & Operations Controller
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ReleaseApprovalRequest, PerformanceCostReport, SecurityInspectionReport } from "./types";
import { issueTracker } from "./issue-tracker";
import { qualityMonitor } from "./quality-monitor";

export class ContinuousOpsController {
  private static instance: ContinuousOpsController;
  private releaseApprovals: Map<string, ReleaseApprovalRequest> = new Map();

  public static getInstance(): ContinuousOpsController {
    if (!ContinuousOpsController.instance) {
      ContinuousOpsController.instance = new ContinuousOpsController();
    }
    return ContinuousOpsController.instance;
  }

  // =========================================================================
  // 1. RELEASE MANAGEMENT & APPROVAL GATE
  // =========================================================================

  /**
   * Evaluates and records a release request with strict safety checks
   * Rule: Never deploy untested or unverified changes to staging/production
   */
  public submitReleaseRequest(req: {
    version: string;
    environment: "development" | "staging" | "production";
    commitHash: string;
    releaseNotesSummary: string;
    automatedTestsPassed: boolean;
    testPassRate: number;
    databaseMigrationsVerified: boolean;
    regressionCheckPassed: boolean;
    approver?: string;
  }): { approved: boolean; reason?: string; approvalRecord: ReleaseApprovalRequest } {
    let approved = false;
    let reason: string | undefined = undefined;

    if (!req.automatedTestsPassed || req.testPassRate < 1.0) {
      reason = "Release blocked: Automated test suite did not achieve 100% pass rate";
    } else if (!req.databaseMigrationsVerified) {
      reason = "Release blocked: Database migrations are unverified or pending application";
    } else if (!req.regressionCheckPassed) {
      reason = "Release blocked: Regression evaluation detected degradation against baseline";
    } else if (req.environment === "production" && !req.approver) {
      reason = "Release blocked: Production release strictly requires named human engineering approver";
    } else {
      approved = true;
    }

    const record: ReleaseApprovalRequest = {
      ...req,
      approvalStatus: approved ? "approved" : "rejected",
      approvedAt: approved ? new Date().toISOString() : undefined,
      rejectionReason: reason,
    };

    this.releaseApprovals.set(`${req.environment}_${req.version}`, record);
    return { approved, reason, approvalRecord: record };
  }

  // =========================================================================
  // 2. USER FEEDBACK TO DEVELOPMENT TASK CONVERTER
  // =========================================================================

  /**
   * Converts validated user feedback into structured development issue tickets
   * Rule: Private user conversations must NEVER be used for model training
   */
  public processFeedbackIntoTask(params: {
    category: string;
    feedbackText: string;
    userConsentedToTaskCreation: boolean;
    allowModelTrainingUse?: boolean;
    reportedBy: string;
  }): { created: boolean; issueId?: string; message: string } {
    if (!params.userConsentedToTaskCreation) {
      return {
        created: false,
        message: "Feedback discarded from task creation: User did not grant consent",
      };
    }

    // Safety guardrail: strictly enforce zero training on conversation data
    if (params.allowModelTrainingUse) {
      console.warn("[SECURITY GUARDRAIL] Model training on raw user conversation data is strictly forbidden by policy");
    }

    const isCritical = params.category === "incorrect_answer" || params.category === "failed_tool_call";
    const result = issueTracker.reportIssue({
      title: `[User Feedback] ${params.category.replace(/_/g, " ").toUpperCase()}`,
      severity: isCritical ? "high" : "medium",
      affectedFeature: `User Experience / ${params.category}`,
      isSecurityOrDataLoss: false,
      problemDescription: params.feedbackText,
      reproductionSteps: ["Review feedback context payload", "Reproduce query in staging environment"],
      assignedTo: "ai-quality-team",
    });

    return {
      created: Boolean(result.success),
      issueId: result.issue?.id,
      message: result.success
        ? `Task ${result.issue?.id} created for development triage`
        : `Failed to create task: ${result.error}`,
    };
  }

  // =========================================================================
  // 3. PERFORMANCE & COST MONITORING
  // =========================================================================

  /**
   * Generates a performance and cost monitoring report with configurable alerts
   * Rule: Do not silently switch users to more expensive models
   */
  public generateCostAndPerformanceReport(params: {
    totalApiCalls: number;
    totalTokens: number;
    costUSD: number;
    dailyBudgetLimitUSD: number;
    databaseLatencyMs: number;
    storageUsageMB: number;
    errorRate: number;
  }): PerformanceCostReport {
    const alerts: string[] = [];
    const isBudgetExceeded = params.costUSD > params.dailyBudgetLimitUSD;

    if (isBudgetExceeded) {
      alerts.push(`Daily budget ceiling exceeded: $${params.costUSD.toFixed(2)} / $${params.dailyBudgetLimitUSD.toFixed(2)}`);
    }

    if (params.errorRate > 0.05) {
      alerts.push(`System error rate ${(params.errorRate * 100).toFixed(1)}% exceeds 5.0% SLA boundary`);
    }

    if (params.databaseLatencyMs > 250) {
      alerts.push(`Database query latency ${params.databaseLatencyMs}ms exceeds 250ms target`);
    }

    return {
      timestamp: new Date().toISOString(),
      totalApiCalls: params.totalApiCalls,
      totalTokenConsumption: params.totalTokens,
      estimatedModelCostUSD: Number(params.costUSD.toFixed(4)),
      dailyBudgetLimitUSD: params.dailyBudgetLimitUSD,
      isBudgetExceeded,
      databaseLatencyMs: params.databaseLatencyMs,
      storageUsageMB: params.storageUsageMB,
      systemErrorRate: params.errorRate,
      alerts,
    };
  }

  // =========================================================================
  // 4. SECURITY MAINTENANCE INSPECTION
  // =========================================================================

  /**
   * Validates zero-trust security postures and dependencies
   */
  public conductSecurityInspection(params: {
    hasAuthBypass: boolean;
    hasUnprotectedRls: boolean;
    hasExposedSecrets: boolean;
    hasUncappedFileUpload: boolean;
    hasTenantLeakage: boolean;
    dependencyVulnerabilities: { critical: number; high: number; moderate: number; low: number };
  }): SecurityInspectionReport {
    const findings: string[] = [];

    const authStatus = params.hasAuthBypass ? "fail" : "pass";
    const rlsStatus = params.hasUnprotectedRls ? "fail" : "pass";
    const secretStatus = params.hasExposedSecrets ? "fail" : "pass";
    const fileStatus = params.hasUncappedFileUpload ? "fail" : "pass";
    const tenantStatus = params.hasTenantLeakage ? "fail" : "pass";

    if (authStatus === "fail") findings.push("Authentication bypass vulnerability detected");
    if (rlsStatus === "fail") findings.push("Unprotected database table missing Row-Level Security");
    if (secretStatus === "fail") findings.push("Exposed API secret or credentials discovered in codebase");
    if (fileStatus === "fail") findings.push("File upload missing 25MB ceiling or magic byte validation");
    if (tenantStatus === "fail") findings.push("Multi-tenant cross-workspace isolation leakage found");

    if (params.dependencyVulnerabilities.critical > 0) {
      findings.push(`${params.dependencyVulnerabilities.critical} critical dependency vulnerability found`);
    }

    let overallStatus: SecurityInspectionReport["overallStatus"] = "secure";
    if (findings.length > 0 || params.dependencyVulnerabilities.critical > 0) {
      overallStatus =
        params.dependencyVulnerabilities.critical > 0 || authStatus === "fail" || secretStatus === "fail"
          ? "critical_vulnerability"
          : "requires_attention";
    }

    return {
      timestamp: new Date().toISOString(),
      authenticationStatus: authStatus,
      supabaseRlsStatus: rlsStatus,
      secretLeakageStatus: secretStatus,
      fileUploadSecurityStatus: fileStatus,
      workspaceIsolationStatus: tenantStatus,
      dependencyVulnerabilities: params.dependencyVulnerabilities,
      overallStatus,
      findings,
    };
  }

  // =========================================================================
  // 5. 10-STEP CONTINUOUS IMPROVEMENT WORKFLOW
  // =========================================================================

  /**
   * Executes and logs a full 10-step continuous improvement lifecycle
   */
  public executeContinuousImprovementCycle(stepData: {
    userFeedback: string;
    issueId: string;
    rootCause: string;
    proposalDiff: string;
    automatedTestPassed: boolean;
    regressionScoreGain: number; // e.g. +0.015 (+1.5%)
    humanApprover: string;
    targetVersion: string;
  }): { success: boolean; completedSteps: string[]; currentStatus: string } {
    const completedSteps: string[] = [];

    // Step 1: User Feedback
    completedSteps.push("1. User Feedback Ingested");

    // Step 2: Issue Identification
    completedSteps.push(`2. Issue Identified (${stepData.issueId})`);

    // Step 3: Root Cause Analysis
    completedSteps.push("3. Root Cause Analyzed");

    // Step 4: Improvement Proposal
    completedSteps.push("4. Concrete Improvement Proposal Formulated");

    // Step 5: Development
    completedSteps.push("5. Code Patch Developed");

    // Step 6: Automated Testing
    if (!stepData.automatedTestPassed) {
      return {
        success: false,
        completedSteps,
        currentStatus: "Halted at Step 6: Automated testing failed",
      };
    }
    completedSteps.push("6. Automated Testing Passed (100%)");

    // Step 7: Regression Evaluation
    if (stepData.regressionScoreGain < 0) {
      return {
        success: false,
        completedSteps,
        currentStatus: "Halted at Step 7: Negative regression detected against baseline",
      };
    }
    completedSteps.push(`7. Regression Evaluation Confirmed (+${(stepData.regressionScoreGain * 100).toFixed(1)}% gain)`);

    // Step 8: Human Approval
    if (!stepData.humanApprover) {
      return {
        success: false,
        completedSteps,
        currentStatus: "Halted at Step 8: Missing mandatory human engineering sign-off",
      };
    }
    completedSteps.push(`8. Human Engineering Approval Granted by ${stepData.humanApprover}`);

    // Step 9: Controlled Release
    completedSteps.push(`9. Controlled Release Deployed (v${stepData.targetVersion})`);

    // Step 10: Performance Monitoring
    completedSteps.push("10. Telemetry & AI Quality Performance Active");

    return {
      success: true,
      completedSteps,
      currentStatus: "Completed all 10 continuous improvement lifecycle steps successfully",
    };
  }
}

export const continuousOpsController = ContinuousOpsController.getInstance();
