/**
 * TATTVA AI - Engineering Completeness & Governance Architecture
 * Types and interfaces for the 15-Dimension Platform Completeness Audit.
 * 
 * Conceptualized & Engineered for TATTVA AI General Intelligence Platform
 */

export type CompletenessDimension =
  | "ai_accuracy_evaluation"
  | "security_penetration_testing"
  | "privacy_consent_retention"
  | "database_migration_safety"
  | "backup_restoration_disaster_recovery"
  | "performance_scalability_load"
  | "cost_usage_management"
  | "agent_permission_boundaries"
  | "regulatory_compliance"
  | "incident_response_monitoring"
  | "accessibility_ux_acceptance"
  | "api_versioning_compatibility"
  | "supply_chain_security"
  | "capacity_infrastructure_planning"
  | "business_continuity_recovery";

export interface AuditFinding {
  dimension: CompletenessDimension;
  dimensionNumber: number;
  title: string;
  whyItMatters: string;
  affectedComponents: string[];
  acceptanceCriteria: string[];
  dependencies: string[];
  status: "VERIFIED" | "PARTIALLY_VERIFIED" | "REMEDIATED";
  evidence: string;
  score: number; // 0 to 100
  remainingLimitations?: string;
  unresolvedRisks?: string;
}

export interface PlatformCompletenessReport {
  overallStatus: "CERTIFIED" | "CONDITIONAL" | "ACTION_REQUIRED";
  certificationScore: number; // 0 to 100
  totalDimensions: number;
  verifiedDimensions: number;
  findings: Record<CompletenessDimension, AuditFinding>;
  executedAt: number;
  environment: "production" | "staging" | "local";
  targetUrl: string;
  nextScheduledAudit: number;
}
