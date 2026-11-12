/**
 * TATTVA AI - Phase T: Final Image Accuracy Optimization and Error Reduction Types
 * Defines schemas for Error Cause Elimination, Verified Prompt Optimization,
 * Model Accuracy Profiles, Advanced Composition, Fine-Grained Reference Vault,
 * Targeted Surgical Correction, Cost Per Successful Generation (CPSG), and Final Benchmarks.
 */

import { ImageProviderId } from "../types";

// =============================================================================
// 1. PRIORITIZED ERROR ELIMINATION & ROOT CAUSE TYPES
// =============================================================================

export type RecurringErrorCategory =
  | "missing_objects"
  | "incorrect_quantities"
  | "incorrect_colors"
  | "incorrect_attributes"
  | "incorrect_positioning"
  | "incorrect_spatial_relations"
  | "reference_mismatches"
  | "incorrect_backgrounds"
  | "incorrect_text"
  | "composition_mismatches";

export interface RootCauseDiagnostic {
  category: RecurringErrorCategory;
  priority: number; // 1 (highest) - 10
  failureSymptom: string;
  rootCause: string;
  responsibleComponent:
    | "prompt_compiler"
    | "model_router"
    | "scene_planner"
    | "spatial_conditioning"
    | "reference_analyzer"
    | "evaluation_consensus"
    | "inpainting_corrector";
  technicalRemediation: string;
  measuredBaselineAccuracy: number; // e.g. 0.684
  measuredOptimizedAccuracy: number; // e.g. 0.946
  netImprovementDelta: number; // e.g. +0.262
  isRemediationVerified: boolean;
}

// =============================================================================
// 2. PROMPT ACCURACY OPTIMIZATION & VERIFICATION
// =============================================================================

export interface PromptVerificationCheckResult {
  isValid: boolean;
  score: number; // 0.0 - 1.0
  originalLengthChars: number;
  compiledLengthTokens: number;
  isTruncated: boolean;
  preservedEntitiesCount: number;
  missingEntities: string[];
  detectedContradictions: string[];
  negativePromptCollisions: string[];
  formattingStyle: "natural_prose_flux" | "keyword_weighted_sdxl" | "descriptive_gemini";
  auditPassed: boolean;
}

// =============================================================================
// 3. MODEL ACCURACY PERFORMANCE PROFILES
// =============================================================================

export interface ModelAccuracyProfile {
  modelId: string;
  displayName: string;
  provider: ImageProviderId;
  empiricalScores: {
    objectPresence: number; // 0.0 - 1.0
    objectCount: number;
    attributes: number;
    colorAccuracy: number;
    spatialAccuracy: number;
    referenceConsistency: number;
    textRendering: number;
    composition: number;
    visualQuality: number;
    overallAdherence: number;
  };
  operationalMetrics: {
    averageLatencyMs: number;
    costPerGenerationUsd: number;
    costPerSuccessfulGenerationUsd: number; // CPSG = Cost / Adherence
    providerFailureRate: number; // 0.0 - 1.0
    vramFootprintGb: number;
    isLocalSafeRTX3050: boolean;
  };
  strengths: string[];
  weaknesses: string[];
  bestUseCases: string[];
  lastValidatedTimestamp: string;
}

// =============================================================================
// 4. FINE-GRAINED REFERENCE PRESERVATION SPECIFICATIONS
// =============================================================================

export interface ReferenceElementInstruction {
  elementId: string;
  action: "preserve" | "modify" | "remove" | "add";
  targetDescription: string;
  boundingRegion?: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  colorPaletteToRetain?: string[];
  visualDnaThreshold: number; // e.g. 0.88
}

export interface FineGrainedReferenceAudit {
  referenceId: string;
  preservedElementsCompliance: number; // 0.0 - 1.0
  modifiedElementsCompliance: number;
  removedElementsCompliance: number;
  addedElementsCompliance: number;
  paletteCompliance: number;
  overallReferenceScore: number;
  passedAudit: boolean;
}

// =============================================================================
// 5. TARGETED ERROR CORRECTION & UNMASKED PRESERVATION
// =============================================================================

export interface SurgicalCorrectionStep {
  stepIndex: number;
  failedCategory: RecurringErrorCategory;
  targetBBox: { xmin: number; ymin: number; xmax: number; ymax: number };
  correctionPrompt: string;
  unmaskedPixelsPreservedRatio: number; // must be >= 0.95
  preCorrectionAdherence: number;
  postCorrectionAdherence: number;
  deltaGain: number;
  isSuccessful: boolean;
  correctedArtifactUrl: string;
}

export interface SurgicalCorrectionReport {
  id: string;
  totalAttempts: number;
  maxAttemptsCeiling: number; // hard ceiling 3
  unmaskedPixelRetentionAverage: number;
  finalAdherenceScore: number;
  netAdherenceGain: number;
  steps: SurgicalCorrectionStep[];
  status: "fully_repaired" | "partially_improved" | "aborted_limit_reached";
}

// =============================================================================
// 6. COST AND PERFORMANCE BALANCING (CPSG)
// =============================================================================

export interface CostPerformanceMetrics {
  rawGenerationCostUsd: number;
  evaluationCostUsd: number;
  correctionCostUsd: number;
  totalTransactionCostUsd: number;
  finalAdherenceScore: number;
  costPerSuccessfulGenerationUsd: number; // totalTransactionCost / finalAdherence
  p50LatencyMs: number;
  p95LatencyMs: number;
  quotaConsumptionPercent: number;
}

// =============================================================================
// 7. FINAL COMPARATIVE BENCHMARK MATRIX (ARCH A THROUGH F)
// =============================================================================

export type OptimizationPipelineVariant =
  | "A_original_baseline"
  | "B_optimized_prompt"
  | "C_optimized_model_routing"
  | "D_advanced_composition"
  | "E_reference_conditioned"
  | "F_phase_t_final_optimized";

export interface ComparativePipelineScorecard {
  pipelineVariant: OptimizationPipelineVariant;
  displayName: string;
  metrics: {
    objectPresence: number;
    objectCountAccuracy: number;
    attributeAccuracy: number;
    colorAccuracy: number;
    spatialAccuracy: number;
    referenceConsistency: number;
    textAccuracy: number;
    compositionAccuracy: number;
    visualQuality: number;
    overallAdherence: number;
  };
  humanEvaluationScore?: number; // Blind human panel score (0.0 - 1.0)
  averageLatencyMs: number;
  costPerGenerationUsd: number;
  costPerSuccessfulGenerationUsd: number;
  netGainOverBaselinePercent: number;
}

export interface FinalAccuracyBenchmarkSummary {
  evaluatedPromptsCount: number;
  evaluatedAt: string;
  errorEliminationAudit: RootCauseDiagnostic[];
  pipelineScorecards: ComparativePipelineScorecard[];
  humanPanelAgreementRatio: number;
  topOverallArchitecture: OptimizationPipelineVariant;
  bestValueArchitecture: OptimizationPipelineVariant;
  executiveInsights: string[];
}

export type {
  OptimizedGenerationRequest,
  OptimizedGenerationResponse,
} from "./pipeline-optimizer";
