/**
 * TATTVA AI - Phase M: End-to-End Image Accuracy Validation & Verification Types
 * Defines comprehensive contracts for the 500-prompt benchmark dataset,
 * independent 9-dimension visual evaluation, failure classification,
 * surgical correction measurement, baseline comparisons, and dashboard telemetry.
 */

import { ImageProviderId, AspectRatio, ImageQuality } from "../types";

// ============================================================================
// 1. BENCHMARK CATEGORIES & DIMENSIONS
// ============================================================================

export type ValidationCategory =
  | "simple_generation"    // A: Single objects, animals, buildings, vehicles, landscapes
  | "complex_generation"   // B: Multiple objects, detailed environments, complex compositions
  | "object_count"         // C: Exactly one, exactly two, 5+, specific arrangements
  | "attribute_accuracy"   // D: Colors, materials, shapes, clothing, accessories
  | "spatial_accuracy"     // E: Left/right, above/below, front/behind, foreground/background
  | "reference_accuracy"   // F: Subject preservation, composition, background-only change
  | "text_accuracy"        // G: Exact words, numbers, signs, labels, typography
  | "artistic_generation"; // H: Photorealism, 3D, illustrations, anime, product visualization

export type EvaluationDimension =
  | "object_presence"
  | "object_count"
  | "attribute_accuracy"
  | "color_accuracy"
  | "spatial_accuracy"
  | "reference_consistency"
  | "text_accuracy"
  | "composition_accuracy"
  | "visual_quality";

export type EvaluationStatus = "pass" | "fail" | "uncertain";

// ============================================================================
// 2. GROUND TRUTH & REQUIREMENTS
// ============================================================================

export interface GroundTruthRequirement {
  id: string;
  dimension: EvaluationDimension;
  description: string;
  expected: any;
  critical?: boolean;
}

export interface ValidationBenchmarkPromptItem {
  id: number;
  category: ValidationCategory;
  subcategory: string;
  prompt: string;
  expectedRequirements: GroundTruthRequirement[];
  referenceImage?: string;
  preservationGoal?: string;
  targetProviderHint?: ImageProviderId;
}

export interface ValidationRequirementResult {
  id: string;
  dimension: EvaluationDimension;
  description: string;
  expected: any;
  detected: any;
  evaluationMethod: "grounding_dino" | "sam2_segmentation" | "ocr" | "color_histogram" | "geometric_iou" | "vlm_inference" | "psnr_laplacian";
  status: EvaluationStatus;
  confidence: number; // 0.0 to 1.0
  evidence: string;
  affectedRegionBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
}

// ============================================================================
// 3. FAILURE CLASSIFICATION & ROOT CAUSE ORIGIN
// ============================================================================

export type FailureCategory =
  | "missing_objects"
  | "extra_objects"
  | "incorrect_quantities"
  | "incorrect_colors"
  | "incorrect_attributes"
  | "incorrect_positioning"
  | "incorrect_background"
  | "reference_mismatch"
  | "incorrect_text"
  | "composition_mismatch";

export type FailureOrigin =
  | "prompt_interpretation"
  | "prompt_compilation"
  | "model_limitations"
  | "provider_routing"
  | "reference_conditioning"
  | "spatial_control"
  | "image_editing"
  | "evaluation_errors";

export interface ClassifiedFailure {
  requirementId: string;
  dimension: EvaluationDimension;
  failureCategory: FailureCategory;
  origin: FailureOrigin;
  detail: string;
  suggestedCorrectionAction: "inpainting" | "regeneration" | "re-routing" | "prompt_refine";
}

// ============================================================================
// 4. TEST RUN & CORRECTION MEASUREMENTS
// ============================================================================

export interface ValidationTestRun {
  runId: string;
  promptId: number;
  prompt: string;
  category: ValidationCategory;
  subcategory: string;
  provider: ImageProviderId;
  model: string;
  parameters: {
    width: number;
    height: number;
    quality: ImageQuality;
    aspectRatio: AspectRatio;
    seed: number;
  };
  imageUri: string;
  durationMs: number;
  providerError?: string;
  requirements: ValidationRequirementResult[];
  overallPassRate: number; // 0 to 100
  dimensionScores: Record<EvaluationDimension, { score: number; status: EvaluationStatus; confidence: number }>;
  failures: ClassifiedFailure[];
  humanReview?: {
    reviewed: boolean;
    reviewerId?: string;
    verdict: EvaluationStatus;
    reviewerNotes?: string;
    agreementWithAutomated: boolean;
  };
}

export interface CorrectionValidationRecord {
  runId: string;
  promptId: number;
  initialOverallAccuracy: number;
  postCorrectionAccuracy: number;
  accuracyDelta: number; // positive = improvement
  unintendedChangesDetected: boolean;
  unmaskedPixelPreservationScore: number; // 0-100%
  correctionAttempts: number;
  correctionProvider: ImageProviderId;
  additionalCostUsd: number;
  latencyMs: number;
  success: boolean;
}

// ============================================================================
// 5. BASELINE & DASHBOARD TELEMETRY
// ============================================================================

export interface BaselineComparisonMetric {
  metric: string;
  category: string;
  baselineScore: number;
  updatedScore: number;
  delta: number;
  improvementPercent: number;
  sampleSize: number;
  evaluationMethod: string;
}

export interface ValidationDashboardMetrics {
  totalBenchmarkTests: number;
  successfulGenerations: number;
  failedGenerations: number;
  overallRequirementPassRate: number;
  dimensionScores: Record<EvaluationDimension, { passRate: number; confidence: number; sampleCount: number }>;
  categoryScores: Record<ValidationCategory, { passRate: number; sampleCount: number }>;
  failureDistribution: Record<FailureCategory, number>;
  failureOriginDistribution: Record<FailureOrigin, number>;
  correctionMetrics: {
    totalEvaluated: number;
    correctionSuccessRate: number;
    avgCorrectionAttempts: number;
    avgPixelPreservationScore: number;
    unintendedChangesRate: number;
    avgAdditionalCostUsd: number;
  };
  performance: {
    avgGenerationDurationMs: number;
    avgCostPerSuccessfulImageUsd: number;
  };
  baselineComparisons: BaselineComparisonMetric[];
  humanReviewAudit: {
    totalSampled: number;
    agreementRate: number;
    uncertaintyResolutionRate: number;
  };
  accuracyTrend: Array<{ timestamp: string; passRate: number; sampleSize: number }>;
}
