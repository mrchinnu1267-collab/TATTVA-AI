/**
 * Image engine orchestration:
 *   compile -> generate -> verify -> refine/retry -> return the best attempt.
 */

import { compileImagePrompt, refinePrompt, constructIntelligentRefinedPrompt } from "./prompt-compiler";
import {
  generateWithProvider,
  getCooldownRemaining,
  getCooldownEntry,
  ImageProviderError,
  resolveProviderOrder,
} from "./providers";
import { isProviderCompatibleWithOperation } from "./provider-capabilities";
import { verifyImage } from "./verifier";
import { validateReferenceImage } from "./reference-conditioning";
import { resolveReferenceImageAsDataUri } from "./image-utils";
import { routeImageRequest, recordGenerationOutcome } from "./multi-model-router";
import { evaluateVisualQuality } from "./visual-evaluation";
import { calculateCloudflareUsage, resolveCloudflareSteps } from "./cloudflare/cloudflare-adapter";
import {
  moderateTextPrompt,
  moderateVisualImage,
  SAFETY_REJECTION_MESSAGE,
} from "../content-moderation";
import type {
  CompiledImagePrompt,
  ImageAttempt,
  ImageEngineResult,
  ImageGenerationOptions,
  ImageProviderId,
  ImageVerification,
  ProviderRequest,
  ProviderResult,
} from "./types";

function resolveMaxAttempts(options: ImageGenerationOptions): number {
  if (typeof options.maxAttempts === "number" && Number.isFinite(options.maxAttempts)) {
    return Math.max(1, Math.min(4, Math.floor(options.maxAttempts)));
  }
  const quality = options.quality || "balanced";
  return quality === "fast" ? 1 : quality === "max" ? 3 : 2;
}

