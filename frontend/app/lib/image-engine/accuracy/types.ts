/**
 * TATTVA AI - Prompt Accuracy & Multi-Stage Generation System Types
 * Core interfaces for Structured Generation Specifications, Requirement Checklists,
 * Intelligent Error Detection, and Targeted Inpainting Corrections.
 */

import { ImageProviderId, ImageQuality, AspectRatio } from "../types";

export type AccuracyRequirementCategory =
  | "object_presence"
  | "exact_quantity"
  | "attribute"
  | "color"
  | "shape"
  | "material"
  | "clothing"
  | "spatial_relationship"
  | "text"
  | "background"
  | "lighting"
  | "style"
  | "restriction"
  | "reference";

export type RequirementStatus = "pass" | "fail" | "uncertain";

export interface ExactQuantityItem {
  object: string;
  count: number;
  raw: string;
}

export interface ObjectAttributeItem {
  object: string;
  attributes: string[];
}

export interface ColorRequirementItem {
  object?: string;
  color: string;
  hex?: string;
}

export interface SpatialRelationshipItem {
  subject: string;
  relation:
    | "left_of"
    | "right_of"
    | "behind"
    | "in_front_of"
    | "above"
    | "below"
    | "center"
    | "foreground"
    | "background"
    | "horizontal_array";
  target?: string;
  raw: string;
}

export interface TextRequirementItem {
  exactText: string;
  caseSensitive: boolean;
  placement?: string;
}

export interface ReferenceRequirementItem {
  source: "uploaded_image";
  preserve: string[];
  modify: string[];
}

/**
 * Structured generation specification extracted from user prompt.
 */
export interface StructuredGenerationSpec {
  originalPrompt: string;
  mainSubject: string;
  secondarySubjects: string[];
  exactQuantities: ExactQuantityItem[];
  objectCharacteristics: ObjectAttributeItem[];
  colors: ColorRequirementItem[];
  shapes: Array<{ object?: string; shape: string }>;
  materials: Array<{ object?: string; material: string }>;
  clothingAndAccessories: Array<{ subject?: string; item: string }>;
  background: string;
  environment: string;
  lighting: string;
  cameraAngle: string;
  perspective: string;
  composition: string;
  spatialRelationships: SpatialRelationshipItem[];
  textRequirements: TextRequirementItem[];
  artisticStyle: string;
  explicitRestrictions: string[];
  referenceRequirements: ReferenceRequirementItem[];
}

/**
 * An individual checkable requirement item.
 */
export interface RequirementValidationItem {
  id: string;
  category: AccuracyRequirementCategory;
  statement: string;
  critical: boolean;
  status: RequirementStatus;
  confidence: number; // 0.0 to 1.0
  detectedEvidence: string;
  suggestedCorrection?: string;
  affectedRegionBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in 0-1000 scale
}

/**
 * Fine-grained accuracy scorecard measuring each dimension independently.
 */
export interface AccuracyScorecard {
  overallAccuracy: number; // 0 to 100
  objectPresenceScore: number; // 0 to 100
  objectQuantityScore: number; // 0 to 100
  attributeAccuracyScore: number; // 0 to 100
  colorAccuracyScore: number; // 0 to 100
  spatialAccuracyScore: number; // 0 to 100
  textAccuracyScore: number; // 0 to 100
  referenceFidelityScore: number; // 0 to 100
  totalRequirementsCount: number;
  passedCount: number;
  failedCount: number;
  uncertainCount: number;
}

/**
 * Record of an automated surgical correction attempt.
 */
export interface TargetedCorrectionRecord {
  attempt: number;
  failedRequirementId: string;
  requirementStatement: string;
  affectedRegion: string;
  correctionPrompt: string;
  modelUsed: string;
  resultImage: string;
  improved: boolean;
  scoreBefore: number;
  scoreAfter: number;
}

/**
 * End-to-end multi-stage accuracy generation result.
 */
export interface MultiStageAccuracyResult {
  finalImage: string;
  initialImage?: string;
  originalPrompt: string;
  structuredSpec: StructuredGenerationSpec;
  requirementsChecklist: RequirementValidationItem[];
  initialScorecard: AccuracyScorecard;
  finalScorecard: AccuracyScorecard;
  correctionsApplied: TargetedCorrectionRecord[];
  totalLatencyMs: number;
  estimatedCostUsd: number;
  providerUsed: ImageProviderId;
  modelUsed: string;
  isAccurate: boolean;
}
