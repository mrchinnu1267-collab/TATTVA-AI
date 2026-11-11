/**
 * TATTVA AI - Intelligent Enhancement Router (Phase F)
 * Analyzes image dimensions, hardware memory constraints (RTX 3050 4GB VRAM),
 * and selects the premier model and execution pipeline with automatic cloud offloading.
 */

import {
  EnhancementOperation,
  ImageEnhancementOptions,
  SUPER_RES_MODELS,
  SuperResolutionModelId,
  SuperResolutionModelSpec,
} from "./types";
import { isRunningOnVercel, isLocalhostUrl, getLocalBaseUrl } from "../providers";

export interface EnhancementRoutingDecision {
  selectedModel: SuperResolutionModelSpec;
  fallbackModel: SuperResolutionModelSpec;
  targetScale: 2 | 4;
  appliedOperations: EnhancementOperation[];
  executionMode: "local_cuda" | "cloud_space" | "universal_server";
  estimatedVramMb: number;
  memorySafe: boolean;
  maxOutputDimensions: { width: number; height: number };
  rationale: string;
  warnings: string[];
}

/**
 * Extracts approximate dimensions and byte size from a base64 data URI without heavy dependencies.
 */
export function inspectImagePayload(dataUri: string): {
  estimatedWidth: number;
  estimatedHeight: number;
  sizeBytes: number;
  mimeType: string;
} {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUri);
  const mimeType = match ? match[1] : "image/png";
  const base64Data = match ? match[2] : dataUri;
  const sizeBytes = Math.round((base64Data.length * 3) / 4);

  // Default baseline dimension heuristic based on byte density
  let estimatedWidth = 1024;
  let estimatedHeight = 1024;

  if (sizeBytes < 150_000) {
    estimatedWidth = 512;
    estimatedHeight = 512;
  } else if (sizeBytes > 1_500_000) {
    estimatedWidth = 1536;
    estimatedHeight = 1536;
  }

  return {
    estimatedWidth,
    estimatedHeight,
    sizeBytes,
    mimeType,
  };
}

/**
 * Evaluates hardware feasibility on the target RTX 3050 (4 GB VRAM limit).
 * PyTorch diffusion/super-res models allocate:
 *   VRAM ≈ Model_Weights + (Batch * Channels * Width * Height * Scale^2 * FP_Bytes * Overhead)
 */
export function estimateVramFootprintMb(
  inputWidth: number,
  inputHeight: number,
  scale: 2 | 4,
  modelArch: string
): number {
  const baseWeightMb = modelArch === "swin_transformer" ? 1800 : 1200;
  const outputPixels = inputWidth * inputHeight * (scale * scale);
  // RRDB/Swin intermediate feature maps and attention buffers take ~120 bytes per output pixel in FP32
  const activationMb = Math.round((outputPixels * 120) / (1024 * 1024));
  return baseWeightMb + activationMb;
}

/**
 * Intelligently routes the enhancement request to the optimal model and execution mode.
 */
export function routeEnhancement(options: ImageEnhancementOptions): EnhancementRoutingDecision {
  const {
    image,
    scale = 2,
    operations = ["upscale_2x", "detail_enhance", "noise_reduction"],
    model = "auto",
    preserveFaces = true,
  } = options;

  const targetScale: 2 | 4 = scale === 4 || operations.includes("upscale_4x") ? 4 : 2;
  const { estimatedWidth, estimatedHeight, sizeBytes } = inspectImagePayload(image);
  const onVercel = isRunningOnVercel();
  const localUrl = getLocalBaseUrl();
  const localIsHosted = Boolean(localUrl && !isLocalhostUrl(localUrl));
  const warnings: string[] = [];

  // 1. Select Model by Task Characteristics
  let candidateId: SuperResolutionModelId = "real-esrgan-x4plus";

  if (model && model !== "auto" && SUPER_RES_MODELS[model]) {
    candidateId = model;
  } else if (preserveFaces && operations.includes("detail_enhance")) {
    candidateId = "gfpgan-face-restore";
  } else if (operations.includes("artifact_removal") && operations.includes("noise_reduction")) {
    candidateId = "swinir-realworld-sr";
  } else if (targetScale === 2) {
    candidateId = "real-esrgan-x2plus";
  } else {
    candidateId = "real-esrgan-x4plus";
  }

  const primaryModel = SUPER_RES_MODELS[candidateId];
  const fallbackModel = SUPER_RES_MODELS["neural-bilateral-lanczos"];

  // 2. Hardware Memory Safety Assessment (RTX 3050 4GB = 4096MB)
  const MAX_SAFE_VRAM_MB = 3800; // 3.8 GB headroom
  const estimatedVramMb = estimateVramFootprintMb(
    estimatedWidth,
    estimatedHeight,
    targetScale,
    primaryModel.architecture
  );

  let executionMode: "local_cuda" | "cloud_space" | "universal_server" = "cloud_space";
  let memorySafe = true;

  if (onVercel) {
    // Cloud container / serverless: offload to cloud spaces or universal engine
    executionMode = localIsHosted ? "local_cuda" : "universal_server";
    if (!localIsHosted) {
      warnings.push("Cloud serverless deployment detected. Offloading super-resolution to high-capacity cloud pipeline.");
    }
  } else if (estimatedVramMb > MAX_SAFE_VRAM_MB) {
    // Local hardware protection: RTX 3050 4GB cannot safely run un-tiled 4K super-resolution
    executionMode = "cloud_space";
    memorySafe = false;
    warnings.push(
      `Estimated VRAM (${estimatedVramMb} MB) exceeds local RTX 3050 4GB boundary. Tiled cloud inference engaged to prevent GPU crash.`
    );
  } else {
    executionMode = "local_cuda";
  }

  // 3. Assemble Applied Operations
  const appliedSet = new Set<EnhancementOperation>(operations);
  if (targetScale === 4) {
    appliedSet.delete("upscale_2x");
    appliedSet.add("upscale_4x");
  } else {
    appliedSet.delete("upscale_4x");
    appliedSet.add("upscale_2x");
  }
  const appliedOperations = Array.from(appliedSet);

  // 4. Output Dimensions
  const maxOutputDimensions = {
    width: Math.min(primaryModel.maxOutputResolution.width, estimatedWidth * targetScale),
    height: Math.min(primaryModel.maxOutputResolution.height, estimatedHeight * targetScale),
  };

  const rationale =
    `Selected: "${primaryModel.name}" (${primaryModel.architecture}) for ${targetScale}x scaling. ` +
    `Hardware execution: ${executionMode.toUpperCase()} (estimated ${estimatedVramMb}MB footprint). ` +
    `Preservation: Face landmarks=${preserveFaces}, Colors=RGB-histogram locked.`;

  return {
    selectedModel: primaryModel,
    fallbackModel,
    targetScale,
    appliedOperations,
    executionMode,
    estimatedVramMb,
    memorySafe,
    maxOutputDimensions,
    rationale,
    warnings,
  };
}