function requestFor(
  compiled: CompiledImagePrompt,
  prompt: string,
  attempt: number,
  provider?: ImageProviderId
): ProviderRequest {
  const providerPrompt =
    attempt === 0 && provider && compiled.promptsByProvider?.[provider]
      ? compiled.promptsByProvider[provider]
      : prompt;
  return {
    prompt: providerPrompt,
    negativePrompt: compiled.negative,
    width: compiled.width,
    height: compiled.height,
    steps: compiled.steps,
    guidance: compiled.guidance,
    // A new seed on retries gives the model a chance to fix mistakes.
    seed: (compiled.seed + attempt * 9973) % 2_147_483_647,
    aspectRatio: compiled.aspectRatio,
    quality: compiled.quality,
    referenceImage: compiled.referenceImage,
    strength: compiled.strength,
    activeAdapterId: compiled.activeAdapterId,
    adapterScale: compiled.adapterScale,
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function generateImage(options: ImageGenerationOptions): Promise<ImageEngineResult> {
  const prompt = options.prompt?.trim();
  if (!prompt) throw new Error("A prompt is required.");
  if (options.provider === "cloudflare" && options.referenceImage) {
    throw new Error("Cloudflare FLUX.1 Schnell supports text-to-image requests only.");
  }

  // 1. Mandatory Pre-Generation Content Moderation
  const moderationCheck = moderateTextPrompt(prompt);
  if (!moderationCheck.isSafe) {
    throw new ImageProviderError(
      SAFETY_REJECTION_MESSAGE,
      { retryable: false }
    );
  }

  // 2. Reference Image Moderation & Validation (if supplied)
  if (options.referenceImage) {
    let resolvedRef = options.referenceImage;
    if (resolvedRef.startsWith("http://") || resolvedRef.startsWith("https://")) {
      try {
        resolvedRef = await resolveReferenceImageAsDataUri(resolvedRef);
        options.referenceImage = resolvedRef;
      } catch (refFetchErr) {
        console.warn("[Image Engine] Could not fetch remote reference image URL. Proceeding with text-to-image:", refFetchErr);
        options.referenceImage = undefined;
      }
    }

    if (options.referenceImage) {
      const validation = validateReferenceImage(options.referenceImage);
      if (!validation.isValid) {
        throw new ImageProviderError(
          `Reference image validation failed: ${validation.error}`,
          { retryable: false }
        );
      }
      const refModeration = await moderateVisualImage(options.referenceImage);
      if (!refModeration.isSafe) {
        throw new ImageProviderError(
          SAFETY_REJECTION_MESSAGE,
          { retryable: false }
        );
      }
    }
  }

  const started = Date.now();
  const compiled = compileImagePrompt({ ...options, prompt });
  // Automatic Refinement Loop: max 4 attempts, target 95% adherence
  const maxAttempts = Math.min(4, Math.max(1, options.maxAttempts ?? 4));
  const verify = options.verify !== false;
  const targetScore = Math.max(50, Math.min(100, options.targetScore ?? 95));

  const warnings: string[] = [];
  // Resolve active providers based on configuration, request preference, and capabilities
  const order: ImageProviderId[] = resolveProviderOrder(
    options.provider,
    options.quality,
    Boolean(options.referenceImage)
  );
  const attempts: ImageAttempt[] = [];
  let best: {
    result: ProviderResult;
    verification: ImageVerification;
    prompt: string;
  } | null = null;
  let lastError = "";

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt === 0) {
      options.onStageChange?.("generating", 1, maxAttempts);
    } else {
      const refinementStartedAt = new Date().toISOString();
      options.onStageChange?.("refining", attempt + 1, maxAttempts, best?.verification.score, {
        refinementStartedAt,
      });
    }

    // Intelligent prompt refinement using Gemini Vision feedback from previous best attempt
    const attemptPrompt: string =
      attempt === 0 || !best
        ? compiled.positive
        : constructIntelligentRefinedPrompt({
            originalPrompt: compiled.prompt,
            compiledPrompt: compiled.positive,
            verification: best.verification,
            attempt,
          });

    if (attempt > 0) {
      const refinementCompletedAt = new Date().toISOString();
      options.onStageChange?.("refining", attempt + 1, maxAttempts, best?.verification.score, {
        refinementCompletedAt,
      });
    }

    let generated = false;

    // Filter candidate providers strictly by requested operation capability
    const compatibleOrder = options.referenceImage
      ? order.filter((p) => isProviderCompatibleWithOperation(p, "reference_image"))
      : order;

    // Check which compatible providers in order are healthy and not in cooldown
    let providersToTry = compatibleOrder.filter((p) => getCooldownRemaining(p) === 0);

    if (providersToTry.length === 0 && compatibleOrder.length > 0) {
      const retryableTransientCandidates = compatibleOrder
        .map((p) => ({
          provider: p,
          entry: getCooldownEntry(p),
          remaining: getCooldownRemaining(p),
        }))
        .filter((c) => {
          if (!c.entry) return false;
          if (!c.entry.isRetryable) return false;
          if (
            c.entry.category === "QUOTA_EXHAUSTION" ||
            c.entry.category === "INVALID_AUTHENTICATION" ||
            c.entry.category === "MODEL_CONFIGURATION_ERROR"
          ) {
            return false;
          }
          return c.entry.consecutiveFailures <= 2;
        })
        .sort((a, b) => a.remaining - b.remaining);

      if (retryableTransientCandidates.length > 0) {
        providersToTry = [retryableTransientCandidates[0].provider];
      }
    }

    if (providersToTry.length === 0) {
      if (!lastError) {
        lastError = compatibleOrder.length > 0
          ? `All candidate image providers (${compatibleOrder.join(", ")}) are currently in cooldown or quota exhausted.`
          : "No compatible image generation providers available for this request.";
      }
      break;
    }

    for (const provider of providersToTry) {
      const request = requestFor(compiled, attemptPrompt, attempt, provider);
      const providerStarted = Date.now();

      try {
        const fluxRequestedAt = new Date().toISOString();
        options.onStageChange?.("generating", attempt + 1, maxAttempts, undefined, {
          fluxRequestedAt,
        });

        const result = await generateWithProvider(provider, request);
        generated = true;

        const fluxRespondedAt = new Date().toISOString();
        options.onStageChange?.("generating", attempt + 1, maxAttempts, undefined, {
          fluxRequestedAt,
          fluxRespondedAt,
        });

        // Full Gemini Vision verification enabled for Cloudflare FLUX.1 Schnell
        const geminiVerificationStartedAt = new Date().toISOString();
        options.onStageChange?.("verifying", attempt + 1, maxAttempts, undefined, {
          fluxRequestedAt,
          fluxRespondedAt,
          geminiVerificationStartedAt,
        });

        const verification = await verifyImage({
          image: result.image,
          compiled,
          requirements: compiled.requirements,
          useVision: verify,
        });

        const geminiVerificationCompletedAt = new Date().toISOString();
        options.onStageChange?.("verifying", attempt + 1, maxAttempts, verification.score, {
          fluxRequestedAt,
          fluxRespondedAt,
          geminiVerificationStartedAt,
          geminiVerificationCompletedAt,
        });

        attempts.push({
          index: attempts.length + 1,
          provider: result.provider,
          model: result.model,
          seed: result.seed,
          latencyMs: Date.now() - providerStarted,
          prompt: attemptPrompt,
          verification,
          image: result.image,
          missingRequirements: verification.missingRequirements,
          correctedPrompt: verification.suggestedFix,
        });

        const hasNsfw = verification.issues.some((issue) =>
          /prohibited adult|nudity|nude content|explicit sexual|harmful/i.test(issue)
        );
        if (hasNsfw) {
          throw new ImageProviderError(
            SAFETY_REJECTION_MESSAGE,
            { retryable: false }
          );
        }

        // Best image selection: NEVER replace a higher-scoring image with a lower-scoring image!
        if (!best || verification.score > best.verification.score) {
          best = { result, verification, prompt: attemptPrompt };
        }

        break;
      } catch (error) {
        lastError = messageOf(error);
        attempts.push({
          index: attempts.length + 1,
          provider,
          model: provider,
          seed: request.seed,
          latencyMs: Date.now() - providerStarted,
          prompt: attemptPrompt,
          error: lastError,
        });
        warnings.push(`${provider}: ${lastError}`);
        if (lastError.includes(SAFETY_REJECTION_MESSAGE)) {
          throw error;
        }

        const isNonRetryable =
          error instanceof ImageProviderError &&
          (!error.retryable ||
            error.category === "QUOTA_EXHAUSTION" ||
            error.category === "INVALID_AUTHENTICATION" ||
            error.category === "MODEL_CONFIGURATION_ERROR");

        if (isNonRetryable && providersToTry.length <= 1) {
          break;
        }
      }
    }

    // Stop conditions:
    // 1. Target adherence achieved (score >= 95)
    if (best && best.verification.score >= targetScore) break;
    // 2. Vision verification unavailable (avoid useless retries when vision is offline/missing key)
    if (best && best.verification.method === "unavailable") break;
    // 3. Provider failed to generate on final attempt or non-retryable failure encountered
    if (!generated) {
      const isFatalNonRetryable =
        /quota|limit:\s*0|credits|429|unauthorized|forbidden|invalid.*key|neurons/i.test(lastError);
      if (isFatalNonRetryable || attempt >= maxAttempts - 1) {
        break;
      }
    }
  }

  if (!best) {
    const attemptedProvider = options.provider || (order.length > 0 ? order.join("/") : "AI Image Engine");
    throw new ImageProviderError(
      lastError || `Image generation failed on provider (${attemptedProvider}). Please try again.`
    );
  }

  // Record attempt history on best verification
  best.verification.attemptHistory = attempts
    .filter((a) => a.verification)
    .map((a) => ({
      attempt: a.index,
      score: a.verification!.score,
      latencyMs: a.latencyMs,
      missing: a.verification!.missingRequirements,
      correction: a.verification!.suggestedFix,
    }));
  best.verification.targetAchieved = best.verification.score >= targetScore;

  // Post-Generation Output Visual Verification (avoid duplicate vision call if already verified by Gemini Vision)
  if (best.verification.method !== "vision") {
    const outputCheck = await moderateVisualImage(best.result.image);
    if (!outputCheck.isSafe) {
      throw new ImageProviderError(
        SAFETY_REJECTION_MESSAGE,
        { retryable: false }
      );
    }
  }

  const latencyMs = Date.now() - started;
  const accuracy = best.verification.score;
  const successfulAttempts = attempts.filter((item) => !item.error).length;
  const usage = calculateCloudflareUsage(1024, 1024, resolveCloudflareSteps(compiled.quality));
  const estimatedCostUsd = usage.estimatedCostUsd;

  recordGenerationOutcome({
    modelId: best.result.model,
    providerId: best.result.provider,
    category: "text_to_image",
    success: true,
    latencyMs,
    accuracyScore: accuracy,
  });

  return {
    image: best.result.image,
    provider: best.result.provider,
    model: best.result.model,
    seed: best.result.seed,
    width: best.result.width,
    height: best.result.height,
    latencyMs,
    compiled,
    verification: best.verification,
    accuracy,
    attempts,
    warnings: [...new Set(warnings)],
    metadata: {
      model: best.result.model,
      provider: best.result.provider,
      seed: best.result.seed,
      width: best.result.width,
      height: best.result.height,
      generation_time_seconds: Number((latencyMs / 1000).toFixed(1)),
      accuracy,
      verified: verify && best.verification.method === "vision",
      verification_method: best.verification.method,
      attempts: successfulAttempts || attempts.length,
      style: compiled.style,
      aspect_ratio: compiled.aspectRatio,
      prompt,
      negative_prompt: compiled.negative,
      requirements: compiled.requirements,
      workflow: "text_to_image",
      routing_rationale: "Cloudflare Workers AI (@cf/black-forest-labs/flux-1-schnell) exclusive provider",
      estimated_cost_usd: estimatedCostUsd,
      primary_model: "@cf/black-forest-labs/flux-1-schnell",
      scorecard: best.verification.categoryScores,
      refinement_action: best.verification.suggestedFix,
      warnings: [...new Set(warnings)],
    },
    evaluation: {
      scorecard: best.verification.categoryScores,
      suggestedFix: best.verification.suggestedFix,
      missingRequirements: best.verification.missingRequirements,
      attemptHistory: best.verification.attemptHistory,
    },
  };
}

/** Strip image data from attempts before sending them over the wire. */
export function publicAttempts(attempts: ImageAttempt[]): ImageAttempt[] {
  return attempts.map(({ image: _image, ...rest }) => rest);
}

export { ImageProviderError };
