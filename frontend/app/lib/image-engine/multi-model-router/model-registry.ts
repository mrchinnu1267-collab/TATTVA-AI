/**
 * TATTVA AI - Dynamic Multi-Model Capability Registry (Phase C)
 * Catalogs exact model identifiers, operational capabilities, latency benchmarks,
 * and verified pricing data. Never assumes capabilities based on name alone.
 */

import { ModelSpecification } from "./types";
import { ImageProviderId } from "../types";

export const SUPPORTED_MODELS: Record<string, ModelSpecification> = {
  // 1. FLUX.1-dev (High-Fidelity Text-to-Image & Typography)
  "flux-1-dev": {
    id: "flux-1-dev",
    name: "FLUX.1-dev",
    exactModelIdentifier: "black-forest-labs/FLUX.1-dev",
    family: "flux",
    hosting: "open_weight",
    providerId: "huggingface",
    description: "State-of-the-art 12B parameter rectified flow transformer with premier prompt fidelity, anatomical precision, and quoted typography.",
    strengths: ["photorealism", "complex composition", "typography", "spatial adherence"],
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsReferenceImage: true,
    supportsInpainting: true,
    supportsOutpainting: false,
    supportsControlNet: true,
    supportsNegativePrompt: false, // T5-XXL operates on natural prompt descriptions
    supportsStrengthControl: true,
    maxResolution: { width: 1536, height: 1536 },
    resolutionLimits: { minWidth: 256, minHeight: 256, maxWidth: 1536, maxHeight: 1536 },
    license: "FLUX.1-dev Non-Commercial License / Serverless API",
    pricingUsdPerMegapixel: 0.003,
    costPerMegapixelUsd: 0.003,
    averageLatencyMs: 3800,
    qualityScore: 98,
    offlineCapable: true,
  },

  // 2. FLUX.1-schnell (Ultra-Fast 4-Step Distilled Diffusion)
  "flux-1-schnell": {
    id: "flux-1-schnell",
    name: "FLUX.1-schnell",
    exactModelIdentifier: "black-forest-labs/FLUX.1-schnell",
    family: "flux",
    hosting: "open_weight",
    providerId: "huggingface",
    description: "4-step distilled version of FLUX.1 optimized for high throughput, unwatermarked output, and rapid generation.",
    strengths: ["generation speed", "high throughput", "photorealism", "typography"],
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsReferenceImage: true,
    supportsInpainting: false,
    supportsOutpainting: false,
    supportsControlNet: false,
    supportsNegativePrompt: false,
    supportsStrengthControl: true,
    maxResolution: { width: 1024, height: 1024 },
    resolutionLimits: { minWidth: 256, minHeight: 256, maxWidth: 1024, maxHeight: 1024 },
    license: "Apache-2.0",
    pricingUsdPerMegapixel: 0.001,
    costPerMegapixelUsd: 0.001,
    averageLatencyMs: 2200,
    qualityScore: 91,
    offlineCapable: true,
  },

  // 3. AP123 SDXL-Lightning (High-Throughput 4-Step SDXL)
  "ap123-sdxl-lightning": {
    id: "ap123-sdxl-lightning",
    name: "AP123/SDXL-Lightning",
    exactModelIdentifier: "AP123/SDXL-Lightning",
    family: "stable_diffusion",
    hosting: "open_weight",
    providerId: "huggingface",
    description: "Lightning-distilled SDXL model running in 4 steps with zero watermarks and rapid inference.",
    strengths: ["generation speed", "general visual quality", "cost free", "unwatermarked"],
    supportsTextToImage: true,
    supportsImageToImage: false,
    supportsReferenceImage: false,
    supportsInpainting: false,
    supportsOutpainting: false,
    supportsControlNet: false,
    supportsNegativePrompt: true,
    supportsStrengthControl: false,
    maxResolution: { width: 1024, height: 1024 },
    resolutionLimits: { minWidth: 512, minHeight: 512, maxWidth: 1024, maxHeight: 1024 },
    license: "OpenRAIL-M",
    pricingUsdPerMegapixel: 0.0,
    costPerMegapixelUsd: 0.0,
    averageLatencyMs: 1900,
    qualityScore: 89,
    offlineCapable: false,
  },

  // 4. Animagine XL 3.1 (Anime & Illustration Specialist)
  "animagine-xl-3.1": {
    id: "animagine-xl-3.1",
    name: "Animagine XL 3.1",
    exactModelIdentifier: "cagliostrolab/animagine-xl-3.1",
    family: "stable_diffusion",
    hosting: "open_weight",
    providerId: "huggingface",
    description: "Dedicated anime and manga generative model with comprehensive Danbooru tag comprehension and stylized cel shading.",
    strengths: ["anime artwork", "manga illustrations", "character styling", "cel shading"],
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsReferenceImage: true,
    supportsInpainting: false,
    supportsOutpainting: false,
    supportsControlNet: false,
    supportsNegativePrompt: true,
    supportsStrengthControl: true,
    maxResolution: { width: 1024, height: 1024 },
    resolutionLimits: { minWidth: 512, minHeight: 512, maxWidth: 1024, maxHeight: 1024 },
    license: "Fair-AI Public License",
    pricingUsdPerMegapixel: 0.0,
    costPerMegapixelUsd: 0.0,
    averageLatencyMs: 3400,
    qualityScore: 94,
    offlineCapable: false,
  },

  // 5. Google Gemini 3.1 Flash Image (Multimodal Native)
  "gemini-3.1-flash-image": {
    id: "gemini-3.1-flash-image",
    name: "Google Gemini 3.1 Flash Image",
    exactModelIdentifier: "gemini-3.1-flash-image",
    family: "gemini",
    hosting: "premium_hosted",
    providerId: "gemini",
    description: "Multimodal generative diffusion model with native language reasoning, reference conditioning, and semantic composition.",
    strengths: ["reference conditioning", "reasoning depth", "semantic interpretation", "lighting & reflections"],
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsReferenceImage: true,
    supportsInpainting: true,
    supportsOutpainting: false,
    supportsControlNet: true,
    supportsNegativePrompt: false, // Uses natural language instruction framing
    supportsStrengthControl: false, // Multimodal prompt-conditioned
    maxResolution: { width: 2048, height: 2048 },
    resolutionLimits: { minWidth: 512, minHeight: 512, maxWidth: 2048, maxHeight: 2048 },
    license: "Google Generative AI Commercial Terms",
    pricingUsdPerMegapixel: 0.02,
    costPerMegapixelUsd: 0.02,
    averageLatencyMs: 4200,
    qualityScore: 97,
    offlineCapable: false,
  },

  // 6. OpenAI DALL-E 3 (Text-Only Imaginative Composition)
  "dall-e-3": {
    id: "dall-e-3",
    name: "OpenAI DALL-E 3",
    exactModelIdentifier: "dall-e-3",
    family: "openai",
    hosting: "premium_hosted",
    providerId: "openai",
    description: "Hosted diffusion model with automated prompt expansion for nuanced artistic concepts. Text-to-image only.",
    strengths: ["nuanced understanding", "imaginative concepts", "vivid surreal scenes"],
    supportsTextToImage: true,
    supportsImageToImage: false,
    supportsReferenceImage: false, // DALL-E 3 does NOT accept reference images
    supportsInpainting: false,
    supportsOutpainting: false,
    supportsControlNet: false,
    supportsNegativePrompt: false,
    supportsStrengthControl: false,
    maxResolution: { width: 1792, height: 1024 },
    resolutionLimits: { minWidth: 1024, minHeight: 1024, maxWidth: 1792, maxHeight: 1024 },
    license: "OpenAI Commercial API Terms",
    pricingUsdPerMegapixel: 0.04,
    costPerMegapixelUsd: 0.04,
    averageLatencyMs: 7500,
    qualityScore: 95,
    offlineCapable: false,
  },

  // 7. Stable Diffusion 3 Medium (MMDiT Dual Transformer)
  "sd-3-medium": {
    id: "sd-3-medium",
    name: "Stable Diffusion 3 Medium",
    exactModelIdentifier: "stabilityai/stable-diffusion-3-medium",
    family: "stable_diffusion",
    hosting: "open_weight",
    providerId: "huggingface",
    description: "MMDiT-based diffusion model featuring dual-transformer architecture for text-image alignment.",
    strengths: ["spelling", "versatile artistic styles", "open architecture"],
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsReferenceImage: true,
    supportsInpainting: true,
    supportsOutpainting: false,
    supportsControlNet: true,
    supportsNegativePrompt: true,
    supportsStrengthControl: true,
    maxResolution: { width: 1024, height: 1024 },
    resolutionLimits: { minWidth: 512, minHeight: 512, maxWidth: 1024, maxHeight: 1024 },
    license: "Stability AI Community License",
    pricingUsdPerMegapixel: 0.002,
    costPerMegapixelUsd: 0.002,
    averageLatencyMs: 2900,
    qualityScore: 92,
    offlineCapable: true,
  },

  // 8. Local CUDA PyTorch / Diffusers Engine
  "local-cuda-diffusion": {
    id: "local-cuda-diffusion",
    name: "Local CUDA PyTorch Engine",
    exactModelIdentifier: "local-diffusion",
    family: "local_diffusers",
    hosting: "local_offline",
    providerId: "local",
    description: "Hardware execution on local NVIDIA RTX GPU via Python Diffusers with zero cloud egress and offline privacy.",
    strengths: ["100% privacy", "zero per-call cost", "offline capable", "img2img strength control"],
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsReferenceImage: true,
    supportsInpainting: true,
    supportsOutpainting: false,
    supportsControlNet: true,
    supportsNegativePrompt: true,
    supportsStrengthControl: true,
    maxResolution: { width: 2048, height: 2048 },
    resolutionLimits: { minWidth: 64, minHeight: 64, maxWidth: 2048, maxHeight: 2048 },
    license: "Self-Hosted / Open-Source",
    pricingUsdPerMegapixel: 0.0,
    costPerMegapixelUsd: 0.0,
    averageLatencyMs: 1800,
    qualityScore: 94,
    offlineCapable: true,
  },
};

