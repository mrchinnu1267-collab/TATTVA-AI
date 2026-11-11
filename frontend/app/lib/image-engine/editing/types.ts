/**
 * TATTVA AI - Advanced AI Image Editing & Manipulation Types (Phase H)
 * Encompasses 12 natural-language editing operations, intelligent intent detection,
 * mask manipulation, background separation, outpainting, and version history.
 */

import { ImageProviderId, ImageProviderChoice, ImageQuality } from "../types";

export type EditingOperationType =
  | "object_removal"
  | "object_replacement"
  | "object_insertion"
  | "background_replacement"
  | "background_removal"
  | "color_modification"
  | "style_transfer"
  | "image_restoration"
  | "inpainting"
  | "outpainting"
  | "lighting_modification"
  | "composition_modification";

export interface ColorModificationSpec {
  targetElement: string;
  originalColor?: string;
  newColor: string;
}

export interface DirectionalExpansion {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface EditingIntent {
  operation: EditingOperationType;
  confidence: number; // 0.0 to 1.0
  targetSubject?: string;
  replacementSubject?: string;
  colorChange?: ColorModificationSpec;
  backgroundPrompt?: string;
  styleTarget?: string;
  expandDirections?: DirectionalExpansion;
  lightingTarget?: string;
  requiresMask: boolean;
  isAmbiguous: boolean;
  clarificationPrompt?: string;
  normalizedPrompt: string;
}

export type MaskTool =
  | "brush"
  | "eraser"
  | "rectangle"
  | "polygon"
  | "auto_segment"
  | "invert";

export interface MaskProcessingOptions {
  dilationRadiusPx?: number; // Expand mask outward by N pixels to avoid edge cutoff
  featherRadiusPx?: number;  // Soften boundary with Gaussian blur for seamless blending
  invert?: boolean;          // Invert foreground and background mask
}

export interface EditSnapshot {
  id: string;
  parentId?: string;
  operation: EditingOperationType;
  instruction: string;
  imageUrl: string; // Base64 data URI or storage URL
  maskUrl?: string;
  thumbnailUrl?: string;
  unmaskedPreservedPercent: number; // 0-100%
  timestamp: string;
  dimensions: { width: number; height: number };
  isTransparentPng?: boolean;
}

export interface ImageEditingRequest {
  image: string; // Base64 Data URI or HTTPS URL
  instruction: string;
  operation?: EditingOperationType;
  mask?: string; // Base64 Data URI representing modification region
  expand?: DirectionalExpansion;
  maskOptions?: MaskProcessingOptions;
  preserveUnmasked?: boolean;
  quality?: ImageQuality;
  provider?: ImageProviderChoice;
  userId?: string;
  workspaceId?: string;
}

export interface ImageEditingResult {
  editedImage: string;
  maskUsed?: string;
  operation: EditingOperationType;
  intent: EditingIntent;
  unmaskedPreservedPercent: number;
  isTransparent: boolean;
  provider: ImageProviderId;
  model: string;
  latencyMs: number;
  snapshotId: string;
  dimensions: { width: number; height: number };
  warnings?: string[];
}

export interface EditingProviderCapability {
  providerId: ImageProviderId;
  supportsInpainting: boolean;
  supportsMaskInput: boolean;
  supportsOutpainting: boolean;
  supportsBackgroundRemoval: boolean;
  supportsTransparency: boolean;
  maxDimensions: { width: number; height: number };
  averageLatencyMs: number;
}

