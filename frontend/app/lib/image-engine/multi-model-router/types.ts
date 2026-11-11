/**
 * TATTVA AI - Intelligent Multi-Model Router Types (Phase C)
 */

import { ImageProviderChoice, ImageProviderId, ImageQuality, AspectRatio } from "../types";

export type ImageWorkflowType =
  | "photorealism"
  | "anime_illustration"
  | "anime_artwork"
  | "poster_typography"
  | "poster_creation"
  | "product_photography"
  | "portrait_generation"
  | "inpainting"
  | "background_replacement"
  | "character_preservation"
  | "composition_transfer"
  | "style_transfer"
  | "image_to_image"
  | "image_editing"
  | "text_to_image"
  | "fast_generation"
  | "high_complexity_scene";

export type ModelHostingType = "open_weight" | "premium_hosted" | "local_offline";

export interface ModelSpecification {
  id: string;
  name: string;
  exactModelIdentifier: string;
  family: string;
  hosting: ModelHostingType;
  providerId: ImageProviderId;
  description: string;
  strengths: string[];
  supportsTextToImage: boolean;
  supportsImageToImage: boolean;
  supportsReferenceImage: boolean;
  supportsInpainting: boolean;
  supportsOutpainting: boolean;
  supportsControlNet: boolean;
  supportsNegativePrompt: boolean;
  supportsStrengthControl: boolean;
  maxResolution: { width: number; height: number };
  resolutionLimits: { minWidth: number; minHeight: number; maxWidth: number; maxHeight: number };
  license: string;
  pricingUsdPerMegapixel: number;
  costPerMegapixelUsd: number; // Backwards compatibility
  averageLatencyMs: number;
  qualityScore: number; // 0-100 benchmark baseline
  offlineCapable: boolean;
}

export interface RouterSelectionDecision {
  workflow: ImageWorkflowType;
  confidence: number; // 0.0 - 1.0
  primaryModel: ModelSpecification;
  fallbackModels: ModelSpecification[];
  fallbackChain: ImageProviderId[];
  executionMode: "cloud" | "local" | "hybrid";
  controlMethod?: string;
  typographyOverlayNeeded: boolean;
  selectionRationale: string;
  estimatedCostUsd: number;
  estimatedLatencyMs: number;
  referenceSafe: boolean;
  quotaAware: boolean;
  warnings?: string[];
}

export interface RoutingAnalysisParams {
  prompt: string;
  referenceImage?: string;
  quality?: ImageQuality;
  aspectRatio?: AspectRatio;
  preferredProvider?: ImageProviderChoice;
  isOffline?: boolean;
  requestedWorkflow?: ImageWorkflowType;
  maxCostUsd?: number;
}

export interface ProviderBenchmarkMetric {
  modelId: string;
  providerId: ImageProviderId;
  category: ImageWorkflowType;
  promptAdherence: number; // 0-100
  objectPresence: number; // 0-100
  objectPositioning: number; // 0-100
  visualQuality: number; // 0-100
  referenceSimilarity?: number; // 0-100
  textAccuracy: number; // 0-100
  averageLatencyMs: number;
  failureRate: number; // 0.0 - 1.0
  costPerSuccessfulGeneration: number;
  sampleCount: number;
}
