/**
 * TATTVA AI - Comprehensive Provider Capability Registry (Phase X)
 * Verifies and enforces actual provider capabilities across text-to-image,
 * reference-image conditioning, inpainting, outpainting, editing, and resolution.
 * Strictly prevents routing incompatible operations to unsupported providers.
 */

import { ImageProviderId } from "./types";

export type ImageOperationType =
  | "text_to_image"
  | "reference_image"
  | "image_editing"
  | "inpainting"
  | "outpainting"
  | "high_resolution";

export interface ProviderCapabilityProfile {
  providerId: ImageProviderId;
  label: string;
  supportsTextToImage: boolean;
  supportsReferenceImage: boolean;
  supportsImageEditing: boolean;
  supportsInpainting: boolean;
  supportsOutpainting: boolean;
  supportsHighResolution: boolean;
  maxResolution: number;
  supportedAspectRatios: string[];
  supportedInputFormats: string[];
  limitations: string[];
}

export const PROVIDER_CAPABILITIES: Record<ImageProviderId, ProviderCapabilityProfile> = {
  gemini: {
    providerId: "gemini",
    label: "Google Gemini Image",
    supportsTextToImage: true,
    supportsReferenceImage: true,
    supportsImageEditing: true,
    supportsInpainting: true,
    supportsOutpainting: true,
    supportsHighResolution: true,
    maxResolution: 2048,
    supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    supportedInputFormats: ["png", "jpeg", "webp", "gif"],
    limitations: [
      "Subject to Google AI Studio quota limits (HTTP 429).",
      "Native multimodal handles editing via instruction prompts rather than binary mask buffers.",
    ],
  },
  huggingface: {
    providerId: "huggingface",
    label: "Hugging Face SDXL / Animagine / FLUX",
    supportsTextToImage: true,
    supportsReferenceImage: true,
    supportsImageEditing: true,
    supportsInpainting: true,
    supportsOutpainting: true,
    supportsHighResolution: true,
    maxResolution: 1536,
    supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    supportedInputFormats: ["png", "jpeg", "webp"],
    limitations: [
      "ZeroGPU spaces may enforce temporary concurrency run limits.",
      "Dedicated spaces require up to 45s for cold start initialization.",
    ],
  },
  pollinations: {
    providerId: "pollinations",
    label: "Pollinations FLUX Cloud",
    supportsTextToImage: true,
    supportsReferenceImage: false, // Text-to-image only
    supportsImageEditing: false,
    supportsInpainting: false,
    supportsOutpainting: false,
    supportsHighResolution: true,
    maxResolution: 1024,
    supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    supportedInputFormats: [],
    limitations: [
      "Zero-auth public endpoint; does not accept binary masks or reference images.",
      "GET URLs require clean, unbloated query strings under 400 characters to prevent HTTP 503.",
      "Cannot be used as fallback for inpainting, outpainting, or reference-image workflows.",
    ],
  },
  openai: {
    providerId: "openai",
    label: "OpenAI DALL-E 3",
    supportsTextToImage: true,
    supportsReferenceImage: false, // DALL-E 3 API does not support reference input images
    supportsImageEditing: false,
    supportsInpainting: false,
    supportsOutpainting: false,
    supportsHighResolution: true,
    maxResolution: 1792,
    supportedAspectRatios: ["1:1", "16:9"],
    supportedInputFormats: [],
    limitations: [
      "DALL-E 3 does not accept reference images or masks.",
      "Requires explicit OPENAI_API_KEY with active paid tier credits.",
      "Fixed aspect ratios (1024x1024 or 1792x1024).",
    ],
  },
  local: {
    providerId: "local",
    label: "Local CUDA Diffusers Engine",
    supportsTextToImage: true,
    supportsReferenceImage: true,
    supportsImageEditing: true,
    supportsInpainting: true,
    supportsOutpainting: true,
    supportsHighResolution: true,
    maxResolution: 1536,
    supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    supportedInputFormats: ["png", "jpeg", "webp"],
    limitations: [
      "Requires active local Python server (image-engine/main.py) on port 8001.",
      "Disabled on cloud serverless deployments (Vercel) without external GPU URL.",
    ],
  },
};

/**
 * Checks whether a given provider supports an operation.
 */
export function isProviderCompatibleWithOperation(
  provider: ImageProviderId,
  operation: ImageOperationType
): boolean {
  const profile = PROVIDER_CAPABILITIES[provider];
  if (!profile) return false;

  switch (operation) {
    case "text_to_image":
      return profile.supportsTextToImage;
    case "reference_image":
      return profile.supportsReferenceImage;
    case "image_editing":
      return profile.supportsImageEditing;
    case "inpainting":
      return profile.supportsInpainting;
    case "outpainting":
      return profile.supportsOutpainting;
    case "high_resolution":
      return profile.supportsHighResolution;
    default:
      return false;
  }
}

/**
 * Filters a candidate provider list, retaining strictly those that support all requested operations.
 */
export function filterCompatibleProviders(
  candidateOrder: ImageProviderId[],
  requiredOperations: ImageOperationType[]
): {
  compatible: ImageProviderId[];
  incompatible: { provider: ImageProviderId; reason: string }[];
} {
  const compatible: ImageProviderId[] = [];
  const incompatible: { provider: ImageProviderId; reason: string }[] = [];

  for (const provider of candidateOrder) {
    const profile = PROVIDER_CAPABILITIES[provider];
    if (!profile) {
      incompatible.push({ provider, reason: "Unknown provider identifier." });
      continue;
    }

    const unsupportedOps = requiredOperations.filter(
      (op) => !isProviderCompatibleWithOperation(provider, op)
    );

    if (unsupportedOps.length === 0) {
      compatible.push(provider);
    } else {
      incompatible.push({
        provider,
        reason: `Does not support operations: ${unsupportedOps.join(", ")}.`,
      });
    }
  }

  return { compatible, incompatible };
}

