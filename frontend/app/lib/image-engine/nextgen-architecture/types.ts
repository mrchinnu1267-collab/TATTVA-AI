/**
 * TATTVA AI - Phase S: Next-Generation AI Image Generation Architecture Types
 * Defines data structures for Multimodal Scene Planning, Capability-Based Model Intelligence,
 * Hierarchical Generation, Genuine Spatial & Reference Conditioning, Multi-Evaluator Consensus,
 * Targeted Surgical Correction, and the 300-Prompt Comparative Benchmark.
 */

import { ImageProviderId } from "../types";

// =============================================================================
// 1. MULTIMODAL UNDERSTANDING & SCENE PLANNING
// =============================================================================

export type PerspectiveAngle =
  | "eye-level"
  | "low-angle"
  | "high-angle"
  | "drone-top-down"
  | "macro-close-up"
  | "ultra-wide"
  | "dutch-angle"
  | "isometric";

export type LightingStyle =
  | "golden-hour"
  | "volumetric-cinematic"
  | "studio-softbox"
  | "chiaroscuro-high-contrast"
  | "natural-diffuse"
  | "cyberpunk-neon"
  | "dramatic-backlit"
  | "overcast-moody";

export type CompositionRule =
  | "rule-of-thirds"
  | "center-symmetrical"
  | "golden-ratio"
  | "diagonal-leading-lines"
  | "framed-within-frame"
  | "depth-layered";

export type LayerDepth = "foreground" | "midground" | "background";

