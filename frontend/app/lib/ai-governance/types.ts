/**
 * TATTVA AI - AI Governance & Responsible AI Framework Types (Phase 44)
 * Defines schemas for content safety, PII protection, injection mitigation,
 * decision transparency, human approval gates, and governance audit trails.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type GovernanceRiskTier = "low" | "medium" | "high" | "critical";

export type GovernanceAction = "allow" | "warn" | "redact" | "require_approval" | "block";

export type ContentSafetyCategory =
  | "hate_speech"
  | "harassment"
  | "self_harm"
  | "sexual_content"
  | "violence"
  | "dangerous_content"
  | "toxic_language"
  | "regulatory_noncompliance";

export interface CategoryEvaluation {
  category: ContentSafetyCategory;
  score: number; // 0.0 (safe) to 1.0 (severe violation)
  flagged: boolean;
  reason?: string;
}

export interface ContentSafetyAssessment {
  overallSafe: boolean;
  action: GovernanceAction;
  highestRiskCategory?: ContentSafetyCategory;
  highestRiskScore: number;
  categoryEvaluations: CategoryEvaluation[];
  redactedText?: string;
  violations: string[];
  assessedAt: number;
}

export type PIIFilterType =
  | "credit_card"
  | "ssn"
  | "email"
  | "phone_number"
  | "api_key"
  | "jwt_token"
  | "ipv4_address"
  | "crypto_wallet";

export interface PIIFinding {
  type: PIIFilterType;
  rawMatch: string;
  redactedMatch: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

export interface PIISanitizationResult {
  isClean: boolean;
  cleanText: string;
  findingsCount: number;
  findings: PIIFinding[];
  redactedTypes: PIIFilterType[];
}

export type ThreatCategory =
  | "none"
  | "direct_jailbreak"
  | "indirect_injection"
  | "system_prompt_leakage"
  | "delimiter_manipulation"
  | "canary_compromise"
  | "roleplay_exploit";

export interface InjectionCheckResult {
  isClean: boolean;
  riskScore: number; // 0.0 to 1.0
  threatCategory: ThreatCategory;
  detectedPatterns: string[];
  neutralizedText: string;
  canaryTriggered: boolean;
  quarantined: boolean;
}

export interface DecisionTransparencyReport {
  decisionId: string;
  timestamp: number;
  modelIdentifier: string;
  confidenceScore: number; // 0.0 to 1.0
  intentDetected: string;
  reasoningSteps: string[];
  citations: string[];
  safetyFiltersApplied: string[];
  policyCompliant: boolean;
  humanApprovalRequired: boolean;
  approvalRequestId?: string;
}

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface HumanApprovalRequest {
  id: string;
  createdAt: number;
  requestedBy: string;
  operationType: string;
  toolName?: string;
  riskTier: GovernanceRiskTier;
  reason: string;
  contextPayload: Record<string, any>;
  status: ApprovalStatus;
  resolvedAt?: number;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export type GovernanceEventType =
  | "content_scanned"
  | "injection_blocked"
  | "pii_redacted"
  | "policy_violated"
  | "approval_requested"
  | "approval_resolved"
  | "transparency_logged"
  | "policy_configured";

export type AuditSeverity = "info" | "warning" | "error" | "critical";

export interface GovernanceAuditEntry {
  id: string;
  timestamp: number;
  actor: string;
  eventType: GovernanceEventType;
  severity: AuditSeverity;
  summary: string;
  details: Record<string, any>;
  ipAddress?: string;
}

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  riskTier: GovernanceRiskTier;
  enabled: boolean;
  rules: string[];
  actionOnViolation: GovernanceAction;
  updatedAt: number;
}

export interface GovernancePlatformMetrics {
  totalScans: number;
  cleanRate: number;
  flaggedRate: number;
  injectionsNeutralized: number;
  piiRedactions: number;
  pendingApprovals: number;
  approvedOperations: number;
  rejectedOperations: number;
  activePolicies: number;
  lastUpdated: number;
}
