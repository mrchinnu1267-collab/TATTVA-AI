/**
 * TATTVA AI - Advanced Image Intelligence & Adherence Architecture Types
 * Defines comprehensive interfaces for Image Understanding, Adherence Evaluation,
 * Character Verification, and Intelligent Multi-Stage Correction.
 */

export type EvaluationStatus = "PASS" | "PARTIAL" | "FAIL";

export interface DetectedEntity {
  name: string;
  count: number;
  location?: string; // e.g. "foreground center", "left side", "background"
  attributes?: string[]; // e.g. ["blue", "metallic", "vintage"]
  confidence: number; // 0 to 1
}

export interface CharacterAppearanceAnalysis {
  isRecognizableCharacter: boolean;
  requestedCharacterName?: string;
  observedCharacterDescription: string;
  identityMatchStatus: "verified" | "generic_substitute" | "unrelated" | "not_applicable";
  definingFeaturesMatched: string[];
  definingFeaturesMissingOrWrong: string[];
  clothingAndCostume: string;
  confidence: number; // 0 to 1
  mismatchReason?: string;
}

export interface DominantColorInfo {
  name: string;
  hex?: string;
  prominence: "primary" | "secondary" | "accent";
}

export interface SpatialRelationshipObservation {
  subject: string;
  relation: string; // e.g. "left of", "under", "in front of", "next to"
  target: string;
  isObserved: boolean;
  confidence: number;
}

export interface VisibleTextObservation {
  text: string;
  location?: string;
  legibility: "crisp" | "distorted" | "partial" | "unreadable";
  confidence: number;
}

/**
 * 1. Comprehensive Multimodal Image Understanding Output (14 Dimensions)
 */
export interface ImageUnderstandingAnalysis {
  mainSubject: string;
  secondarySubjects: string[];
  objectsAndCounts: DetectedEntity[];
  characterAppearance: CharacterAppearanceAnalysis;
  clothingAndAccessories: string[];
  backgroundAndEnvironment: {
    setting: string;
    elements: string[];
    indoorOutdoor: "indoor" | "outdoor" | "ambiguous";
  };
  dominantColors: DominantColorInfo[];
  lighting: {
    type: string; // e.g. "Rembrandt", "golden hour", "neon fluorescent", "overcast soft"
    direction?: string;
    mood?: string;
  };
  cameraAngle: string; // e.g. "low-angle", "macro close-up", "eye-level wide", "birds-eye"
  composition: string; // e.g. "rule of thirds", "centered symmetry", "diagonal leading lines"
  artisticStyle: string; // e.g. "photorealistic DSLR", "oil painting", "anime / cel shaded", "3D CGI render"
  spatialRelationships: SpatialRelationshipObservation[];
  visibleText: VisibleTextObservation[];
  qualityIssues: string[]; // e.g. ["extra fingers on left hand", "artifacting near edges"]
  modelUsed: string;
  analysisTimestamp: string;
  isHeuristicFallback?: boolean;
}

/**
 * 2. Individual Category Adherence Item
 */
export interface CategoryEvaluation {
  categoryId:
    | "main_subject"
    | "object_presence"
    | "object_count"
    | "appearance_attributes"
    | "color_accuracy"
    | "spatial_accuracy"
    | "background_accuracy"
    | "style_accuracy"
    | "text_accuracy"
    | "overall_instruction";
  categoryLabel: string;
  expectedResult: string;
  observedResult: string;
  status: EvaluationStatus;
  visualEvidence: string;
  confidence: number; // 0 to 100
  score: number; // 0 to 100
  isCriticalFailure?: boolean;
}

/**
 * 3. Complete Image Intelligence & Adherence Report
 */
export interface ComprehensiveAdherenceReport {
  id: string;
  imageId: string;
  originalPrompt: string;
  overallScore: number; // 0 to 100
  overallVerdict: "PASS" | "NEEDS_IMPROVEMENT" | "FAIL";
  understanding: ImageUnderstandingAnalysis;
  categories: Record<string, CategoryEvaluation>;
  characterAssessment?: CharacterAppearanceAnalysis;
  missingRequirements: string[];
  qualityIssues: string[];
  improvementRecommendations: string[];
  evaluatedAt: string;
  executionTimeMs: number;
}

/**
 * 4. Targeted Correction Workflow Models
 */
export interface TargetedEditingInstruction {
  action: "inpaint" | "replace_background" | "add_object" | "remove_object" | "adjust_color" | "full_edit";
  targetDescription: string;
  promptDirective: string;
  preserveElements: string[];
  failedRequirementsAddressed: string[];
  maskHint?: string; // e.g. "top right", "background", "foreground center"
}

export interface IntelligentCorrectionResult {
  originalImage: string;
  revisedImage: string;
  attemptNumber: number;
  maxAttempts: number;
  editingInstruction: TargetedEditingInstruction;
  postCorrectionReport: ComprehensiveAdherenceReport;
  improvementDelta: number; // e.g. +18 points
  satisfiedRequirements: string[];
  remainingUnsatisfiedRequirements: string[];
  status: "improved" | "partial" | "unsuccessful";
}