// Aliases for compatibility with existing tests
export const MODEL_REGISTRY = SUPPORTED_MODELS;

export function getModelById(id: string): ModelSpecification {
  return SUPPORTED_MODELS[id] || SUPPORTED_MODELS["flux-1-schnell"] || Object.values(SUPPORTED_MODELS)[0];
}

export function listAvailableModels(filter?: {
  hosting?: "open_weight" | "premium_hosted" | "local_offline";
  offlineOnly?: boolean;
  providerId?: ImageProviderId;
  requiresReferenceSupport?: boolean;
}): ModelSpecification[] {
  let list = Object.values(SUPPORTED_MODELS);
  if (filter?.hosting) {
    list = list.filter((m) => m.hosting === filter.hosting);
  }
  if (filter?.offlineOnly) {
    list = list.filter((m) => m.offlineCapable);
  }
  if (filter?.providerId) {
    list = list.filter((m) => m.providerId === filter.providerId);
  }
  if (filter?.requiresReferenceSupport) {
    list = list.filter((m) => m.supportsReferenceImage);
  }
  return list;
}

export const getAvailableModels = listAvailableModels;

export function getModelsForProvider(providerId: ImageProviderId): ModelSpecification[] {
  return Object.values(SUPPORTED_MODELS).filter((m) => m.providerId === providerId);
}

export function getCapableModels(criteria: {
  requiresReferenceImage?: boolean;
  requiresInpainting?: boolean;
  requiresControlNet?: boolean;
  requiresLowLatency?: boolean;
}): ModelSpecification[] {
  return Object.values(SUPPORTED_MODELS).filter((m) => {
    if (criteria.requiresReferenceImage && !m.supportsReferenceImage) return false;
    if (criteria.requiresInpainting && !m.supportsInpainting) return false;
    if (criteria.requiresControlNet && !m.supportsControlNet) return false;
    if (criteria.requiresLowLatency && m.averageLatencyMs > 3000) return false;
    return true;
  });
}
