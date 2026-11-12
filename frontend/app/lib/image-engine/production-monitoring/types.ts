/**
 * TATTVA AI - Phase Q: Continuous Production Monitoring & Accuracy Intelligence Types
 * Defines comprehensive telemetry, provider health, accuracy metrics, failure classification,
 * cost tracking, intelligent alerting, and continuous improvement workflow schemas.
 */

import { ImageProviderId } from "../types";
import { AccuracyRequirementCategory, AccuracyScorecard } from "../accuracy/types";

// =============================================================================
// 1. PROVIDER MONITORING TYPES
// =============================================================================

export type ProviderHealthStatus = "healthy" | "degraded" | "down" | "cooldown";
export type CircuitBreakerState = "closed" | "open" | "half-open";

export interface ProviderHealthTelemetry {
  providerId: ImageProviderId;
  name: string;
  status: ProviderHealthStatus;
  circuitBreakerState: CircuitBreakerState;
  responseTimeMs: number;
  successRate: number; // 0 to 100
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  consecutiveFailures: number;
  authFailures: number;
  timeoutCount: number;
  rateLimitHits: number;
  quotaRemainingPercent: number; // 0 to 100
  cooldownRemainingSeconds: number;
  lastHealthCheckTimestamp: string;
  lastErrorMessage?: string;
  isAvailableForInference: boolean;
}

// =============================================================================
// 2. IMAGE ACCURACY MONITORING TYPES
// =============================================================================

export type MonitoringAccuracyDimension =
  | "object_presence"
  | "object_count"
  | "attribute_accuracy"
  | "color_accuracy"
  | "spatial_accuracy"
  | "reference_consistency"
  | "text_accuracy"
  | "composition_accuracy"
  | "visual_quality";

export interface DimensionAccuracyMetric {
  dimension: MonitoringAccuracyDimension;
  label: string;
  score: number; // 0 to 100
  sampleCount: number;
  passRate: number; // 0 to 100
  trendDelta: number; // delta compared to baseline
  evaluationMethod: "vision_vlm" | "grounded_sam2" | "ocr_levenshtein" | "geometric_iou" | "blended_scorecard";
}

export interface CategoryAccuracyMetric {
  category: string;
  sampleCount: number;
  overallAccuracy: number;
  passRate: number;
  topFailureMode: string;
}

export interface ModelAccuracyTelemetry {
  modelId: string;
  provider: ImageProviderId;
  overallScore: number;
  promptAdherence: number;
  objectAccuracy: number;
  spatialAccuracy: number;
  textAccuracy: number;
  sampleCount: number;
  verifiedCount: number;
  unverifiedCount: number;
  rank: number;
}

// =============================================================================
// 3. GENERATION FAILURE MONITORING TYPES
// =============================================================================

export type GenerationFailureCategory =
  | "missing_objects"
  | "extra_objects"
  | "incorrect_quantities"
  | "wrong_colors"
  | "incorrect_attributes"
  | "incorrect_positioning"
  | "background_mismatches"
  | "reference_mismatches"
  | "text_errors"
  | "provider_failure"
  | "evaluation_failure"
  | "editing_failure";

export interface GenerationFailureRecord {
  id: string;
  timestamp: string;
  prompt: string;
  modelId: string;
  provider: ImageProviderId;
  category: GenerationFailureCategory;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  rootCause: string;
  suggestedRemediation: string;
  affectedRegion?: string;
  recurrentCount: number;
  resolved: boolean;
}

export interface FailureDistributionMetric {
  category: GenerationFailureCategory;
  count: number;
  percentage: number;
  primaryCause: string;
}

// =============================================================================
// 4. PERFORMANCE & LATENCY MONITORING TYPES
// =============================================================================

export interface LatencyQuantiles {
  count: number;
  meanMs: number;
  medianMs: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
}

