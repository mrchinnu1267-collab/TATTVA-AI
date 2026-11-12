/**
 * TATTVA AI - Phase U: Advanced Real-World Image Generation Validation
 * Type Definitions & Data Schemas
 */

export type PromptCategory =
  | "complex_objects"
  | "exact_quantities"
  | "spatial_relations"
  | "complex_compositions"
  | "reference_preservation"
  | "typography_text"
  | "diverse_domains";

export type ImageDomain =
  | "photorealistic"
  | "3d_render"
  | "illustration"
  | "product_visualization"
  | "architecture"
  | "landscape"
  | "educational_diagram";

export type SpatialRelationType =
  | "left_of"
  | "right_of"
  | "above"
  | "below"
  | "in_front_of"
  | "behind"
  | "near"
  | "far"
  | "nested_within"
  | "centered_between";

export interface ExpectedObjectRequirement {
  id: string;
  name: string;
  count: number;
  attributes: string[];
  color?: string;
  importance: "critical" | "high" | "medium";
}

export interface ExpectedSpatialRequirement {
  id: string;
  subjectId: string;
  relation: SpatialRelationType;
  targetId: string;
  tolerancePct: number; // Max allowed distance or IoU offset
}

export interface ExpectedTextRequirement {
  id: string;
  exactString: string;
  casingMatters: boolean;
  locationHint?: "top" | "center" | "bottom" | "sign" | "label";
  minLegibilityScore: number;
}

export interface ExpectedCompositionRequirement {
  cameraAngle: string;
  perspective: string;
  lightingConditions: string;
  focalDepth: "shallow" | "deep" | "medium";
  aspectRatio: string;
}

export interface ExpectedReferenceRequirement {
  referenceId: string;
  elementsToPreserve: string[];
  elementsToMutate: string[];
  minimumIdentityScore: number; // e.g. 0.85
}

/**
 * Independent Ground Truth definition for each unseen prompt
 */
export interface IndependentGroundTruth {
  expectedObjects: ExpectedObjectRequirement[];
  expectedQuantities: Record<string, number>;
  expectedColors: Record<string, string>;
  expectedAttributes: Record<string, string[]>;
  expectedSpatialRelations: ExpectedSpatialRequirement[];
  expectedComposition: ExpectedCompositionRequirement;
  expectedText?: ExpectedTextRequirement[];
  referencePreservation?: ExpectedReferenceRequirement;
  prohibitedElements?: string[];
}

export interface UnseenBenchmarkPrompt {
  id: string;
  prompt: string;
  category: PromptCategory;
  domain: ImageDomain;
  difficulty: "moderate" | "hard" | "extreme";
  groundTruth: IndependentGroundTruth;
  metadata?: {
    tags: string[];
    wordCount: number;
    hasReference: boolean;
  };
}

export interface DimensionScore {
  score: number; // 0 - 100
  confidence: number; // 0 - 1.0
  uncertainty: number; // e.g. 2.1%
  notes: string;
}

export interface IndependentEvaluationResult {
  promptId: string;
  maskedModelId: string; // e.g. "model_alpha", "model_beta"
  actualModelId?: string; // Revealed only during administrative unblinding
  dimensions: {
    objectPresence: DimensionScore;
    objectCount: DimensionScore;
    attributeAccuracy: DimensionScore;
    colorAccuracy: DimensionScore;
    spatialAccuracy: DimensionScore;
    referenceConsistency: DimensionScore;
    textAccuracy: DimensionScore;
    compositionAccuracy: DimensionScore;
    visualQuality: DimensionScore;
  };
  compositeScore: number; // Weighted composite
  confidenceInterval95: [number, number]; // [lower, upper]
  passedRequirementsCount: number;
  totalRequirementsCount: number;
  detectedFailures: FailureRecord[];
  timestamp: string;
}

export type FailureCategory =
  | "missing_objects"
  | "extra_objects"
  | "incorrect_quantities"
  | "incorrect_attributes"
  | "incorrect_colors"
  | "incorrect_spatial_relations"
  | "reference_mismatches"
  | "incorrect_text"
  | "composition_errors"
  | "unintended_visual_changes";

export type PipelineComponent =
  | "prompt_compiler"
  | "scene_graph_planner"
  | "model_router"
  | "spatial_controlnet"
  | "reference_vault"
  | "diffusion_backbone"
  | "evaluator";

export interface FailureRecord {
  id: string;
  promptId: string;
  category: FailureCategory;
  responsibleComponent: PipelineComponent;
  description: string;
  severity: "critical" | "major" | "minor";
  affectedRegionBBox?: [number, number, number, number]; // [x1, y1, x2, y2]
  suggestedCorrectionModel?: string;
}

export interface CorrectionAttemptResult {
  attemptId: string;
  promptId: string;
  originalCompositeScore: number;
  correctedCompositeScore: number;
  scoreDelta: number;
  success: boolean;
  unintendedChangesDetected: boolean;
  unmaskedPixelPreservationPct: number; // Target > 95%
  attemptsCount: number;
  latencyMs: number;
  additionalCostUsd: number;
  correctionModel: string;
  notes: string;
}

export interface GeneralizationProbeResult {
  probeId: string;
  prompt: string;
  probeType:
    | "unusual_combination"
    | "extreme_length"
    | "unfamiliar_terminology"
    | "contradictory_constraints"
    | "ambiguous_request";
  adherenceScore: number;
  handledGracefully: boolean;
  ambiguityClarificationRequested?: boolean;
  contradictionFlagged?: boolean;
  flaggedDetails?: string;
}

export interface ModelBlindPerformanceProfile {
  maskedId: string;
  revealedName: string;
  sampleCount: number;
  meanAdherence: number;
  stdDeviation: number;
  ci95: [number, number];
  categoryAverages: Record<PromptCategory, number>;
  dimensionAverages: {
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
  cpsgUsd: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  failureDistribution: Record<FailureCategory, number>;
}

export interface RealWorldValidationStats {
  totalPromptsInBenchmark: number;
  totalEvaluatedGenerations: number;
  overallAdherenceRate: number;
  overallConfidenceInterval95: [number, number];
  humanAgreementRate: number; // e.g. 94.6%
  categoryPerformance: Record<PromptCategory, { count: number; meanScore: number; ci95: [number, number] }>;
  modelRankings: ModelBlindPerformanceProfile[];
  topFailures: Array<{ category: FailureCategory; count: number; component: PipelineComponent }>;
  correctionMetrics: {
    totalCorrectionsEvaluated: number;
    correctionSuccessRate: number;
    averageUnmaskedPreservationPct: number;
    averageCorrectionLatencyMs: number;
    averageCorrectionCostUsd: number;
  };
  generalizationMetrics: {
    totalProbes: number;
    gracefulHandlingRate: number;
    contradictionDetectionRate: number;
    ambiguityClarificationRate: number;
  };
  timestamp: string;
}

