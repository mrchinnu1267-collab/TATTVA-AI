/**
 * TATTVA AI - Advanced Reference Image Conditioning Engine (Phase B)
 * Master orchestrator for reference image validation, semantic analysis,
 * intent classification, strength calibration, and capability-guarded fallback.
 */

import { validateReferenceImage } from "./validator";
import { analyzeReferenceImage, classifyConditioningIntent } from "./analyzer";
import {
  checkProviderReferenceSupport,
  filterCompatibleReferenceProviders,
  PROVIDER_REFERENCE_CAPABILITIES,
} from "./capabilities";
import type {
  ConditioningIntent,
  ReferenceAnalysis,
  ReferenceConditioningPlan,
  ReferenceImageValidation,
} from "./types";
import type { AspectRatio, ImageProviderId, ImageStyle } from "../types";

export * from "./types";
export * from "./validator";
export * from "./analyzer";
export * from "./capabilities";

/**
 * Builds a comprehensive Reference Conditioning Plan for the generation engine.
 */
export async function createReferenceConditioningPlan(params: {
  prompt: string;
  referenceImage: string;
  style?: ImageStyle;
  aspectRatio?: AspectRatio;
  requestedStrength?: number;
}): Promise<ReferenceConditioningPlan> {
  const { prompt, referenceImage, style, aspectRatio = "1:1", requestedStrength } = params;
  const warnings: string[] = [];

  // 1. Mandatory Format & Size Validation
  const validation: ReferenceImageValidation = validateReferenceImage(referenceImage);
  if (!validation.isValid) {
    throw new Error(`Reference image validation failed: ${validation.error}`);
  }

  // 2. Visual Semantic Analysis & Intent Classification
  const intent: ConditioningIntent = classifyConditioningIntent(prompt);
  const analysis: ReferenceAnalysis = await analyzeReferenceImage(referenceImage, prompt);

  // 3. Resolve Effective Conditioning Strength
  let effectiveStrength = intent.recommendedStrength;
  if (typeof requestedStrength === "number" && !isNaN(requestedStrength)) {
    effectiveStrength = Math.max(0.05, Math.min(0.95, requestedStrength));
  }

  // 4. Synthesize Provider-Specific Conditioned Prompts
  const preservationText = intent.preservationDirectives.join(" ");
  const modificationText = intent.modificationDirectives.join(" ");

  // Gemini: Multimodal semantic instructions
  const geminiConditioned = [
    `Reference-conditioned generation [${intent.intentType}]:`,
    prompt,
    `Preserve from reference image: ${intent.lockedEntities.join(", ")}. ${preservationText}`,
    `Modifications to apply: ${modificationText}`,
    `Visual style: ${style || "coherent with reference"}`,
    `Output aspect ratio: ${aspectRatio}.`,
  ].join("\n\n");

  // SDXL: Visual descriptors, subject first, preservation tags
  const sdxlConditioned = [
    `${intent.lockedEntities.join(", ")}, ${prompt}`,
    preservationText ? `consistent features: ${preservationText}` : "",
    analysis.colorPalette.length > 0 ? `palette: ${analysis.colorPalette.slice(0, 3).join(", ")}` : "",
    style && style !== "auto" ? `${style} style` : "",
  ]
    .filter(Boolean)
    .join(", ");

  // Local Diffusers: Subject + prompt + conditioning strength
  const localConditioned = `${prompt}, reference conditioning: ${intent.lockedEntities.join(", ")}`;

  // OpenAI: Unsupported for reference images - mark clearly so router bypasses it
  const openaiConditioned = prompt;

  const promptsByProvider: Record<ImageProviderId, string> = {
    "nano-banana": geminiConditioned,
    gemini: geminiConditioned,
    huggingface: sdxlConditioned,
    pollinations: prompt,
    local: localConditioned,
    openai: openaiConditioned,
    "azure-openai": openaiConditioned,
    "ai-horde": prompt,
    cloudflare: prompt,
  };

  if (validation.aspectRatio && validation.aspectRatio !== aspectRatio) {
    warnings.push(
      `Reference image aspect ratio (${validation.aspectRatio}) differs from target aspect ratio (${aspectRatio}). Subject framing will adapt to target bounds.`
    );
  }

  return {
    originalPrompt: prompt,
    referenceImage,
    validation,
    analysis,
    intent,
    effectiveStrength,
    promptsByProvider,
    warnings,
  };
}