export interface BoundingBox2D {
  xmin: number; // 0.0 - 1.0 (normalized)
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface PlannedObject {
  id: string;
  name: string;
  category: "subject" | "secondary" | "prop" | "environment" | "text";
  quantity: number;
  attributes: {
    color?: string;
    material?: string;
    shape?: string;
    clothing?: string;
    state?: string;
    pose?: string;
    texture?: string;
  };
  boundingBox: BoundingBox2D;
  layer: LayerDepth;
  isMandatory: boolean;
  priority: number; // 1 (highest) - 5 (lowest)
}

export interface SpatialRelationshipConstraint {
  id: string;
  sourceObjectId: string;
  targetObjectId: string;
  relation:
  | "left_of"
  | "right_of"
  | "above"
  | "below"
  | "inside"
  | "behind"
  | "in_front_of"
  | "adjacent_to"
  | "holding"
  | "wearing";
  confidence: number;
  tolerance: number; // Geometric tolerance percentage (e.g. 0.05)
}

export interface AmbiguityClarification {
  id: string;
  field: string;
  issue: string;
  suggestedDefaults: string[];
  requiresUserAction: boolean;
}

export interface StructuredScenePlan {
  id: string;
  rawPrompt: string;
  sceneTitle: string;
  environmentDescription: string;
  objects: PlannedObject[];
  relationships: SpatialRelationshipConstraint[];
  camera: {
    perspective: PerspectiveAngle;
    focalLengthMm?: number;
    depthOfField: "shallow" | "medium" | "deep";
  };
  lighting: {
    primaryStyle: LightingStyle;
    direction: "front" | "side" | "back" | "overhead" | "ambient";
    colorTemperatureK: number;
  };
  composition: {
    rule: CompositionRule;
    aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "21:9";
  };
  clarifications: AmbiguityClarification[];
  isValid: boolean;
  validationScore: number; // 0.0 - 1.0
  validationNotes: string[];
}

// =============================================================================
// 2. REFERENCE INTELLIGENCE SPECIFICATIONS
// =============================================================================

export type ReferenceRole = "subject_dna" | "composition_pose" | "style_transfer" | "background_environment";

export type ReferenceConstraintMode =
  | "preserve_subject"
  | "preserve_composition"
  | "change_only_background"
  | "replace_specific_object"
  | "maintain_color_palette"
  | "selective_dna_transfer";

export interface ReferenceInputSpec {
  id: string;
  imageUrl: string;
  role: ReferenceRole;
  constraintMode: ReferenceConstraintMode;
  targetRegionBBox?: BoundingBox2D;
  immutableZone?: boolean;
  fidelityThreshold: number; // 0.0 - 1.0 (default 0.85)
}

// =============================================================================
// 3. CAPABILITY-BASED MODEL INTELLIGENCE MATRIX
// =============================================================================

export interface ModelCapabilityDescriptor {
  modelId: string;
  displayName: string;
  provider: ImageProviderId;
  capabilities: {
    textToImage: boolean;
    imageToImage: boolean;
    referenceConditioning: boolean;
    inpainting: boolean;
    outpainting: boolean;
    controlNet: {
      canny: boolean;
      depth: boolean;
      openpose: boolean;
      segmentation: boolean;
      scribble: boolean;
    };
    textRendering: boolean;
    multiSubjectConsistency: boolean;
    spatialAdherenceRank: number; // 1 (best) - 10
  };
  specifications: {
    maxResolution: number; // e.g. 2048
    minVramGb: number; // e.g. 3.2 for INT4, 11.5 for FP16
    localInferenceSupported: boolean;
    cloudFallbackRequired: boolean;
    typicalLatencyMs: number;
    costPerMegapixelUsd: number;
  };
  historicalAccuracyScore: number; // 0.0 - 1.0 based on real benchmarks
  isAvailable: boolean;
}

export interface ModelSelectionDecision {
  selectedModel: ModelCapabilityDescriptor;
  fallbackModel?: ModelCapabilityDescriptor;
  matchedRequirements: string[];
  selectionReason: string;
  executionMode: "local_quantized" | "cloud_serverless";
  estimatedLatencyMs: number;
  estimatedCostUsd: number;
}

// =============================================================================
// 4. HIERARCHICAL GENERATION STAGES
// =============================================================================

export type HierarchicalStageName =
  | "scene_composition"
  | "main_subject_generation"
  | "secondary_objects_generation"
  | "background_environment"
  | "detail_refinement"
  | "image_integration"
  | "independent_evaluation";

export interface HierarchicalStageResult {
  stageName: HierarchicalStageName;
  status: "executed" | "bypassed" | "failed";
  durationMs: number;
  computeCostUsd: number;
  cumulativeAdherence: number; // 0.0 - 1.0
  stageArtifactUrl?: string;
  notes: string;
}

export interface HierarchicalPipelineExecution {
  id: string;
  scenePlanId: string;
  stages: HierarchicalStageResult[];
  totalDurationMs: number;
  totalCostUsd: number;
  finalAdherenceScore: number;
  bypassedStagesCount: number;
}

// =============================================================================
// 5. INDEPENDENT MULTI-EVALUATOR CONSENSUS
// =============================================================================

export interface MetricEvaluationDetail {
  metric:
  | "object_presence"
  | "exact_quantities"
  | "attributes_colors"
  | "spatial_relationships"
  | "reference_consistency"
  | "text_accuracy"
  | "composition"
  | "visual_quality";
  score: number; // 0.0 - 1.0
  evaluatorSource: "sam2_segmentation" | "vlm_semantic" | "ocr_engine" | "geometric_iou" | "clip_aesthetic";
  confidence: number; // 0.0 - 1.0
  passed: boolean;
  failureReason?: string;
  affectedBBox?: BoundingBox2D;
}

export interface MultiEvaluatorConsensusResult {
  evaluationId: string;
  overallScore: number; // 0.0 - 1.0
  metrics: MetricEvaluationDetail[];
  consensusConfidence: number; // 0.0 - 1.0
  uncertaintyMargin: number; // e.g. 0.018 (+- 1.8%)
  passedEvaluation: boolean;
  failedRequirements: string[];
  suggestedCorrections: {
    affectedBBox: BoundingBox2D;
    issue: string;
    correctionPrompt: string;
    targetModelCategory: "inpainting" | "detail_refiner" | "text_editor";
  }[];
}

// =============================================================================
// 6. TARGETED SURGICAL CORRECTION
// =============================================================================

export interface TargetedCorrectionAttempt {
  attemptIndex: number;
  targetBBox: BoundingBox2D;
  failedRequirement: string;
  correctionPrompt: string;
  editingModelUsed: string;
  unmaskedPreservationRatio: number; // e.g. 0.978 (>= 0.95 required)
  preCorrectionScore: number;
  postCorrectionScore: number;
  improvementDelta: number;
  isSuccessful: boolean;
  correctedImageUrl: string;
}

export interface TargetedCorrectionReport {
  id: string;
  totalAttempts: number;
  maxAttemptsAllowed: number;
  finalStatus: "fully_corrected" | "partially_improved" | "aborted_no_improvement";
  unmaskedPixelsPreservedAverage: number;
  initialOverallScore: number;
  finalOverallScore: number;
  netAdherenceGain: number;
  attempts: TargetedCorrectionAttempt[];
}

// =============================================================================
// 7. COMPLETE PHASE S NEXT-GEN PIPELINE
// =============================================================================

export interface NextGenPipelineRequest {
  prompt: string;
  negativePrompt?: string;
  referenceImages?: ReferenceInputSpec[];
  spatialGuidance?: {
    useBoundingBoxConditioning?: boolean;
    useDepthConditioning?: boolean;
    useSegmentationConditioning?: boolean;
  };
  hierarchicalGeneration?: boolean;
  maxCorrectionAttempts?: number; // default 2, max 3
  vramCeilingGb?: number; // default 3.6 for RTX 3050
}

export interface NextGenPipelineResponse {
  jobId: string;
  rawPrompt: string;
  scenePlan: StructuredScenePlan;
  modelSelection: ModelSelectionDecision;
  hierarchicalStages?: HierarchicalStageResult[];
  initialImageUrl: string;
  finalImageUrl: string;
  evaluation: MultiEvaluatorConsensusResult;
  correctionReport?: TargetedCorrectionReport;
  totalLatencyMs: number;
  totalCostUsd: number;
  finalAdherenceScore: number;
  accuracyLiftOverBaseline: number;
}

// =============================================================================
// 8. 300-PROMPT COMPARATIVE BENCHMARK TYPES
// =============================================================================

export type BenchmarkCategory =
  | "simple_objects"
  | "complex_compositions"
  | "exact_quantities"
  | "spatial_relations"
  | "reference_style_consistency"
  | "in_image_text"
  | "photorealism_lighting"
  | "surgical_editing";

export type ArchitectureVariant =
  | "A_single_pass_baseline"
  | "B_scene_planned"
  | "C_spatially_conditioned"
  | "D_reference_conditioned"
  | "E_multi_stage"
  | "F_nextgen_verified_pipeline";

export interface BenchmarkPromptSpec {
  id: string;
  category: BenchmarkCategory;
  prompt: string;
  expectedEntities: { name: string; minCount: number; attributes: string[] }[];
  expectedSpatialRelations?: { source: string; target: string; relation: string }[];
  expectedText?: string;
  referenceRequired?: boolean;
}

export interface ArchitectureBenchmarkMetric {
  architecture: ArchitectureVariant;
  displayName: string;
  objectPresenceRate: number; // 0.0 - 1.0
  objectCountAccuracy: number;
  attributeAccuracy: number;
  spatialAccuracy: number;
  referenceConsistencyRate: number;
  textAccuracyRate: number;
  compositionScore: number;
  visualQualityScore: number;
  overallAdherence: number;
  averageLatencyMs: number;
  averageCostUsd: number;
  relativeImprovementOverBaseline: number;
}

export interface ComparativeBenchmarkSummary300 {
  totalPrompts: number;
  evaluatedAt: string;
  categories: {
    category: BenchmarkCategory;
    promptCount: number;
  }[];
  architectureResults: ArchitectureBenchmarkMetric[];
  highestAccuracyArchitecture: ArchitectureVariant;
  bestValueArchitecture: ArchitectureVariant;
  keyFindings: string[];
}

export type { AdaptivePolicyConfig, RollbackCheckpoint } from "./adaptive-optimizer";
