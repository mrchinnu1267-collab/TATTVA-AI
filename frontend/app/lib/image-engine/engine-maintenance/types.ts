/**
 * TATTVA AI - Phase W: Continuous Image Engine Maintenance & Quality Monitoring
 * Type Definitions & System Contracts
 */

import { ImageProviderId } from "../types";

export type MaintenanceErrorCategory =
  | "missing_objects"
  | "incorrect_quantities"
  | "spatial_misplacement"
  | "attribute_color_bleed"
  | "reference_identity_drift"
  | "typographic_distortion"
  | "composition_perspective_error"
  | "provider_timeout"
  | "quota_exhaustion"
  | "storage_failure";

export type FeatureType =
  | "text_to_image"
  | "reference_conditioning"
  | "image_to_image"
  | "object_addition"
  | "object_removal"
  | "background_replacement"
  | "surgical_inpainting"
  | "directional_outpainting"
  | "spatial_control"
  | "super_resolution";

export interface ProductionTelemetryFilter {
  startDate?: string;
  endDate?: string;
  provider?: ImageProviderId | "all";
  model?: string | "all";
  feature?: FeatureType | "all";
  errorCategory?: MaintenanceErrorCategory | "all";
}

export interface ProductionEventRecord {
  id: string;
  timestamp: string;
  provider: ImageProviderId;
  model: string;
  feature: FeatureType;
  latencyMs: number;
  success: boolean;
  errorCategory?: MaintenanceErrorCategory;
  errorMessage?: string;
  costUsd: number;
  storageSuccess: boolean;
  referenceImageProcessed?: boolean;
}

export interface ModelHealthWatchRecord {
  providerId: ImageProviderId;
  modelIdentifier: string;
  displayName: string;
  apiAvailable: boolean;
  authValid: boolean;
  quotaStatus: "normal" | "warning" | "exhausted";
  rateLimitErrorsCount: number;
  isDeprecatedByProvider: boolean;
  responseFormatValid: boolean;
  capabilitiesMatchRegistry: boolean;
  lastSuccessfulGenerationTimestamp: string;
  lastHealthCheckTimestamp: string;
  autoSwitchBlocked: boolean; // Must NEVER switch to unverified models
  notes: string;
}

export interface UserQualityFeedbackSubmission {
  id: string;
  generationId: string;
  timestamp: string;
  matchesPrompt: boolean;
  objectsAreCorrect: boolean;
  positioningIsCorrect: boolean;
  referenceSimilarityAcceptable: boolean;
  textIsReadable: boolean;
  imageQualityAcceptable: boolean;
  specificIssueDetails?: string;
  isSubjective: boolean; // Flagged as subjective, not objective ground truth
}

export interface UserFeedbackAggregates {
  totalFeedbackCount: number;
  promptMatchRatePct: number;
  objectsCorrectRatePct: number;
  positioningCorrectRatePct: number;
  referenceAcceptableRatePct: number;
  textReadableRatePct: number;
  imageQualityAcceptableRatePct: number;
  recentIssueSummaries: string[];
}

export interface RegressionCheckResult {
  checkId: string;
  timestamp: string;
  triggeredBy: "compiler_change" | "router_change" | "processor_change" | "provider_update" | "scheduled_audit";
  promptsEvaluatedCount: number;
  baselineAdherenceRatePct: number;
  currentAdherenceRatePct: number;
  adherenceDeltaPct: number;
  baselineMedianLatencyMs: number;
  currentMedianLatencyMs: number;
  baselineCpsgUsd: number;
  currentCpsgUsd: number;
  criticalRegressionsDetected: boolean;
  deploymentGateStatus: "PASS_DEPLOYMENT_ALLOWED" | "BLOCKED_CRITICAL_REGRESSION";
  regressionDetails: string[];
}

export interface SafeImprovementProposal {
  proposalId: string;
  failureCategory: MaintenanceErrorCategory;
  responsibleComponent: string;
  diagnosticEvidence: string;
  reproductionSteps: string[];
  proposedFixDescription: string;
  regressionTestPassed: boolean;
  beforeAdherencePct: number;
  afterAdherencePct: number;
  approvalStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  humanApprover?: string;
  forbiddenActionCheck: {
    noUncontrolledSelfModification: boolean;
    noAutoTrainingOnPrivateData: boolean;
  };
}

export interface ReliabilityStatusSummary {
  boundedRetryCeiling: number; // Strictly <= 3
  activeCooldowns: Array<{ provider: ImageProviderId; remainingSeconds: number; reason: string }>;
  requestTimeoutSeconds: number;
  duplicateProtectionActive: boolean;
  idempotencyCacheSize: number;
  activeAlerts: Array<{
    id: string;
    severity: "critical" | "warning" | "info";
    title: string;
    description: string;
    timestamp: string;
  }>;
}

export interface MonthlyQualityReport {
  reportId: string;
  reportingPeriod: string;
  generatedAt: string;
  metrics: {
    totalGenerationRequests: number;
    successfulGenerations: number;
    failedGenerations: number;
    overallSuccessRatePct: number;
    providerAvailabilityPct: Record<string, number>;
    averageLatencyMs: number;
    p95LatencyMs: number;
    costPerSuccessfulGenerationUsd: number;
    storageTotalGb: number;
  };
  userFeedbackTrends: UserFeedbackAggregates;
  accuracyPerformance: {
    referenceImagePreservationMean: number;
    spatialTopologyAccuracyMean: number;
    typographyAccuracyMean: number;
    overallBenchmarkAdherencePct: number;
  };
  regressionSummary: {
    regressionChecksRun: number;
    regressionsBlocked: number;
    zeroRegressionBaselineMaintained: boolean;
  };
  topRecurringIssues: Array<{
    category: MaintenanceErrorCategory;
    occurrenceCount: number;
    responsibleSubsystem: string;
    activeRemediation: string;
  }>;
  recommendedContinuousImprovements: string[];
  measuredVsEstimatedAudit: {
    isEmpiricallyMeasured: boolean;
    dataPointsCount: number;
  };
}

