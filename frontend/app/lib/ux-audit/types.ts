export type WCAGLevel = "AAA" | "AA" | "A" | "Non-Compliant";
export type UXIssueSeverity = "critical" | "warning" | "info";
export type ModuleAuditStatus = "certified" | "audit_passed" | "needs_attention";

export interface UXAuditIssue {
  id: string;
  severity: UXIssueSeverity;
  rule: string;
  message: string;
  elementSelector: string;
  remediation: string;
}

export interface ModuleAuditRecord {
  id: string;
  name: string;
  route: string;
  category: "core_intelligence" | "developer_tools" | "enterprise_governance" | "operations";
  accessibilityScore: number; // 0-100
  responsivenessScore: number; // 0-100
  visualPolishScore: number; // 0-100
  overallScore: number; // 0-100
  wcagTier: WCAGLevel;
  issues: UXAuditIssue[];
  status: ModuleAuditStatus;
  lastAuditedAt: number;
}

export interface UXAuditSummary {
  totalModules: number;
  averageAccessibilityScore: number;
  averageResponsivenessScore: number;
  averageVisualPolishScore: number;
  overallPlatformUXScore: number;
  totalIssuesCount: number;
  criticalIssuesCount: number;
  wcagCompliancePercentage: number;
  certifiedModulesCount: number;
  lastRunAt: number;
}

export interface AuditRunRequest {
  modules?: string[];
  deepCheck?: boolean;
}
