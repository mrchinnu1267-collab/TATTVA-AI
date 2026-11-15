/**
 * TATTVA AI - Continuous Development & Operations (Ops) Types
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type IssueSeverity = "critical" | "high" | "medium" | "low";
export type IssueStatus = "open" | "investigating" | "fix_in_progress" | "tested" | "resolved" | "closed";

export interface IssueRecord {
  id: string;
  title: string;
  severity: IssueSeverity;
  status: IssueStatus;
  affectedFeature: string;
  isSecurityOrDataLoss: boolean;
  problemDescription: string;
  reproductionSteps: string[];
  rootCause?: string;
  proposedSolution?: string;
  testResults?: {
    suite: string;
    passed: boolean;
    timestamp: string;
  };
  resolutionStatus?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseApprovalRequest {
  version: string;
  environment: "development" | "staging" | "production";
  commitHash: string;
  releaseNotesSummary: string;
  automatedTestsPassed: boolean;
  testPassRate: number;
  databaseMigrationsVerified: boolean;
  regressionCheckPassed: boolean;
  approver?: string;
  approvalStatus: "pending" | "approved" | "rejected";
  approvedAt?: string;
  rejectionReason?: string;
}

export interface AIQualityMetricSnapshot {
  timestamp: string;
  answerQualityScore: number;       // 0.0 - 1.0 (e.g. MMMLU or benchmark accuracy)
  baselineQualityScore: number;     // documented baseline (e.g. 0.810)
  avgResponseTimeMs: number;
  baselineResponseTimeMs: number;
  providerFailureRate: number;      // e.g. 0.01 (1%)
  ragRetrievalPrecision: number;    // e.g. 0.89
  agentSuccessRate: number;         // e.g. 0.94
  multilingualIndicAccuracy: number; // e.g. 0.82
  hallucinationRate: number;        // e.g. 0.02
  userSatisfactionRate: number;     // e.g. 0.91
}

export interface PerformanceCostReport {
  timestamp: string;
  totalApiCalls: number;
  totalTokenConsumption: number;
  estimatedModelCostUSD: number;
  dailyBudgetLimitUSD: number;
  isBudgetExceeded: boolean;
  databaseLatencyMs: number;
  storageUsageMB: number;
  systemErrorRate: number;
  alerts: string[];
}

export interface SecurityInspectionReport {
  timestamp: string;
  authenticationStatus: "pass" | "fail";
  supabaseRlsStatus: "pass" | "fail";
  secretLeakageStatus: "pass" | "fail";
  fileUploadSecurityStatus: "pass" | "fail";
  workspaceIsolationStatus: "pass" | "fail";
  dependencyVulnerabilities: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  overallStatus: "secure" | "requires_attention" | "critical_vulnerability";
  findings: string[];
}
