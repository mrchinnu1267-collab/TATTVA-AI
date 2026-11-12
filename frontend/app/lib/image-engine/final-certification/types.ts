/**
 * TATTVA AI - Phase V: Final Image Engine Certification and Release
 * Core Type Definitions & Certification Schemas
 */

export type CertificationDecision = "CERTIFIED" | "CONDITIONALLY_CERTIFIED" | "NOT_CERTIFIED";

export interface SubsystemAuditRecord {
  id: string;
  subsystemName: string;
  category: "compiler" | "routing" | "conditioning" | "generation" | "evaluation" | "storage" | "infrastructure";
  status: "verified" | "remediated" | "flagged";
  isSimulatedOrMocked: boolean;
  verificationMethod: string;
  complianceNotes: string;
}

export interface ProviderCertificationRecord {
  providerId: string;
  modelIdentifier: string;
  displayName: string;
  architectureFamily: string;
  authenticated: boolean;
  operationalStatus: "operational" | "degraded" | "offline";
  verifiedCapabilities: {
    textToImage: boolean;
    referenceConditioning: boolean;
    inpaintingMasks: boolean;
    spatialControls: boolean;
    outpainting: boolean;
  };
  advertisedMatchesReality: boolean;
  testedOutputFormat: string;
  testedDimensions: string;
  p50LatencyMs: number;
  p95LatencyMs: number;
  availabilityPct: number;
  costPerImageUsd: number;
  complianceNotes: string;
}

export interface FeatureTestRecord {
  featureId: string;
  featureName: string;
  testInput: string;
  expectedResult: string;
  actualResult: string;
  status: "PASS" | "FAIL";
  executionLatencyMs: number;
  estimatedCostUsd: number;
  identifiedIssues?: string;
  artifactsUrl?: string;
  complianceNotes?: string;
}

export interface SecurityAuditRecord {
  id: string;
  checkName: string;
  category: "credentials" | "privacy" | "storage" | "rate_limits" | "cost_controls";
  status: "PASS" | "FAIL";
  severity: "critical" | "high" | "medium" | "low";
  evidence: string;
}

export interface QualityMetricsCertification {
  totalPromptsEvaluated: number;
  overallAdherenceRate: number;
  ci95: [number, number];
  blindHumanPanelAgreementRate: number;
  dimensionScores: {
    objectPresence: number;
    objectCount: number;
    attributeAccuracy: number;
    colorAccuracy: number;
    spatialAccuracy: number;
    referenceConsistency: number;
    textAccuracy: number;
    compositionAccuracy: number;
    visualQuality: number;
  };
  uncertaintyMarginPct: number;
}

export interface PerformanceCostCertification {
  averageLatencyMs: number;
  medianP50LatencyMs: number;
  p95LatencyMs: number;
  providerSuccessRatePct: number;
  providerFailureRatePct: number;
  averageCostPerGenerationUsd: number;
  costPerSuccessfulGenerationUsd: number; // CPSG
  referenceProcessingLatencyMs: number;
  inpaintingRepairLatencyMs: number;
  averageStoragePerImageKb: number;
}

export interface FinalCertificationReport {
  certificationId: string;
  timestamp: string;
  decision: CertificationDecision;
  engineVersion: string;
  executiveSummary: string;
  subsystemAudits: SubsystemAuditRecord[];
  verifiedProviders: ProviderCertificationRecord[];
  featureTestMatrix: FeatureTestRecord[];
  qualityMetrics: QualityMetricsCertification;
  securityAudit: SecurityAuditRecord[];
  performanceMetrics: PerformanceCostCertification;
  knownLimitations: string[];
  correctiveActionsTaken: string[];
  productionReadinessSignOff: {
    isReadyForProduction: boolean;
    leadArchitect: string;
    deploymentEnvironment: string;
    rollbackVerified: boolean;
  };
}

