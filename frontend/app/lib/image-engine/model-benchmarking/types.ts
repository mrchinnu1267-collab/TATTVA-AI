/**
 * TATTVA AI - Advanced Image Accuracy Benchmarking & Model Intelligence Types (Phase J)
 * Defines core interfaces for the 500-prompt benchmark dataset, independent multi-metric
 * evaluation, model capability profiling, Pareto cost-accuracy optimization, and continuous auditing.
 */

import { ImageProviderId, ImageQuality, AspectRatio } from "../types";
import { ImageWorkflowType } from "../multi-model-router/types";

export type BenchmarkCategory =
  | "object_accuracy"
  | "attribute_accuracy"
  | "spatial_accuracy"
  | "composition"
  | "reference_accuracy"
  | "text_accuracy"
  | "visual_generation";

export interface BenchmarkPrompt500 {
  id: number;
  category: BenchmarkCategory;
  subcategory: string;
  workflow: ImageWorkflowType;
  prompt: string;
  expectedObjects?: string[];
  expectedCount?: number;
  expectedCountObject?: string;
  expectedColors?: Array<{ object: string; color: string }>;
  expectedMaterials?: Array<{ object: string; material: string }>;
  expectedSpatialRelations?: Array<{ subject: string; relation: "left_of" | "right_of" | "above" | "below" | "in_front_of" | "behind"; target: string }>;
  expectedText?: string;
  expectedStyle?: string;
  expectedComposition?: {
    cameraAngle?: string;
    framing?: string;
    lighting?: string;
  };
  referenceImage?: string;
  preservationGoal?: string;
}

export interface ModelDimensionScores {
  objectAccuracy: number; // 0 - 100
  countFidelity: number; // 0 - 100
  attributeAccuracy: number; // 0 - 100
  spatialAccuracy: number; // 0 - 100
  compositionAccuracy: number; // 0 - 100
  referenceConsistency: number; // 0 - 100
  textAccuracy: number; // 0 - 100
  visualQuality: number; // 0 - 100
  overallScore: number; // 0 - 100
}

export interface ModelBenchmarkProfile {
  modelId: string;
  name: string;
  exactModelIdentifier: string;
  family: "flux" | "stable_diffusion" | "gemini" | "openai" | "local_diffusers";
  providerId: ImageProviderId;
  capabilities: {
    textToImage: boolean;
    imageToImage: boolean;
    referenceImage: boolean;
    inpainting: boolean;
    outpainting: boolean;
    controlNet: boolean;
    spatialControl: boolean;
    typography: boolean;
  };
  maxResolution: { width: number; height: number };
  costPerMegapixelUsd: number;
  averageLatencyMs: number;
  failureRate: number; // 0.0 - 1.0
  isAvailable: boolean;
  availabilityReason?: string;
  sampleCount: number;
  dimensionScores: ModelDimensionScores;
  isEmpirical: boolean; // true if backed by actual benchmark runs
  lastAuditedAt: string;
}

export interface ModelRankingRecord {
  rank: number;
  modelId: string;
  modelName: string;
  providerId: ImageProviderId;
  overallScore: number;
  dimensionScores: ModelDimensionScores;
  averageLatencyMs: number;
  costPerSuccessfulGenUsd: number;
  failureRate: number;
  sampleCount: number;
  isEmpirical: boolean;
  paretoTier: "optimal" | "balanced" | "economy" | "suboptimal";
  recommendedWorkflows: ImageWorkflowType[];
}

export interface BenchmarkEvaluationResult {
  promptId: number;
  category: BenchmarkCategory;
  modelId: string;
  providerId: ImageProviderId;
  passed: boolean;
  overallAccuracy: number; // 0 - 100
  dimensionScores: Partial<ModelDimensionScores>;
  detectedEvidence: string[];
  failedRequirements: string[];
  latencyMs: number;
  costUsd: number;
  evaluatedAt: string;
}

export interface HistoricalBenchmarkRun {
  runId: string;
  timestamp: string;
  modelId: string;
  modelVersion: string;
  totalPromptsEvaluated: number;
  overallScore: number;
  categoryBreakdowns: Record<BenchmarkCategory, number>;
  averageLatencyMs: number;
  regressionDetected: boolean;
  regressionDetails?: string;
  notes?: string;
}

export interface FailedBenchmarkCase {
  promptId: number;
  prompt: string;
  category: BenchmarkCategory;
  modelId: string;
  failedRequirement: string;
  expectedValue: string;
  detectedValue: string;
  suggestedAction: "prompt_refinement" | "model_fallback" | "inpainting_correction";
  recordedAt: string;
}

export interface BenchmarkRunSummary {
  runId: string;
  totalPrompts: number;
  modelsAudited: string[];
  startTime: string;
  endTime: string;
  durationMs: number;
  averageAccuracy: number;
  topRankedModel: string;
  evaluations: BenchmarkEvaluationResult[];
  rankings: ModelRankingRecord[];
  failedCases: FailedBenchmarkCase[];
}

