/**
 * TATTVA AI - Next-Generation Multi-Model Image Generation Engine
 * Shared Architecture Types & Enums
 */

export type ExecutionMode = "independent_free" | "advanced_hybrid" | "offline";

export type ImageWorkflowType =
  | "text_to_image"
  | "image_to_image"
  | "multi_reference"
  | "image_editing"
  | "inpainting"
  | "outpainting"
  | "style_transfer"
  | "product_photography"
  | "portrait_generation"
  | "anime_artwork"
  | "poster_creation"
  | "transparent_background"
  | "image_variations"
  | "background_replacement"
  | "image_restoration"
  | "super_resolution";

export type ModelFamily =
  | "flux"
  | "qwen"
  | "stable_diffusion"
  | "gemini"
  | "openai"
  | "comfyui"
  | "local_diffusers";

export type ModelHostingType = "open_weight" | "premium_hosted" | "local_offline";

export interface ModelSpecification {
  id: string;
  name: string;
  family: ModelFamily;
  hosting: ModelHostingType;
  providerId: "gemini" | "huggingface" | "openai" | "local" | "comfyui";
  description: string;
  strengths: string[];
  maxResolution: { width: number; height: number };
  license: string;
  supportsInpainting: boolean;
  supportsControlNet: boolean;
  supportsIPAdapter: boolean;
  costPerMegapixelUsd: number;
  averageLatencyMs: number;
  qualityScore: number; // 0-100
  offlineCapable: boolean;
}

export interface RouterSelectionDecision {
  workflow: ImageWorkflowType;
  primaryModel: ModelSpecification;
  fallbackModels: ModelSpecification[];
  executionMode: ExecutionMode;
  controlMethod?: "ip-adapter" | "controlnet-depth" | "controlnet-canny" | "controlnet-pose" | "inpaint" | "none";
  typographyOverlayNeeded: boolean;
  upscaleTargetMultiplier?: 2 | 4;
  selectionRationale: string;
  estimatedCostUsd: number;
}

