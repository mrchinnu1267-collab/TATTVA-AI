/**
 * TATTVA AI - Phase N: Continuous AI Model Improvement & Self-Learning Intelligence
 * Data contracts for feedback collection, failure intelligence, adaptive prompt optimization,
 * model learning, correction intelligence, controlled pipeline, and governance.
 */

export interface FeedbackRequirement {
  id: string;
  dimension: string;
  description: string;
  rawText: string;
}

// ==========================================
// 1. GENERATION FEEDBACK COLLECTION
// ==========================================

export interface ImageGenerationFeedbackRecord {
  id: string;
  timestamp: string;
  workspaceId: string;
  userId?: string;
  userConsentGiven: boolean;

  // Input & Generation parameters
  originalPrompt: string;
  sanitizedPrompt: string; // Stripped of PII / confidential tokens
  structuredRequirements: FeedbackRequirement[];
  selectedProvider: string;
  modelIdentifier: string;
  modelVersion: string;
  generationParameters: {
    width: number;
    height: number;
    aspectRatio?: string;
    steps?: number;
    guidanceScale?: number;
    seed?: number;
    stylePreset?: string;
  };

  // Outputs & Visual Evaluation
  generatedImageRef: string; // URL or content hash
  evaluationResults: {
    overallScore: number;
    promptAdherencePercent: number;
    verdict: "pass" | "fail" | "borderline";
    confidenceScore: number;
    dimensionScores: Record<string, number>;
  };
  failedRequirements: string[];
  
  // Correction Lifecycle
  correctionAttempts: Array<{
    attemptNumber: number;
    strategy: "inpainting" | "regeneration" | "prompt_reweight" | "outpainting";
    targetRegion?: { x: number; y: number; width: number; height: number };
    failedRequirement: string;
    resolved: boolean;
    unmaskedPreservationPercent: number;
    costIncurred: number;
  }>;
  finalResult: "accepted" | "corrected" | "abandoned" | "failed";

  // Voluntary User Feedback
  userFeedback?: VoluntaryUserFeedback;
}

export type UserFeedbackIssueType =
  | "correct_result"
  | "incorrect_object"
  | "wrong_color"
  | "wrong_positioning"
  | "missing_details"
  | "reference_mismatch"
  | "incorrect_text"
  | "other_issue";

export interface VoluntaryUserFeedback {
  issueType: UserFeedbackIssueType;
  satisfactionRating: 1 | 2 | 3 | 4 | 5; // 1 = poor, 5 = excellent
  userComments?: string;
  markedRegion?: {
    x: number; // 0.0 - 1.0 normalized
    y: number;
    width: number;
    height: number;
  };
  providedAt: string;
  consentForTraining: boolean;
}

// ==========================================
// 2. FAILURE INTELLIGENCE & CLASSIFICATION
// ==========================================

export type FailureProblemCategory =
  | "missing_objects"
  | "extra_objects"
  | "incorrect_object_counts"
  | "incorrect_colors"
  | "incorrect_materials"
  | "incorrect_attributes"
  | "wrong_positioning"
  | "incorrect_backgrounds"
  | "reference_inconsistencies"
  | "incorrect_text"
  | "composition_mismatches";

export type SubsystemFailureSource =
  | "prompt_understanding"
  | "prompt_compilation"
  | "model_capability"
  | "provider_routing"
  | "reference_conditioning"
  | "spatial_control"
  | "image_editing"
  | "evaluation_errors";

export interface FailureIntelligenceEntry {
  feedbackId: string;
  problemCategory: FailureProblemCategory;
  subsystemSource: SubsystemFailureSource;
  confidence: number;
  diagnosticEvidence: string;
  recurrenceWeight: number;
  identifiedPatterns: string[];
}

export interface FailurePatternSummary {
  problemCategory: FailureProblemCategory;
  subsystemSource: SubsystemFailureSource;
  frequency: number;
  percentageOfFailures: number;
  primaryAffectedModels: string[];
  recommendedMitigation: string;
}

// ==========================================
// 3. ADAPTIVE PROMPT OPTIMIZATION
// ==========================================

export interface MisunderstoodDirectivePattern {
  id: string;
  triggerPhrase: string; // e.g. "without any cars"
  misinterpretation: string; // Diffusion ignores negation and renders cars
  effectiveDecomposition: string; // Transfer to explicit negative prompt + foreground isolation
  category: "negation" | "counting" | "spatial_preposition" | "text_string" | "color_bleeding";
  verifiedAccuracyGain: number; // e.g. +18.4%
}

export interface ModelPromptStrategy {
  modelId: string;
  preferredFormat: "natural_sentences" | "weighted_tags" | "structured_clauses";
  supportsNegativePrompt: boolean;
  maxRecommendedTokens: number;
  attentionSyntax: "parentheses" | "colon_weight" | "natural_emphasis";
  spellingEncapsulation: "double_quotes" | "single_quotes" | "hyphenated";
}

export interface PromptOptimizationProposal {
  id: string;
  originalDirective: string;
  optimizedDirective: string;
  targetModel: string;
  strategyUsed: string;
  preservedRequirements: string[];
  baselineAdherence: number;
  projectedAdherence: number;
  empiricalValidationDelta?: number;
}

