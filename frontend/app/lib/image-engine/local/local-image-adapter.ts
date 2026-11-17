/**
 * TATTVA AI - Local Image Engine Adapter
 * Connects the in-process local neural synthesizer to the image engine provider cascade.
 * 
 * Supports:
 * - 100% offline generation with zero network access
 * - Sharp raster validation
 * - Hardware metrics and device profiling
 * - Automatic persistence to `.tattva_vault/images/local/`
 */

import sharp from "sharp";
import { generateLocalImage, type LocalImageResult } from "../../local-ai-engine/image/local-image-synthesizer";
import { profileImageGenerationHardware } from "../../local-ai-engine/image/hardware-profiler";
import type { ProviderRequest, ProviderResult } from "../types";

export const LOCAL_IMAGE_MODEL_ID = "tattva-native-neural-synthesizer";

/**
 * Checks whether the local image engine is available.
 * Always true on local workstation environments since it runs in-process.
 */
export function isLocalImageEngineAvailable(): boolean {
  return true;
}

/**
 * Generates an image using the local in-process neural synthesizer.
 */
export async function generateWithLocalImageEngine(
  req: ProviderRequest,
  options: { forceCpu?: boolean; userId?: string } = {}
): Promise<ProviderResult> {
  const started = Date.now();
  const width = req.width || 1024;
  const height = req.height || 1024;
  const seed = typeof req.seed === "number" ? req.seed : Math.floor(Math.random() * 1_000_000);

  const localResult: LocalImageResult = await generateLocalImage({
    prompt: req.prompt,
    negativePrompt: req.negativePrompt,
    width,
    height,
    seed,
    aspectRatio: req.aspectRatio,
    forceCpu: options.forceCpu,
    userId: options.userId,
  });

  // Verify that image payload is genuine, valid PNG buffer
  const meta = await sharp(localResult.buffer).metadata();
  if (!meta.width || !meta.height || meta.format !== "png") {
    throw new Error(`Local image engine produced an invalid image format (${meta.format}).`);
  }

  return {
    image: localResult.dataUri,
    provider: "local",
    model: LOCAL_IMAGE_MODEL_ID,
    seed: localResult.seed,
    width: meta.width,
    height: meta.height,
    latencyMs: Date.now() - started,
    revisedPrompt: `[LOCAL SYNTHESIS: ${localResult.backend}] ${req.prompt}`,
  };
}

export { profileImageGenerationHardware };
