/**
 * TATTVA AI - Advanced Visual Evaluation, Quality Scoring & Intelligent Refinement Types (Phase E)
 */

import { ImageProviderId, AspectRatio, ImageQuality, ImageRequirement } from "../types";
import { SpatialBoundingBox, SceneDepthLayer } from "../spatial-control/types";

export interface DetectedObject {
  id: string;
  label: string;
  confidence: number; // 0.0 - 1.0
  box: { x: number; y: number; width: number; height: number }; // normalized [0, 1]
  layer: SceneDepthLayer;
  isMainSubject: boolean;
  attributes: {
    color?: string;
    material?: string;
    action?: string;
    clothing?: string;
  };
  matchedRequirementId?: string;
}

export interface SegmentedObject {
  objectId: string;
  label: string;
  maskDataUri?: string; // Binary/alpha mask
  areaFraction: number; // 0.0 - 1.0 (fraction of image area)
  contourComplexity: number; // 0.0 - 1.0
  isolationQuality: number; // 0 - 100
  depthLayer: SceneDepthLayer;
}

export interface AttributeEvaluation {
  attributeName: string;
  targetValue: string;
  observedValue: string;
  matched: boolean;
  confidence: number; // 0 - 100
  notes?: string;
}

export interface TextOcrResult {
  detectedText: Array<{
    text: string;
    box?: { x: number; y: number; width: number; height: number };
    confidence: number;
  }>;
  requiredPhrases: Array<{
    phrase: string;
    found: boolean;
    levenshteinSimilarity: number; // 0.0 - 1.0
    spellingAccurate: boolean;
    note?: string;
  }>;
  unexpectedTextDetected: boolean;
  overallTextAccuracy: number; // 0 - 100
}

export interface ReferenceComparisonResult {
  referenceProvided: boolean;
  subjectConsistencyScore: number; // 0 - 100
  compositionSimilarityScore: number; // 0 - 100
  colorPaletteSimilarityScore: number; // 0 - 100
  preservedRegionsScore: number; // 0 - 100
  requestedModificationsAchievedScore: number; // 0 - 100
  intendedChanges: string[];
  unintendedDeviations: string[];
}

export interface QualityScorecard {
  overallScore: number; // 0 - 100
  verdict: "pass" | "borderline" | "fail";
  confidenceScore: number; // 0 - 100 (kept strictly separate from pass/fail verdict)

  // 8 Transparent Domain Sub-Scores (0 - 100)
  promptAdherence: number;
  objectPresence: number;
  attributeAccuracy: number;
  spatialAccuracy: number;
  referenceFidelity: number;
  textAccuracy: number;
  visualQuality: number;
  unwantedObjectFreedom: number;

  metricsSummary: {
    totalRequirementsCount: number;
    passedRequirementsCount: number;
    missingObjectsCount: number;
    unrequestedObjectsCount: number;
  };
}

export interface RefinementAction {
  type: "inpaint_region" | "regenerate_with_negative" | "prompt_reweight" | "accept_as_is";
  rationale: string;
  targetObject?: string;
  inpaintBoundingBox?: { x: number; y: number; width: number; height: number };
  revisedPrompt?: string;
  recommendedNegative?: string;
  priority: "critical" | "high" | "moderate" | "none";
}

export interface VisualEvaluationResult {
  scorecard: QualityScorecard;
  detectedObjects: DetectedObject[];
  missingObjects: string[];
  unrequestedObjects: string[];
  segmentedObjects: SegmentedObject[];
  attributeEvaluations: AttributeEvaluation[];
  spatialScore: number;
  spatialDeviations: string[];
  referenceComparison?: ReferenceComparisonResult;
  ocrResult: TextOcrResult;
  refinementRecommendation: RefinementAction;
  evaluationMethod: "vision_llm_grounding" | "heuristic_fallback";
  latencyMs: number;
}

