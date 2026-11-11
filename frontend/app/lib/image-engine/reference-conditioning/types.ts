/**
 * TATTVA AI - Reference Image Conditioning Types (Phase B)
 */

import { AspectRatio, ImageProviderId } from "../types";

export type ConditioningIntentType =
  | "keep_character"
  | "change_background"
  | "preserve_composition"
  | "change_color"
  | "add_object"
  | "style_transfer"
  | "general_img2img";

export interface ReferenceImageValidation {
  isValid: boolean;
  format?: "png" | "jpeg" | "webp" | "gif";
  mimeType?: string;
  width?: number;
  height?: number;
  aspectRatio?: AspectRatio;
  fileSizeBytes?: number;
  error?: string;
}

export interface SpatialRelationship {
  entity: string;
  position: "foreground" | "midground" | "background" | "centered" | "left" | "right" | "top" | "bottom";
  relationToOther?: string;
}

export interface ReferenceAnalysis {
  primarySubject: string;
  secondaryObjects: string[];
  composition: string;
  colorPalette: string[];
  shapesAndSilhouettes: string[];
  spatialRelationships: SpatialRelationship[];
  preservedDetails: string[];
  detectedText?: string[];
  source: "vision" | "structural_heuristic";
}

export interface ConditioningIntent {
  intentType: ConditioningIntentType;
  explanation: string;
  recommendedStrength: number;
  preservationDirectives: string[];
  modificationDirectives: string[];
  lockedEntities: string[];
  targetModifications: string[];
}

export interface ProviderReferenceCapability {
  provider: ImageProviderId;
  supportsReferenceImage: boolean;
  supportsStrength: boolean;
  maxResolution?: number;
  supportedFormats: Array<"png" | "jpeg" | "webp" | "gif">;
  reason?: string;
}

export interface ReferenceConditioningPlan {
  originalPrompt: string;
  referenceImage: string;
  validation: ReferenceImageValidation;
  analysis: ReferenceAnalysis;
  intent: ConditioningIntent;
  effectiveStrength: number;
  promptsByProvider: Record<ImageProviderId, string>;
  warnings: string[];
}
