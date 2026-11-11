/**
 * TATTVA AI - Phase O: Automated Image Accuracy Regression Testing
 * Data contracts for permanent benchmark catalog (13 categories), baseline management,
 * regression detection, CI/CD deployment gating, and automatic rollback protection.
 */

// ==========================================
// 1. PERMANENT BENCHMARK DOMAINS (13 CATEGORIES)
// ==========================================

export type RegressionBenchmarkCategory =
  | "object_generation"
  | "exact_object_quantities"
  | "color_attribute_accuracy"
  | "spatial_relationships"
  | "complex_compositions"
  | "reference_image_generation"
  | "text_rendering"
  | "photorealistic_images"
  | "three_d_renders"
  | "illustrations"
  | "background_generation"
  | "image_editing"
  | "character_consistency";

export type RegressionEvaluationDimension =
  | "object_presence"
  | "object_count"
  | "attribute_accuracy"
  | "color_accuracy"
  | "spatial_accuracy"
  | "reference_consistency"
  | "text_accuracy"
  | "composition_accuracy"
  | "visual_quality";

export interface RegressionGroundTruthRequirement {
  id: string;
  dimension: RegressionEvaluationDimension;
  description: string;
  expectedValue: string | number | boolean;
  toleranceWindow?: {
    minIoU?: number;
    minLevenshtein?: number;
    allowedCountVariance?: number;
  };
  negativeAssertions?: string[];
}

export interface PermanentBenchmarkPromptItem {
  id: string;
  benchmarkVersion: string; // e.g. "v2.0.0"
  category: RegressionBenchmarkCategory;
  prompt: string;
  description: string;
  groundTruthRequirements: RegressionGroundTruthRequirement[];
  stressDimension: RegressionEvaluationDimension;
  referenceImageRequired?: boolean;
}

// ==========================================
// 2. BASELINE MANAGEMENT
// ==========================================

export interface ApprovedAccuracyBaseline {
  baselineId: string;
  benchmarkVersion: string; // e.g. "v2.0.0"
  modelIdentifier: string;
  modelVersion: string;
  provider: string;
  promptCompilerVersion: string;
  evaluationMethodology: string;
  sampleCount: number;
  approvedAt: string;
  approvedBy: string; // Admin signature
  status: "active_baseline" | "candidate" | "deprecated";

  // Baseline Accuracy Scores (0 - 100%)
  overallPromptAdherence: number;
  dimensionBaselines: Record<RegressionEvaluationDimension, number>;
  categoryBaselines: Record<RegressionBenchmarkCategory, number>;

  // Performance & Cost baselines
  averageLatencySeconds: number;
  costPerSuccessfulGenerationUSD: number;
  maxAllowedRegressionDeltaPercent: number; // e.g. 2.0%
}

// ==========================================
// 3. REGRESSION DETECTION & DELTAS
// ==========================================

export type RegressionSeverity = "none" | "minor_variance" | "warning" | "critical_regression";

export interface DimensionRegressionDelta {
  dimension: RegressionEvaluationDimension;
  baselineScore: number;
  candidateScore: number;
  deltaPercent: number; // candidate - baseline
  isRegression: boolean;
  severity: RegressionSeverity;
  statisticalZScore: number;
  isStatisticallySignificant: boolean;
}

export interface CategoryRegressionDelta {
  category: RegressionBenchmarkCategory;
  baselineScore: number;
  candidateScore: number;
  deltaPercent: number;
  isRegression: boolean;
  severity: RegressionSeverity;
}

export interface RegressionDetectionReport {
  reportId: string;
  timestamp: string;
  baselineId: string;
  modelIdentifier: string;
  provider: string;
  tier: "smoke_test" | "standard_suite" | "comprehensive_audit";
  testMode: "real_inference" | "verified_simulation";
  sampleCount: number;

  overallBaselineAdherence: number;
  overallCandidateAdherence: number;
  overallDeltaPercent: number;
  overallSeverity: RegressionSeverity;

  hasCriticalRegression: boolean;
  dimensionDeltas: DimensionRegressionDelta[];
  categoryDeltas: CategoryRegressionDelta[];
  newFailureCategoriesDetected: string[];
  failedTestCases: Array<{
    promptId: string;
    prompt: string;
    category: RegressionBenchmarkCategory;
    failedRequirement: string;
    observedFailure: string;
  }>;

  deploymentGateVerdict: "passed" | "blocked";
  deploymentBlockReasons: string[];
}

// ==========================================
// 4. AUTOMATIC ROLLBACK PROTECTION
// ==========================================

export interface RollbackConfigurationSnapshot {
  snapshotId: string;
  createdAt: string;
  promptCompilerConfig: {
    version: string;
    countingAnchorSyntax: string;
    spellingEncapsulation: string;
  };
  modelRoutingConfig: {
    primaryProvider: string;
    fallbackChain: string[];
    categoryRoutingRules: Record<string, string>;
  };
  evaluationConfig: {
    confidenceThreshold: number;
    ocrMinLevenshtein: number;
    iouThreshold: number;
  };
  activeAdapterId?: string;
  isProductionApproved: boolean;
}

export interface RollbackIncidentRecord {
  incidentId: string;
  timestamp: string;
  triggeringReportId: string;
  severity: "critical";
  regressionCause: string;
  previousSnapshotRestoredId: string;
  administratorNotified: boolean;
  notifiedAdmins: string[];
  restorationStatus: "restored_successfully" | "restoration_failed";
}

// ==========================================
// 5. REGRESSION DASHBOARD TELEMETRY
// ==========================================

export interface RegressionDashboardMetrics {
  currentActiveBaseline: ApprovedAccuracyBaseline;
  latestReport: RegressionDetectionReport;
  historicalReportsSummary: Array<{
    reportId: string;
    timestamp: string;
    tier: string;
    testMode: string;
    adherence: number;
    delta: number;
    gateVerdict: "passed" | "blocked";
  }>;
  activeRollbackSnapshots: RollbackConfigurationSnapshot[];
  recentIncidents: RollbackIncidentRecord[];
  costTelemetry: {
    totalTestRuns: number;
    totalSpendUSD: number;
    averageCostPerRunUSD: number;
    configuredSpendingCapUSD: number;
  };
}

