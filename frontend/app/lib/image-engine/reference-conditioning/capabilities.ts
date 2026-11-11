/**
 * TATTVA AI - Provider Reference Capability Matrix (Phase B)
 * Audits provider support for reference-image conditioning and enforces fallback safety.
 */

import { ImageProviderId } from "../types";
import type { ProviderReferenceCapability } from "./types";

export const PROVIDER_REFERENCE_CAPABILITIES: Record<ImageProviderId, ProviderReferenceCapability> = {
  gemini: {
    provider: "gemini",
    supportsReferenceImage: true,
    supportsStrength: false, // Gemini multimodal handles conditioning natively via prompt + image tokens
    maxResolution: 2048,
    supportedFormats: ["png", "jpeg", "webp", "gif"],
    reason: "Google Gemini multimodal image generation natively accepts reference images in content parts.",
  },
  local: {
    provider: "local",
    supportsReferenceImage: true,
    supportsStrength: true, // Local diffusers pipeline uses strength/denoising_strength
    maxResolution: 2048,
    supportedFormats: ["png", "jpeg", "webp"],
    reason: "Local CUDA Diffusion engine executes diffusers image-to-image pipeline with strength control.",
  },
  huggingface: {
    provider: "huggingface",
    supportsReferenceImage: true,
    supportsStrength: true,
    maxResolution: 1536,
    supportedFormats: ["png", "jpeg", "webp"],
    reason: "Hugging Face Spaces execute reference-conditioned diffusion and img2img pipelines.",
  },
  openai: {
    provider: "openai",
    supportsReferenceImage: false, // DALL-E 3 API is text-only generations; does not accept reference images
    supportsStrength: false,
    maxResolution: 1792,
    supportedFormats: [],
    reason: "OpenAI DALL-E 3 does not accept reference images for image generation. Reference images must not be silently discarded.",
  },
};

/**
 * Checks whether a given provider can accept and condition on reference images.
 */
export function checkProviderReferenceSupport(provider: ImageProviderId): ProviderReferenceCapability {
  return PROVIDER_REFERENCE_CAPABILITIES[provider] || {
    provider,
    supportsReferenceImage: false,
    supportsStrength: false,
    supportedFormats: [],
    reason: `Provider '${provider}' has no verified reference-conditioning adapter.`,
  };
}

/**
 * Filters and reorders candidate providers for reference-conditioned requests.
 * Eliminates providers that cannot process reference images to prevent silent discard.
 */
export function filterCompatibleReferenceProviders(
  preferredOrder: ImageProviderId[],
  hasReferenceImage: boolean
): {
  compatibleProviders: ImageProviderId[];
  incompatibleProviders: ImageProviderId[];
  warningMessage?: string;
} {
  if (!hasReferenceImage) {
    return {
      compatibleProviders: preferredOrder,
      incompatibleProviders: [],
    };
  }

  const compatible: ImageProviderId[] = [];
  const incompatible: ImageProviderId[] = [];

  for (const provider of preferredOrder) {
    const capability = checkProviderReferenceSupport(provider);
    if (capability.supportsReferenceImage) {
      compatible.push(provider);
    } else {
      incompatible.push(provider);
    }
  }

  const warningMessage =
    incompatible.length > 0
      ? `Providers bypassed because they cannot accept reference images: ${incompatible.join(", ")}. Never silently discarding reference image.`
      : undefined;

  return {
    compatibleProviders: compatible,
    incompatibleProviders: incompatible,
    warningMessage,
  };
}

