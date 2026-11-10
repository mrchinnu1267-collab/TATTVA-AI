/**
 * TATTVA AI - Multi-Model Registry
 * Evaluates, catalogs, and manages available open-weight, local, and premium hosted models.
 */

import { ModelSpecification } from "./types";

export const SUPPORTED_MODELS: Record<string, ModelSpecification> = {
  // =========================================================================
  // 1. FLUX FAMILY (Open-Weight / Serverless Inference)
  // =========================================================================
  "flux-1-dev": {
    id: "flux-1-dev",
    name: "FLUX.1-dev",
    family: "flux",
    hosting: "open_weight",
    providerId: "huggingface",
    description: "State-of-the-art 12B parameter rectified flow transformer with premier prompt fidelity, anatomical precision, and typography.",
    strengths: ["photorealism", "complex composition", "typography", "spatial adherence"],
    maxResolution: { width: 1536, height: 1536 },
    license: "FLUX.1-dev Non-Commercial License / Serverless API",
    supportsInpainting: true,
    supportsControlNet: true,
    supportsIPAdapter: true,
    costPerMegapixelUsd: 0.003,
    averageLatencyMs: 3800,
    qualityScore: 98,
    offlineCapable: true,
  },
  "flux-1-schnell": {
    id: "flux-1-schnell",
    name: "FLUX.1-schnell",
    family: "flux",
    hosting: "open_weight",
    providerId: "huggingface",
    description: "Fast 4-step distilled version of FLUX.1 optimized for high-throughput and ultra-low latency.",
    strengths: ["generation speed", "high throughput", "solid realism", "open commercial"],
    maxResolution: { width: 1024, height: 1024 },
    license: "Apache-2.0",
    supportsInpainting: false,
    supportsControlNet: false,
    supportsIPAdapter: false,
    costPerMegapixelUsd: 0.001,
    averageLatencyMs: 1400,
    qualityScore: 91,
    offlineCapable: true,
  },

  // =========================================================================
  // 2. GOOGLE GEMINI IMAGE (Premium Hosted)
  // =========================================================================
  "gemini-3.1-flash-image": {
    id: "gemini-3.1-flash-image",
    name: "Google Gemini 3.1 Flash Image",
    family: "gemini",
    hosting: "premium_hosted",
    providerId: "gemini",
    description: "Next-gen multimodal generative diffusion model integrated with deep language reasoning and conversational prompt comprehension.",
    strengths: ["reasoning depth", "semantic interpretation", "world knowledge", "lighting & reflections"],
    maxResolution: { width: 2048, height: 2048 },
    license: "Google Generative AI Commercial Terms",
    supportsInpainting: true,
    supportsControlNet: true,
    supportsIPAdapter: true,
    costPerMegapixelUsd: 0.02,
    averageLatencyMs: 4200,
    qualityScore: 97,
    offlineCapable: false,
  },
  "gemini-2.5-flash-image": {
    id: "gemini-2.5-flash-image",
    name: "Google Gemini 2.5 Flash Image",
    family: "gemini",
    hosting: "premium_hosted",
    providerId: "gemini",
    description: "Balanced, high-fidelity Google multimodal image generation model.",
    strengths: ["fast turnaround", "vibrant colors", "artistic styling"],
    maxResolution: { width: 1024, height: 1024 },
    license: "Google Generative AI Commercial Terms",
    supportsInpainting: true,
    supportsControlNet: false,
    supportsIPAdapter: true,
    costPerMegapixelUsd: 0.015,
    averageLatencyMs: 3100,
    qualityScore: 93,
    offlineCapable: false,
  },

  // =========================================================================
  // 3. OPENAI DALL-E 3 (Premium Hosted)
  // =========================================================================
  "dall-e-3": {
    id: "dall-e-3",
    name: "OpenAI DALL-E 3",
    family: "openai",
    hosting: "premium_hosted",
    providerId: "openai",
    description: "Industry-standard hosted diffusion model with automated prompt expansion and fine nuance execution.",
    strengths: ["nuanced understanding", "imaginative concepts", "vivid surreal scenes"],
    maxResolution: { width: 1792, height: 1024 },
    license: "OpenAI Commercial API Terms",
    supportsInpainting: false,
    supportsControlNet: false,
    supportsIPAdapter: false,
    costPerMegapixelUsd: 0.04,
    averageLatencyMs: 7500,
    qualityScore: 95,
    offlineCapable: false,
  },

  // =========================================================================
  // 4. STABLE DIFFUSION & SDXL (Open-Weight / Diffusers)
  // =========================================================================
  "sd-3-medium": {
    id: "sd-3-medium",
    name: "Stable Diffusion 3 Medium",
    family: "stable_diffusion",
    hosting: "open_weight",
    providerId: "huggingface",
    description: "MMDiT-based diffusion model featuring dual-transformer architecture for text-image alignment.",
    strengths: ["spelling", "versatile artistic styles", "open architecture"],
    maxResolution: { width: 1024, height: 1024 },
    license: "Stability AI Community License",
    supportsInpainting: true,
    supportsControlNet: true,
    supportsIPAdapter: true,
    costPerMegapixelUsd: 0.002,
    averageLatencyMs: 2900,
    qualityScore: 92,
    offlineCapable: true,
  },

  // =========================================================================
  // 5. LOCAL COMFYUI / PYTHON DIFFUSERS ENGINE (Mode A & Mode C)
  // =========================================================================
  "local-cuda-diffusion": {
    id: "local-cuda-diffusion",
    name: "Local CUDA PyTorch / ComfyUI Engine",
    family: "comfyui",
    hosting: "local_offline",
    providerId: "local",
    description: "Direct hardware execution on local NVIDIA RTX GPU via Python Diffusers / ComfyUI API with zero network latency.",
    strengths: ["100% privacy", "zero per-call cost", "offline capable", "custom LoRA & ControlNet"],
    maxResolution: { width: 2048, height: 2048 },
    license: "Self-Hosted / Open-Source",
    supportsInpainting: true,
    supportsControlNet: true,
    supportsIPAdapter: true,
    costPerMegapixelUsd: 0.0,
    averageLatencyMs: 1800,
    qualityScore: 94,
    offlineCapable: true,
  },
};

export function getModelById(id: string): ModelSpecification {
  return SUPPORTED_MODELS[id] || SUPPORTED_MODELS["flux-1-dev"];
}

export function listAvailableModels(filter?: {
  hosting?: "open_weight" | "premium_hosted" | "local_offline";
  offlineOnly?: boolean;
}): ModelSpecification[] {
  let list = Object.values(SUPPORTED_MODELS);
  if (filter?.hosting) {
    list = list.filter((m) => m.hosting === filter.hosting);
  }
  if (filter?.offlineOnly) {
    list = list.filter((m) => m.offlineCapable);
  }
  return list;
}

