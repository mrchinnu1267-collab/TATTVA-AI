/**
 * TATTVA AI - Advanced Spatial Control, Object Positioning and Image Editing Types (Phase D)
 */

import { ImageProviderId, AspectRatio, ImageQuality } from "../types";

export type ControlNetType = "canny" | "depth" | "pose" | "lineart" | "scribble";

export type SceneDepthLayer = "foreground" | "midground" | "background";

export type HorizontalAlignment = "left" | "center-left" | "center" | "center-right" | "right";
export type VerticalAlignment = "top" | "center" | "bottom";

export type SceneCompositionType =
  | "rule_of_thirds"
  | "centered_symmetry"
  | "golden_ratio"
  | "diagonal"
  | "panoramic"
  | "close_up"
  | "wide_establishing"
  | "custom";

/**
 * Spatial Bounding Box defined in normalized coordinates [0.0 - 1.0]
 */
export interface SpatialBoundingBox {
  id: string;
  label: string;
  x: number; // 0.0 = left, 1.0 = right
  y: number; // 0.0 = top, 1.0 = bottom
  width: number; // 0.0 - 1.0
  height: number; // 0.0 - 1.0
  layer: SceneDepthLayer;
  color?: string;
  attributes?: string[];
  importance?: "critical" | "standard" | "ambient";
}

/**
 * Structured Scene Spatial Layout specification
 */
export interface SceneSpatialLayout {
  width: number;
  height: number;
  composition: SceneCompositionType;
  boxes: SpatialBoundingBox[];
  depthMapDataUri?: string;
  cannyMapDataUri?: string;
  promptGuidance?: string;
}

/**
 * ControlNet Conditioning Specification
 */
export interface ControlNetConditioning {
  type: ControlNetType;
  conditioningImage: string; // Base64 data URI
  scale: number; // 0.0 - 2.0 (standard 1.0)
  guidanceStart?: number; // 0.0 - 1.0 (step fraction)
  guidanceEnd?: number; // 0.0 - 1.0 (step fraction)
  preprocessor?: string;
}

/**
 * Inpainting Request with base image and mask
 */
export interface InpaintRequest {
  image: string; // Base64 Data URI
  mask: string; // Base64 Data URI (white=inpaint region, black/transparent=preserve)
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  strength?: number; // 0.1 - 1.0 (default: 0.85)
  blendFeather?: number; // Feather radius in px to ensure seamless boundary (default: 8)
  provider?: ImageProviderId;
  quality?: ImageQuality;
}

/**
 * Outpainting Request to expand image boundaries
 */
export interface OutpaintRequest {
  image: string; // Base64 Data URI
  expand: {
    top: number; // Pixels or percentage
    bottom: number;
    left: number;
    right: number;
  };
  prompt: string;
  negativePrompt?: string;
  blendMargin?: number; // Border overlap margin in px (default: 32)
  preserveOriginal?: boolean; // If true, strictly composite original pixels back
  provider?: ImageProviderId;
}

/**
 * Visual Quality & Spatial Evaluation Report
 */
export interface SpatialEvaluationReport {
  overallScore: number; // 0 - 100
  positioningScore: number; // 0 - 100
  maskAdherenceScore: number; // 0 - 100 (unmasked preservation)
  unmaskedPreservationScore: number; // 0 - 100
  compositionScore: number; // 0 - 100
  depthFidelityScore: number; // 0 - 100
  detectedBoxes: Array<{
    label: string;
    detectedBox: { x: number; y: number; width: number; height: number };
    targetBox?: { x: number; y: number; width: number; height: number };
    iou: number; // Intersection over Union (0 - 1.0)
    aligned: boolean;
  }>;
  issues: string[];
  metrics: {
    meanSquaredErrorOutsideMask?: number;
    peakSignalToNoiseRatioOutsideMask?: number;
    boundaryFeatherSmoothness?: number;
  };
}