// ==========================================
// 4. INTELLIGENT MODEL LEARNING
// ==========================================

export interface ModelHistoricalPerformance {
  modelId: string;
  provider: string;
  sampleCount: number;
  overallPromptAdherence: number; // 0 - 100%
  
  // Dimensional metrics (0 - 100%)
  objectCountAccuracy: number;
  attributeAccuracy: number;
  spatialAccuracy: number;
  referenceConsistency: number;
  textAccuracy: number;
  visualQualityScore: number;

  // Operational telemetry
  averageLatencySeconds: number;
  failureRatePercent: number;
  costPerSuccessfulGenerationUSD: number;

  // Statistical reliability
  confidenceIntervalLow: number; // Wilson score 95% bound
  confidenceIntervalHigh: number;
  categoryStrengths: Record<string, number>; // Category ID -> Adherence %
}

export interface ModelSelectionRecommendation {
  promptCategory: string;
  recommendedModelId: string;
  recommendedProvider: string;
  projectedAdherence: number;
  selectionRationale: string;
  alternativeFallbackModelId: string;
}

// ==========================================
// 5. CORRECTION INTELLIGENCE
// ==========================================

export interface CorrectionCapabilityRule {
  problemCategory: FailureProblemCategory;
  isSurgicallyCorrectable: boolean;
  recommendedStrategy: "inpainting" | "regeneration" | "prompt_reweight" | "outpainting" | "abort_futile";
  capableProviders: string[];
  averageSuccessRate: number; // 0 - 100%
  unwantedChangeRisk: "low" | "medium" | "high";
  maxRetriesAllowed: number;
  costLimitUSD: number;
}

// ==========================================
// 6. CONTROLLED LEARNING PIPELINE
// ==========================================

export type LearningProposalState =
  | "draft"
  | "benchmarking"
  | "regression_tested"
  | "approved"
  | "deployed"
  | "rejected"
  | "rolled_back";

export interface ControlledLearningProposal {
  id: string;
  title: string;
  description: string;
  affectedSubsystem: SubsystemFailureSource;
  proposedChanges: Record<string, unknown>;
  createdAt: string;
  status: LearningProposalState;

  // Offline Validation
  offlineBenchmarkResults?: {
    promptsTestedCount: number;
    baselinePassRate: number;
    candidatePassRate: number;
    netImprovementPercent: number;
  };

  // Regression Safeguards
  regressionTestPassed: boolean;
  regressionAuditReport?: {
    categoriesTested: number;
    regressionsFound: string[];
    isSafeForProduction: boolean;
  };

  // Approval Lifecycle
  approvedBy?: string;
  approvedAt?: string;
  deployedAt?: string;
  rolledBackAt?: string;
}

// ==========================================
// 7. MODEL FINE-TUNING INTEGRATION & GOVERNANCE
// ==========================================

export interface FineTuningDatasetValidation {
  datasetId: string;
  totalImagesSubmitted: number;
  validImagesCount: number;
  duplicatesRemoved: number;
  qualityPassedCount: number;
  userConsentVerified: boolean;
  workspaceAuthorized: boolean;
  trainSplitCount: number;
  valSplitCount: number;
  validationStatus: "approved" | "rejected_consent_missing" | "rejected_low_quality";
  rejectionReason?: string;
}

export interface LoRAAdapterMetadata {
  adapterId: string;
  baseModel: string;
  version: string;
  triggerWord: string;
  targetDomain: string; // e.g. "product_render", "artistic_style", "character_id"
  trainedEpochs: number;
  trainLoss: number;
  valLoss: number;
  overfittingDetected: boolean;
  authorizationToken: string;
  isPaidTrainingAuthorized: boolean;
  createdAt: string;
}

// ==========================================
// 8. CONTINUOUS BENCHMARKING & REGRESSION MONITORING
// ==========================================

export interface ContinuousBenchmarkAlert {
  id: string;
  timestamp: string;
  severity: "info" | "warning" | "critical";
  category: string;
  metricName: string;
  priorScore: number;
  currentScore: number;
  regressionDelta: number;
  message: string;
  resolved: boolean;
}

// ==========================================
// 9. CONTINUOUS LEARNING DASHBOARD TELEMETRY
// ==========================================

export interface ContinuousLearningDashboardMetrics {
  totalGenerationsEvaluated: number;
  overallPromptAdherencePercent: number;
  adherenceGainSinceBaselinePercent: number;
  correctionSuccessRatePercent: number;
  activeProposalsCount: number;
  activeRegressionAlertsCount: number;

  failureBreakdown: FailurePatternSummary[];
  categoryAccuracies: Array<{
    category: string;
    adherencePercent: number;
    sampleSize: number;
    trend: "improving" | "stable" | "degrading";
  }>;
  modelRankings: ModelHistoricalPerformance[];
  userFeedbackTrends: {
    totalFeedbackCount: number;
    satisfactionAverage: number;
    topReportedIssues: Array<{ issue: UserFeedbackIssueType; count: number }>;
  };
  promptOptimizationGains: Array<{
    patternName: string;
    baselineAccuracy: number;
    optimizedAccuracy: number;
    delta: number;
  }>;
  recentAlerts: ContinuousBenchmarkAlert[];
}

