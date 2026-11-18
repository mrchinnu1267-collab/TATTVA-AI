/**
 * TATTVA AI - Phase 43: Continuous Evolution & Autonomous Platform Maintenance Types
 * Defines data structures for performance telemetry, evaluation benchmarks,
 * model canary testing, automated bug diagnostics, backup recovery verification,
 * and monthly engineering reports.
 */

export type PlatformHealthStatus = "healthy" | "degraded" | "critical" | "maintenance";

export interface LatencyPercentiles {
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  avgMs: number;
  sampleCount: number;
}

export interface EndpointMetric {
  endpoint: string;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  errorRatePercent: number;
  latency: LatencyPercentiles;
  lastErrorTimestamp?: string;
  lastErrorMessage?: string;
}

export interface PlatformPerformanceSnapshot {
  timestamp: string;
  status: PlatformHealthStatus;
  uptimeSeconds: number;
  activeConcurrentUsers: number;
  totalRequestsHandled: number;
  overallErrorRatePercent: number;
  chatLatency: LatencyPercentiles;
  codeGenLatency: LatencyPercentiles;
  storageUsageBytes: number;
  storageUsageMb: number;
  estimatedCostMonthToDateUsd: number;
  endpointMetrics: Record<string, EndpointMetric>;
  performanceDegradations: PerformanceDegradationAlert[];
}

export interface PerformanceDegradationAlert {
  id: string;
  subsystem: "chat" | "code_execution" | "database" | "provider_api" | "storage";
  severity: "low" | "medium" | "high" | "critical";
  metricName: string;
  baselineValue: number;
  currentValue: number;
  deviationPercent: number;
  rootCauseAnalysis: string;
  recommendedMitigation: string;
  detectedAt: string;
}

export type EvaluationCategory =
  | "general_knowledge"
  | "mathematics"
  | "programming"
  | "debugging"
  | "reasoning"
  | "multilingual"
  | "continuity"
  | "factuality";

export interface BenchmarkQuestion {
  id: string;
  category: EvaluationCategory;
  prompt: string;
  expectedPattern: RegExp | string;
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
}

export interface CategoryEvaluationResult {
  category: EvaluationCategory;
  questionsTested: number;
  questionsPassed: number;
  scorePercent: number;
  baselineScorePercent: number;
  driftPercent: number;
  recurringMistakes: string[];
  recommendedImprovements: string[];
}

export interface FullEvaluationSuiteResult {
  id: string;
  executedAt: string;
  targetModel: string;
  overallScorePercent: number;
  baselineScorePercent: number;
  passThresholdPercent: number;
  passedValidationGate: boolean;
  categories: Record<EvaluationCategory, CategoryEvaluationResult>;
  summary: string;
}

export interface ProviderModelMetadata {
  id: string;
  provider: "google-gemini" | "anthropic" | "openai" | "huggingface" | "local-engine";
  displayName: string;
  tier: "flagship" | "fast" | "reasoning" | "local";
  contextWindowTokens: number;
  costPer1MTokensInUsd: number;
  costPer1MTokensOutUsd: number;
  isAvailable: boolean;
  consecutiveFailures: number;
  averageLatencyMs: number;
  errorRatePercent: number;
  circuitState: "CLOSED" | "HALF_OPEN" | "OPEN";
}

export interface CanaryTestResult {
  candidateModelId: string;
  testSuiteRunId: string;
  baselineModelId: string;
  accuracyDeltaPercent: number;
  latencyDeltaPercent: number;
  costDeltaPercent: number;
  recommendation: "promote_to_production" | "further_testing_needed" | "reject";
  detailedRationale: string;
  testedAt: string;
}

export interface BugDiagnosticReport {
  id: string;
  timestamp: string;
  severity: "critical" | "high" | "medium" | "low";
  subsystem: string;
  routeOrFunction: string;
  errorMessage: string;
  stackTraceSample?: string;
  reproductionSteps: string[];
  suggestedAction: string;
  isSafeToAutoFix: boolean;
  assignedStatus: "open" | "investigating" | "fix_in_progress" | "verified";
}

export interface BackupVerificationReport {
  id: string;
  verifiedAt: string;
  databaseIntegrity: {
    status: "verified" | "corrupt" | "missing";
    tableCount: number;
    rowCountTotal: number;
    checksum: string;
    restorationLatencyMs: number;
  };
  fileStorageIntegrity: {
    status: "verified" | "degraded" | "failed";
    totalFiles: number;
    totalSizeBytes: number;
    sampleValidationPassed: boolean;
  };
  deploymentRollbackTarget: {
    status: "available" | "unavailable";
    rollbackCommit: string;
    rollbackDeploymentId: string;
    verifiedReadyState: "READY";
  };
  overallBackupHealthy: boolean;
}

export interface UserFeedbackAggregate {
  period: string;
  totalSubmissions: number;
  averageSatisfactionRating: number; // 1-5
  topRequestedCapabilities: Array<{ feature: string; requestCount: number; priority: "high" | "medium" | "low" }>;
  unusedFeaturesDetected: string[];
  frictionPoints: Array<{ workflow: string; complaintsCount: number; issueDescription: string }>;
}

export interface MonthlyEngineeringReport {
  reportId: string;
  reportingPeriod: string;
  generatedAt: string;
  platformHealthSummary: {
    overallStatus: PlatformHealthStatus;
    uptimePercent: number;
    totalRequests: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    errorRatePercent: number;
  };
  aiQualityBenchmarks: {
    generalKnowledgeScore: number;
    mathematicsScore: number;
    programmingScore: number;
    debuggingScore: number;
    reasoningScore: number;
    multilingualScore: number;
    continuityScore: number;
    factualityScore: number;
    compositeAccuracyPercent: number;
  };
  providerAvailability: Record<string, { uptimePercent: number; avgLatencyMs: number; totalTokens: number; costUsd: number }>;
  securityAudits: {
    vulnerabilitiesDetected: number;
    criticalIssues: number;
    authFailuresBlocked: number;
    multiTenantIsolationPassed: boolean;
  };
  backupRecoveryHealth: {
    lastVerifiedBackupAt: string;
    databaseRestorationVerified: boolean;
    rollbackDeploymentReady: boolean;
  };
  completedImprovements: string[];
  remainingProblems: string[];
  recommendedPriorities: string[];
}
