/**
 * TATTVA Image Engine - shared types
 * Compile -> generate -> verify -> refine loop for maximum prompt adherence.
 */

export type ImageProviderId = "gemini" | "huggingface" | "pollinations" | "openai" | "local" | "nano-banana";
export type ImageProviderChoice = "auto" | ImageProviderId;
export type ImageQuality = "fast" | "balanced" | "max";
export type AspectRatio = "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
export type ImageStyle =
  | "auto"
  | "realistic"
  | "cinematic"
  | "portrait"
  | "anime"
  | "3d"
  | "fantasy"
  | "cyberpunk"
  | "architecture"
  | "vintage"
  | "product"
  | "minimal";

export type RequirementCategory =
  | "subject"
  | "count"
  | "color"
  | "text"
  | "entity"
  | "exclusion"
  | "style";

export interface ImageRequirement {
  id: string;
  text: string;
  category: RequirementCategory;
  /** Critical requirements must be met before the engine stops retrying. */
  critical: boolean;
}

export interface ImageGenerationOptions {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
  seed?: number;
  customNegative?: string;
  referenceImage?: string;
  strength?: number;
  provider?: ImageProviderChoice;
  quality?: ImageQuality;
  maxAttempts?: number;
  verify?: boolean;
  targetScore?: number;
  userId?: string;
  activeAdapterId?: string;
  adapterScale?: number;
}

export interface CompiledImagePrompt {
  compilerVersion: string;
  prompt: string;
  positive: string;
  negative: string;
  style: ImageStyle;
  aspectRatio: AspectRatio;
  seed: number;
  width: number;
  height: number;
  steps: number;
  guidance: number;
  quality: ImageQuality;
  requirements: ImageRequirement[];
  referenceImage?: string;
  strength?: number;
  referencePlan?: any;
  structured?: any;
  promptsByProvider?: Record<ImageProviderId, string>;
  warnings?: string[];
  activeAdapterId?: string;
  adapterScale?: number;
}

export interface ProviderRequest {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  guidance: number;
  seed: number;
  aspectRatio: AspectRatio;
  quality: ImageQuality;
  referenceImage?: string;
  strength?: number;
  activeAdapterId?: string;
  adapterScale?: number;
}

export interface ProviderResult {
  image: string;
  provider: ImageProviderId;
  model: string;
  seed: number;
  width: number;
  height: number;
  latencyMs: number;
  revisedPrompt?: string;
}

export type ProviderHealthStatus =
  | "AVAILABLE"
  | "DEGRADED"
  | "RATE_LIMITED"
  | "AUTHENTICATION_FAILED"
  | "QUOTA_EXCEEDED"
  | "CONFIGURATION_ERROR"
  | "TEMPORARILY_UNAVAILABLE";

export interface ProviderRuntimeStatus {
  id: ImageProviderId;
  label: string;
  configured: boolean;
  available: boolean;
  status: ProviderHealthStatus;
  model: string;
  reason?: string;
}

export interface RequirementCheck {
  id: string;
  text: string;
  critical: boolean;
  met: boolean | null;
  note?: string;
}

export type VerificationMethod = "vision" | "heuristic";

export interface ImageVerification {
  score: number;
  verdict: "pass" | "borderline" | "fail";
  method: VerificationMethod;
  model?: string;
  requirements: RequirementCheck[];
  issues: string[];
  suggestedFix?: string;
}

export interface ImageAttempt {
  index: number;
  provider: ImageProviderId;
  model: string;
  seed: number;
  latencyMs: number;
  prompt: string;
  verification?: ImageVerification;
  error?: string;
  /** Kept in-process for best-result selection; omitted from API responses. */
  image?: string;
}

export interface ImageMetadata {
  model: string;
  provider: ImageProviderId;
  seed: number;
  width: number;
  height: number;
  generation_time_seconds: number;
  accuracy: number;
  verified: boolean;
  verification_method: VerificationMethod;
  attempts: number;
  style: ImageStyle;
  aspect_ratio: AspectRatio;
  prompt: string;
  negative_prompt: string;
  requirements: ImageRequirement[];
  warnings: string[];
  workflow?: string;
  routing_rationale?: string;
  estimated_cost_usd?: number;
  primary_model?: string;
  scorecard?: any;
  refinement_action?: string;
}

export interface ImageEngineResult {
  image: string;
  provider: ImageProviderId;
  model: string;
  seed: number;
  width: number;
  height: number;
  latencyMs: number;
  compiled: CompiledImagePrompt;
  verification: ImageVerification;
  accuracy: number;
  attempts: ImageAttempt[];
  warnings: string[];
  metadata: ImageMetadata;
  evaluation?: any;
}
