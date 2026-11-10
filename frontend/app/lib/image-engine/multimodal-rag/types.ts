/**
 * TATTVA AI - Multimodal RAG Image Generation Engine
 * Shared Types & Interfaces
 */

import type {
  AspectRatio,
  CompiledImagePrompt,
  ImageEngineResult,
  ImageProviderId,
  ImageQuality,
  ImageStyle,
  RequirementCategory,
} from "../types";

export type ConditioningMethod =
  | "text-guided"
  | "reference-guided"
  | "ip-adapter"
  | "controlnet-depth"
  | "controlnet-canny"
  | "controlnet-pose"
  | "inpainting"
  | "style-transfer";

export type VisualDomain =
  | "architecture"
  | "nature"
  | "character"
  | "product"
  | "vehicles"
  | "fantasy"
  | "cyberpunk"
  | "posters"
  | "interior"
  | "abstract"
  | "cinematic";

export interface VisualReferenceItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl?: string;
  domain: VisualDomain;
  style: ImageStyle;
  aspectRatio: AspectRatio;
  lighting: string;
  cameraAngle: string;
  composition: string;
  dominantColors: string[];
  objects: Array<{
    name: string;
    position: "foreground" | "midground" | "background" | "centered" | "distributed";
    attributes: string[];
  }>;
  conditioningTypes: ConditioningMethod[];
  embedding?: number[];
  source: string;
  license: "public-domain" | "cc-by" | "tattva-verified" | "authorized";
  safetyClassification: "safe";
  createdAt: string;
  tags: string[];
  qualityScore: number;
}

export interface StructuredSceneObject {
  name: string;
  position: "foreground" | "midground" | "background" | "centered" | "left" | "right";
  count?: number;
  color?: string;
  attributes?: string[];
  importance: "critical" | "secondary" | "ambient";
}

export interface StructuredTextElement {
  text: string;
  location: "top-center" | "center" | "bottom-center" | "embedded-sign" | "headline";
  style: string;
}

export interface ConditioningPlan {
  method: ConditioningMethod;
  referenceImage?: string;
  strength: number;
  preservedRegions?: string[];
  guidancePrompt?: string;
  styleBlendRatio?: number;
}

export interface StructuredScenePlan {
  subject: string;
  environment: string;
  objects: StructuredSceneObject[];
  lighting: string;
  style: ImageStyle;
  composition: string;
  cameraAngle: string;
  colorPalette: string[];
  textElements?: StructuredTextElement[];
  conditioningPlan: ConditioningPlan;
  retrievedReferencesUsed: string[];
  rationale: string;
}

export interface MultimodalRetrievalQuery {
  originalPrompt: string;
  subQueries: {
    subjectQuery: string;
    styleQuery: string;
    compositionQuery: string;
    lightingQuery: string;
  };
  expandedTerms: string[];
  filters?: {
    style?: ImageStyle;
    aspectRatio?: AspectRatio;
    domain?: VisualDomain;
  };
  referenceImage?: string;
}

export interface RetrievedReferenceMatch {
  item: VisualReferenceItem;
  semanticScore: number;
  visualScore: number;
  hybridScore: number;
  rerankScore: number;
  matchedAttributes: string[];
}

export interface MultimodalRetrievalResult {
  query: MultimodalRetrievalQuery;
  matches: RetrievedReferenceMatch[];
  aggregatedVisualContext: string;
  recommendedConditioning: ConditioningMethod;
  primaryReference?: VisualReferenceItem;
}

export interface QualityCategoryScore {
  score: number; // 0 - 100
  passed: boolean;
  notes: string;
}

export interface MultimodalQualityReport {
  overallScore: number; // 0 - 100
  verdict: "pass" | "borderline" | "fail";
  promptAdherence: QualityCategoryScore;
  objectAccuracy: QualityCategoryScore;
  colorFidelity: QualityCategoryScore;
  compositionQuality: QualityCategoryScore;
  styleFidelity: QualityCategoryScore;
  textCorrectness: QualityCategoryScore;
  detectedObjects: Array<{ name: string; count: number; location: string }>;
  missingObjects: string[];
  unwantedObjects: string[];
  detectedColors: string[];
  ocrDetectedText: string[];
  critique: string;
  correctionPlan?: {
    failedRequirement: string;
    suggestedFix: string;
    action: "adjust-prompt" | "inpaint" | "retrieve-different-ref" | "re-seed";
    newPromptAdditions?: string;
    newNegatives?: string;
  };
}

export interface MultimodalRAGOptions {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
  seed?: number;
  customNegative?: string;
  referenceImage?: string;
  conditioningMethod?: ConditioningMethod;
  provider?: ImageProviderId | "auto";
  quality?: ImageQuality;
  maxAttempts?: number;
  enableRAG?: boolean;
  maxRetrievedReferences?: number;
  userId?: string;
  onProgress?: (stage: string, detail?: string) => void;
}

export interface MultimodalRAGResult extends ImageEngineResult {
  rag: {
    enabled: boolean;
    retrievedReferences: VisualReferenceItem[];
    scenePlan: StructuredScenePlan;
    qualityReport: MultimodalQualityReport;
    correctionRounds: number;
    conditioningApplied: ConditioningMethod;
  };
}
