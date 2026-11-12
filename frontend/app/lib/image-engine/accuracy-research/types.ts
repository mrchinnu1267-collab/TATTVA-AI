/**
 * TATTVA AI - Phase R: Advanced Image Accuracy Research & Next-Generation Techniques Types
 * Defines schemas for Scene Graphs, Spatial Conditioning Maps, Reference Preservation Constraints,
 * Multi-Stage Pipeline Architecture, Multi-Evaluator Consensus, and Comparative Benchmarking.
 */

import { ImageProviderId } from "../types";

// =============================================================================
// 1. SCENE GRAPH REPRESENTATION TYPES
// =============================================================================

export type RelationshipType =
  | "left_of"
  | "right_of"
  | "above"
  | "below"
  | "inside"
  | "behind"
  | "in_front_of"
  | "adjacent_to"
  | "on_top_of"
  | "wearing"
  | "holding"
  | "composed_of";

export interface EntityAttribute {
  category: "color" | "material" | "shape" | "texture" | "state" | "clothing" | "quantity";
  name: string;
  value: string;
  confidence: number;
}

export interface SceneNode {
  id: string;
  name: string;
  entityType: "subject" | "secondary_object" | "background" | "environment" | "lighting" | "camera";
  quantity: number;
  attributes: EntityAttribute[];
  boundingBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in 0-1000 scale
  layerDepth: "foreground" | "midground" | "background";
}

export interface SceneEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationship: RelationshipType;
  confidence: number;
  spatialTolerancePx?: number;
}

export interface SceneGraph {
  id: string;
  rawPrompt: string;
  rootSceneTitle: string;
  nodes: SceneNode[];
  edges: SceneEdge[];
  cameraSettings: {
    lens: string;
    angle: string;
    framing: string;
  };
  lightingPlan: {
    primaryLight: string;
    ambientLight: string;
    direction: string;
  };
  isGraphConsistent: boolean;
  detectedContradictions: string[];
}

// =============================================================================
// 2. ADVANCED SPATIAL CONDITIONING TYPES
// =============================================================================

export type ConditioningMapType = "canny" | "depth" | "segmentation" | "bounding_box" | "pose";

export interface SpatialConditioningSpec {
  conditioningType: ConditioningMapType;
  resolution: { width: number; height: number };
  conditioningStrength: number; // 0.0 to 1.0
  guidanceMapDataUri?: string;
  detectedFeaturesCount: number;
  targetModel: "flux-schnell" | "sdxl-controlnet" | "gemini-flash" | "local-cuda-diffusion";
  isHardwareCompatible: boolean;
}

// =============================================================================
// 3. ADVANCED REFERENCE PRESERVATION TYPES
// =============================================================================

export interface ReferencePreservationSpec {
  referenceImageDataUri: string;
  subjectIdentity: string;
  immutableAttributes: string[]; // e.g. ["facial structure", "eye color", "brand logo"]
  mutableAttributes: string[]; // e.g. ["clothing color", "hair length", "pose"]
  elementsToRemove: string[]; // e.g. ["sunglasses", "busy background"]
  elementsToAdd: string[]; // e.g. ["winter coat", "falling snow"]
  visualDnaEmbeddingWeight: number; // 0.0 to 1.0
  expectedFidelityThreshold: number; // e.g. 85.0%
}

// =============================================================================
// 4. MULTI-STAGE GENERATION PIPELINE TYPES
// =============================================================================

export type PipelineStageName =
  | "semantic_understanding"
  | "scene_graph_generation"
  | "composition_planning"
  | "spatial_conditioning"
  | "model_selection"
  | "image_generation"
  | "independent_evaluation"
  | "targeted_correction"
  | "final_verification";

export interface PipelineStageMetric {
  stage: PipelineStageName;
  durationMs: number;
  costUsd: number;
  accuracyGainPercent: number;
  status: "completed" | "skipped" | "failed";
  notes?: string;
}

export interface MultiStagePipelineResult {
  executionId: string;
  originalPrompt: string;
  sceneGraph: SceneGraph;
  spatialConditioning: SpatialConditioningSpec;
  selectedModel: string;
  selectedProvider: ImageProviderId;
  baseImage: string;
  finalImage: string;
  preCorrectionAccuracy: number;
  postCorrectionAccuracy: number;
  correctionsAppliedCount: number;
  unmaskedPixelsPreservedPercent: number;
  stageMetrics: PipelineStageMetric[];
  totalLatencyMs: number;
  totalCostUsd: number;
}

// =============================================================================
// 5. MULTI-EVALUATOR CONSENSUS TYPES
// =============================================================================

export interface EvaluatorScoreResult {
  evaluatorName: "sam2_instance_seg" | "ocr_levenshtein" | "geometric_iou" | "vlm_attribute_check" | "reference_cosine_distance";
  score: number; // 0 to 100
  confidence: number; // 0.0 to 1.0
  verdict: "pass" | "borderline" | "fail";
  details: string;
}

export interface MultiEvaluatorConsensus {
  overallScore: number;
  evaluatorAgreementRatio: number; // 0.0 to 1.0
  uncertaintyMargin: number; // e.g. +/- 3.2%
  isConsensusHighConfidence: boolean;
  individualEvaluations: EvaluatorScoreResult[];
}

// =============================================================================
// 6. EXPERIMENTAL BENCHMARKING (200 PROMPTS) TYPES
// =============================================================================

export type PipelineArchitectureType =
  | "pipeline_a_baseline"
  | "pipeline_b_scene_graph"
  | "pipeline_c_spatial_conditioned"
  | "pipeline_d_reference_conditioned"
  | "pipeline_e_multistage_verified";

export interface ArchitectureBenchmarkSummary {
  architectureType: PipelineArchitectureType;
  architectureName: string;
  sampleCount: number;
  objectPresenceAccuracy: number;
  objectCountAccuracy: number;
  attributeAccuracy: number;
  spatialAccuracy: number;
  referenceFidelity: number;
  textAccuracy: number;
  visualQualityScore: number;
  overallAdherenceScore: number;
  averageLatencyMs: number;
  averageCostUsd: number;
  failureRatePercent: number;
}

export interface Benchmark200ComparisonReport {
  timestamp: string;
  totalPromptsEvaluated: number;
  catalogVersion: string;
  architectures: ArchitectureBenchmarkSummary[];
  topPerformingArchitecture: PipelineArchitectureType;
  accuracyLiftOverBaseline: number; // e.g. +7.8%
}

// =============================================================================
// 7. HARDWARE SAFETY & VRAM GUARDRAILS (RTX 3050 - 4GB)
// =============================================================================

export interface VRAMAllocationSpec {
  modelName: string;
  architectureFamily: "diffusion_transformer" | "flow_matching" | "rectified_flow" | "latent_diffusion";
  precision: "fp32" | "fp16" | "fp8_e4m3" | "int4_quantized";
  estimatedVRAMBytes: number;
  safeForRTX3050_4GB: boolean;
  recommendedExecutionMode: "local_cuda" | "cloud_serverless" | "cpu_offload";
  offloadLayersCount: number;
}

