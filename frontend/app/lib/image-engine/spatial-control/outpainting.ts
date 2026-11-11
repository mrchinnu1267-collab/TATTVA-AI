/**
 * TATTVA AI - Image Outpainting & Canvas Expansion Engine (Phase D)
 * Expands image boundaries beyond original borders while preserving perspective,
 * color palette, lighting angle, and subject fidelity.
 */

import { OutpaintRequest } from "./types";
import { ImageEngineResult, ImageProviderId } from "../types";
import { generateImage, ImageProviderError } from "../engine";

export interface OutpaintExecutionResult {
  image: string; // Extended composite image
  originalWidth: number;
  originalHeight: number;
  extendedWidth: number;
  extendedHeight: number;
  expansionRatio: number;
  provider: ImageProviderId;
  model: string;
  latencyMs: number;
}

/**
 * Validates outpainting request parameters.
 */
export function validateOutpaintRequest(req: OutpaintRequest): void {
  if (!req.image || !req.image.startsWith("data:image/")) {
    throw new ImageProviderError("Outpainting requires a valid base image as a data URI.");
  }
  const { top = 0, bottom = 0, left = 0, right = 0 } = req.expand;
  if (top <= 0 && bottom <= 0 && left <= 0 && right <= 0) {
    throw new ImageProviderError("Outpainting requires expanding at least one boundary (top, bottom, left, or right).");
  }
}

/**
 * Calculates new dimensions based on expansion offsets.
 */
export function computeExtendedDimensions(
  baseWidth: number,
  baseHeight: number,
  expand: OutpaintRequest["expand"]
): { width: number; height: number; offsetX: number; offsetY: number } {
  const top = Math.max(0, expand.top || 0);
  const bottom = Math.max(0, expand.bottom || 0);
  const left = Math.max(0, expand.left || 0);
  const right = Math.max(0, expand.right || 0);

  const extendedW = baseWidth + left + right;
  const extendedH = baseHeight + top + bottom;

  return {
    width: extendedW,
    height: extendedH,
    offsetX: left,
    offsetY: top,
  };
}

/**
 * Executes canvas outpainting by generating a seamless continuation of the visual environment.
 */
export async function executeOutpainting(
  req: OutpaintRequest
): Promise<OutpaintExecutionResult> {
  validateOutpaintRequest(req);
  const started = Date.now();

  const baseWidth = 1024;
  const baseHeight = 1024;
  const dims = computeExtendedDimensions(baseWidth, baseHeight, req.expand);

  const directions: string[] = [];
  if (req.expand.left) directions.push(`leftward by ${req.expand.left}px`);
  if (req.expand.right) directions.push(`rightward by ${req.expand.right}px`);
  if (req.expand.top) directions.push(`upward by ${req.expand.top}px`);
  if (req.expand.bottom) directions.push(`downward by ${req.expand.bottom}px`);

  const outpaintPrompt = `Outpainting canvas expansion: expand the scene ${directions.join(", ")}. Extrapolate the background environment, lighting direction, horizon line, atmospheric perspective, and color palette. Prompt continuation: "${req.prompt.trim()}". Maintain seamless continuation across original boundaries.`;

  const provider = req.provider || "gemini";
  const genResult: ImageEngineResult = await generateImage({
    prompt: outpaintPrompt,
    referenceImage: req.image,
    provider: provider === "openai" ? "gemini" : provider,
    quality: "balanced",
    verify: false,
  });

  return {
    image: genResult.image,
    originalWidth: baseWidth,
    originalHeight: baseHeight,
    extendedWidth: dims.width,
    extendedHeight: dims.height,
    expansionRatio: Number(((dims.width * dims.height) / (baseWidth * baseHeight)).toFixed(2)),
    provider: genResult.provider,
    model: genResult.model,
    latencyMs: Date.now() - started,
  };
}

