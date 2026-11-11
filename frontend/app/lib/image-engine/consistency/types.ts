/**
 * TATTVA AI - Advanced Character and Subject Consistency Types (Phase I)
 * Defines structured schemas for Subject Profiles, Reference Images, Consistency Conditioning,
 * Story Generation, Multi-Metric Evaluation, and Targeted Correction.
 */

import { ImageProviderId, ImageQuality, AspectRatio, ImageStyle } from "../types";

export type SubjectCategory =
  | "fictional_character"
  | "original_ai_character"
  | "user_character_design"
  | "product"
  | "vehicle"
  | "object"
  | "brand_mascot"
  | "custom_illustration"
  | "real_person";

export type ReferenceViewType =
  | "primary"
  | "front"
  | "side"
  | "three_quarter"
  | "back"
  | "close_up"
  | "action"
  | "alternate";

export interface SubjectReferenceImage {
  id: string;
  subjectId: string;
  imageUrl: string; // Data URI, Supabase Storage URL, or vault path
  viewType: ReferenceViewType;
  isPrimary: boolean;
  description?: string;
  width?: number;
  height?: number;
  colorPalette?: string[];
  embeddingVector?: number[]; // Normalized visual embedding
  uploadedAt: string;
}

export interface SubjectFacialCharacteristics {
  faceShape?: string;
  eyeColor?: string;
  eyeShape?: string;
  eyebrowStyle?: string;
  noseShape?: string;
  lipShape?: string;
  facialHair?: string;
  skinTone?: string;
  distinctiveFeatures?: string[]; // e.g., ["scar over left brow", "dimples", "freckles"]
}

export interface SubjectPhysicalCharacteristics {
  speciesOrType: string; // e.g. "human", "cybernetic droid", "anthropomorphic fox", "ceramic mug"
  genderPresentation?: string;
  ageGroup?: string; // e.g. "child", "young adult", "middle-aged", "ageless"
  hairColor?: string;
  hairStyle?: string;
  hairLength?: string;
  bodyBuild?: string; // e.g. "athletic", "slender", "stocky", "compact"
  heightEstimate?: string;
  primaryClothing?: string; // e.g. "crimson pilot jacket with gold trim and white utility pants"
  colorScheme: string[]; // e.g. ["#E63946", "#F1FAEE", "#1D3557"]
  signatureAccessories: string[]; // e.g. ["brass aviator goggles", "silver pendant necklace"]
  distinguishingMarkings: string[]; // e.g. ["neon blue circuit tattoo on right forearm"]
}

export interface SubjectStyleCharacteristics {
  artisticStyle: string; // e.g. "Studio Ghibli anime", "Photorealistic cinematic", "3D Pixar render", "Vector graphic"
  renderingTechnique?: string;
  lineWeight?: "delicate" | "medium" | "bold" | "lineless";
  colorPalette?: string[];
  textureDetail?: "smooth" | "painterly" | "ultra_detailed" | "matte";
}

export interface SubjectIdentityProfile {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  category: SubjectCategory;
  description: string;
  physical: SubjectPhysicalCharacteristics;
  facial?: SubjectFacialCharacteristics;
  style: SubjectStyleCharacteristics;
  importantDetails: string[];
  prohibitedChanges: string[]; // Details that must NEVER drift (e.g., "do not change eye color from amber")
  referenceImages: SubjectReferenceImage[];
  primaryReferenceId?: string;
  userConsentProvided?: boolean; // MANDATORY: required for real_person category
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PoseExpressionRequest {
  pose?: string; // e.g., "sitting with crossed legs", "running forward dynamically", "arms crossed confidently"
  expression?: string; // e.g., "warm reassuring smile", "intense focused stare", "surprised gasping"
  cameraAngle?: string; // e.g., "low-angle dramatic shot", "wide establishing shot", "extreme close-up profile"
  clothing?: string; // override clothing while keeping subject intact (e.g. "formal black tuxedo")
  environment?: string; // e.g., "rainy neon-lit Neo-Tokyo alleyway", "sunlit meadow with wildflowers"
  lighting?: string; // e.g., "golden hour rim light", "harsh fluorescent lighting", "cinematic volumetric rays"
  background?: string;
  artisticStyle?: string;
}

export interface ConsistencyEvaluationScore {
  overallScore: number; // 0.0 to 1.0 (>= 0.75 is considered consistent)
  visualSimilarity: number; // Structural & perceptual similarity (0-1)
  shapeConsistency: number; // Silhouette & geometry match (0-1)
  colorConsistency: number; // Palette & color scheme preservation (0-1)
  clothingConsistency: number; // Clothing fidelity or intentional variation adherence (0-1)
  accessoryConsistency: number; // Signature accessories presence (0-1)
  distinguishingFeaturePreservation: number; // Specific marks/scars/details retained (0-1)
  unwantedIdentityChanges: number; // Penalty for facial/structural distortion (0 is clean, 1 is heavy drift)
  detectedDifferences: string[]; // Human-readable differences
  isConsistent: boolean;
  confidence: number;
  recommendedCorrection?: string;
}

export interface StoryScene {
  sceneNumber: number;
  title: string;
  prompt: string;
  environment?: string;
  action?: string;
  cameraAngle?: string;
  expression?: string;
  generatedImage?: string;
  consistencyScore?: ConsistencyEvaluationScore;
  status: "pending" | "generating" | "completed" | "failed";
  error?: string;
}

export interface StorySequence {
  id: string;
  subjectId: string;
  workspaceId: string;
  userId: string;
  title: string;
  description?: string;
  scenes: StoryScene[];
  overallConsistencyScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectGenerationRequest {
  subjectId: string;
  prompt: string;
  variation?: PoseExpressionRequest;
  preferredViewType?: ReferenceViewType;
  provider?: ImageProviderId;
  aspectRatio?: AspectRatio;
  quality?: ImageQuality;
  targetConsistency?: number; // default 0.75
  autoCorrectOnFailure?: boolean; // trigger targeted correction if consistency < threshold
}

export interface SubjectGenerationResult {
  image: string;
  subjectId: string;
  subjectName: string;
  compiledPrompt: string;
  primaryReferenceUsed?: string;
  viewTypesUsed: ReferenceViewType[];
  provider: ImageProviderId;
  consistency: ConsistencyEvaluationScore;
  corrected: boolean;
  correctionAttempts: number;
  latencyMs: number;
  timestamp: string;
}

export interface TargetedCorrectionPlan {
  needsCorrection: boolean;
  reason: string;
  driftedAttributes: string[];
  correctionPrompt: string;
  recommendedTechnique: "inpainting" | "reference_reconditioning" | "targeted_reprompting";
  maskAreaTarget?: "face" | "clothing" | "accessories" | "general";
}