export interface PerformanceMonitoringTelemetry {
  generationLatency: LatencyQuantiles;
  evaluationLatency: LatencyQuantiles;
  correctionLatency: LatencyQuantiles;
  totalRequestLatency: LatencyQuantiles;
  activeQueueLength: number;
  concurrentRequests: number;
  storageOpsPerMinute: number;
  failureRatePercent: number;
}

// =============================================================================
// 5. COST MONITORING & SPENDING GUARDRAILS
// =============================================================================

export interface CostRecord {
  id: string;
  timestamp: string;
  provider: ImageProviderId;
  modelId: string;
  generationCostUsd: number;
  evaluationCostUsd: number;
  correctionCostUsd: number;
  storageCostUsd: number;
  totalCostUsd: number;
  isActualBilling: boolean; // true if from provider billing webhook/response; false if estimated
  success: boolean;
}

export interface SpendingGuardrails {
  dailySpendLimitUsd: number;
  currentDailySpendUsd: number;
  perRequestMaxCostUsd: number;
  costPerSuccessfulGenerationUsd: number;
  maxConsecutiveCorrectionLoops: number;
  budgetExhausted: boolean;
}

// =============================================================================
// 6. INTELLIGENT ALERTS TYPES
// =============================================================================

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertType =
  | "provider_outage"
  | "repeated_generation_failures"
  | "quota_exhaustion"
  | "significant_accuracy_regression"
  | "unusual_generation_costs"
  | "high_latency"
  | "storage_failure"
  | "security_incident";

export interface ProductionAlert {
  id: string;
  timestamp: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  sourceProvider?: ImageProviderId;
  sourceModel?: string;
  details: Record<string, any>;
  dedupKey: string;
  occurrenceCount: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

// =============================================================================
// 7. CONTINUOUS ACCURACY IMPROVEMENT WORKFLOW TYPES
// =============================================================================

export type ImprovementWorkflowStage =
  | "generation"
  | "evaluation"
  | "failure_detection"
  | "performance_analysis"
  | "recommendation"
  | "benchmark_validation"
  | "approval"
  | "production_update";

export interface ImprovementRecommendation {
  id: string;
  timestamp: string;
  targetDimension: MonitoringAccuracyDimension;
  targetCategory: string;
  detectedWeakness: string;
  observedAccuracy: number;
  targetAccuracy: number;
  proposedPromptPrefix: string;
  proposedNegativeDirective: string;
  benchmarkScoreBefore: number;
  benchmarkScoreAfter: number;
  validationVerdict: "passed" | "failed" | "pending";
  approvalStatus: "pending_review" | "approved" | "rejected" | "deployed";
  approvedBy?: string;
  approvedAt?: string;
  changeLogNotes: string;
}

// =============================================================================
// 8. UNIFIED DASHBOARD PAYLOAD
// =============================================================================

export interface ProductionMonitoringDashboardData {
  systemOverview: {
    totalRequests: number;
    successfulGenerations: number;
    failedGenerations: number;
    activeQueueLength: number;
    averageSuccessRate: number;
    providersOnlineCount: number;
    totalProvidersCount: number;
  };
  providerHealth: ProviderHealthTelemetry[];
  accuracyOverview: {
    overallPassRate: number;
    verifiedGenerationsCount: number;
    unverifiedGenerationsCount: number;
    dimensions: DimensionAccuracyMetric[];
    categories: CategoryAccuracyMetric[];
  };
  failureAnalysis: {
    totalFailures: number;
    distribution: FailureDistributionMetric[];
    recentFailures: GenerationFailureRecord[];
  };
  modelPerformance: {
    rankings: ModelAccuracyTelemetry[];
  };
  performanceTelemetry: PerformanceMonitoringTelemetry;
  costTelemetry: SpendingGuardrails & {
    recentCostRecords: CostRecord[];
  };
  activeAlerts: ProductionAlert[];
  improvementQueue: ImprovementRecommendation[];
  historicalTrends: {
    dailyAccuracy: Array<{ date: string; accuracy: number; volume: number }>;
    weeklyRegressionIncidents: Array<{ week: string; incidents: number; resolved: number }>;
  };
}

