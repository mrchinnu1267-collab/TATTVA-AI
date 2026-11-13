/**
 * TATTVA AI - Intelligent Editing Provider Router (Phase H)
 * Evaluates provider capabilities before dispatching image editing jobs.
 * Enforces strict capability validation: NEVER routes mask-based edits
 * or transparent cutouts to text-only foundation endpoints.
 */

import { ImageProviderId, ImageProviderChoice } from "../types";
import { EditingOperationType, EditingProviderCapability } from "./types";
import { getCooldownRemaining } from "../providers";

export const EDITING_PROVIDER_CAPABILITIES: Record<ImageProviderId, EditingProviderCapability> = {
  "nano-banana": {
    providerId: "nano-banana",
    supportsInpainting: true,
    supportsMaskInput: true,
    supportsOutpainting: true,
    supportsBackgroundRemoval: true,
    supportsTransparency: false,
    maxDimensions: { width: 2048, height: 2048 },
    averageLatencyMs: 3100,
  },
  gemini: {
    providerId: "gemini",
    supportsInpainting: true,
    supportsMaskInput: true,
    supportsOutpainting: true,
    supportsBackgroundRemoval: true,
    supportsTransparency: false, // Outputs opaque PNG/JPEG; transparency handled via client-side matting
    maxDimensions: { width: 2048, height: 2048 },
    averageLatencyMs: 3400,
  },
  huggingface: {
    providerId: "huggingface",
    supportsInpainting: true,
    supportsMaskInput: true,
    supportsOutpainting: true,
    supportsBackgroundRemoval: false,
    supportsTransparency: false,
    maxDimensions: { width: 1536, height: 1536 },
    averageLatencyMs: 4200,
  },
  local: {
    providerId: "local",
    supportsInpainting: true,
    supportsMaskInput: true,
    supportsOutpainting: true,
    supportsBackgroundRemoval: true,
    supportsTransparency: true, // Native RGBA support in Diffusers / OpenCV
    maxDimensions: { width: 2048, height: 2048 },
    averageLatencyMs: 2800,
  },
  pollinations: {
    providerId: "pollinations",
    supportsInpainting: false,
    supportsMaskInput: false,
    supportsOutpainting: false,
    supportsBackgroundRemoval: false,
    supportsTransparency: false,
    maxDimensions: { width: 1024, height: 1024 },
    averageLatencyMs: 3800,
  },
  openai: {
    providerId: "openai",
    supportsInpainting: false, // DALL-E 3 does not accept mask or reference inputs via public API
    supportsMaskInput: false,
    supportsOutpainting: false,
    supportsBackgroundRemoval: false,
    supportsTransparency: false,
    maxDimensions: { width: 1024, height: 1024 },
    averageLatencyMs: 5800,
  },
  "azure-openai": {
    providerId: "azure-openai",
    supportsInpainting: false,
    supportsMaskInput: false,
    supportsOutpainting: false,
    supportsBackgroundRemoval: false,
    supportsTransparency: false,
    maxDimensions: { width: 1024, height: 1024 },
    averageLatencyMs: 5800,
  },
  "ai-horde": {
    providerId: "ai-horde",
    supportsInpainting: false,
    supportsMaskInput: false,
    supportsOutpainting: false,
    supportsBackgroundRemoval: false,
    supportsTransparency: false,
    maxDimensions: { width: 1024, height: 1024 },
    averageLatencyMs: 25000,
  },
  cloudflare: {
    providerId: "cloudflare",
    supportsInpainting: false,
    supportsMaskInput: false,
    supportsOutpainting: false,
    supportsBackgroundRemoval: false,
    supportsTransparency: false,
    maxDimensions: { width: 1024, height: 1024 },
    averageLatencyMs: 4500,
  },
};

/**
 * Resolves the premier and fallback providers for an image editing operation.
 */
export function resolveEditingProvider(
  operation: EditingOperationType,
  preferredProvider?: ImageProviderChoice,
  hasMask: boolean = false,
  needsTransparency: boolean = false
): {
  primaryProvider: ImageProviderId;
  fallbackProviders: ImageProviderId[];
  warnings: string[];
} {
  const warnings: string[] = [];

  // 1. Transparency requirement check
  if (needsTransparency || operation === "background_removal") {
    // Handled locally or via client matting canvas
    return {
      primaryProvider: "local",
      fallbackProviders: ["gemini"],
      warnings,
    };
  }

  // 2. Reject incompatible preferred providers
  if (preferredProvider === "openai" && (hasMask || operation === "inpainting" || operation === "outpainting")) {
    warnings.push(
      "OpenAI DALL-E 3 does not support mask-conditioned inpainting. Automatically re-routed to Gemini multimodal inpainting."
    );
  }

  if (preferredProvider === "azure-openai" && (hasMask || operation === "inpainting" || operation === "outpainting")) {
    warnings.push(
      "Azure OpenAI DALL-E 3 does not support mask-conditioned inpainting. Automatically re-routed to Gemini multimodal inpainting."
    );
  }

  if (preferredProvider === "pollinations" && hasMask) {
    warnings.push(
      "Pollinations cloud endpoints do not support mask inputs. Automatically re-routed to Gemini inpainting."
    );
  }

  // 3. Select capable candidate
  const candidates: ImageProviderId[] = ["gemini", "huggingface", "local"];
  const capable = candidates.filter((p) => {
    const cap = EDITING_PROVIDER_CAPABILITIES[p];
    if (getCooldownRemaining(p) > 0) return false;
    if (hasMask && !cap.supportsMaskInput) return false;
    if (operation === "outpainting" && !cap.supportsOutpainting) return false;
    return true;
  });

  const primary: ImageProviderId =
    preferredProvider && preferredProvider !== "auto" && capable.includes(preferredProvider as ImageProviderId)
      ? (preferredProvider as ImageProviderId)
      : capable[0] || "gemini";

  const fallbacks = capable.filter((p) => p !== primary);

  return {
    primaryProvider: primary,
    fallbackProviders: fallbacks,
    warnings,
  };
}

