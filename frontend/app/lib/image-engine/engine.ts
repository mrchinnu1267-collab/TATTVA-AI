/**
 * Image engine orchestration:
 *   compile -> generate -> verify -> refine/retry -> return the best attempt.
 */

import { compileImagePrompt, refinePrompt } from "./prompt-compiler";
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
  const maxAttempts = resolveMaxAttempts(options);
  const verify = options.verify !== false;
  const targetScore = Math.max(
    50,
    Math.min(100, options.targetScore ?? (compiled.quality === "max" ? 92 : 86))
  );

  const routingDecision = routeImageRequest({
    prompt,
    referenceImage: options.referenceImage,
    quality: compiled.quality,
    aspectRatio: compiled.aspectRatio,
    preferredProvider: options.provider && options.provider !== "auto" ? options.provider : undefined,
  });

  const warnings: string[] = [...(routingDecision.warnings || [])];
  const order =
    routingDecision.fallbackChain.length > 0
      ? routingDecision.fallbackChain
      : resolveProviderOrder(options.provider, compiled.quality, Boolean(options.referenceImage));
  const attempts: ImageAttempt[] = [];
  let best: {
    result: ProviderResult;
    verification: ImageVerification;
    prompt: string;
  } | null = null;
  let lastError = "";

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const attemptPrompt: string =
      attempt === 0 || !best
        ? compiled.positive
        : refinePrompt(
            compiled,
            best.verification.requirements.filter((item) => item.met !== true),
            best.verification.suggestedFix,
            attempt
          );

    let generated = false;

    // Filter candidate providers strictly by requested operation capability
    const compatibleOrder = options.referenceImage
      ? order.filter((p) => isProviderCompatibleWithOperation(p, "reference_image"))
      : order;

    // Check which compatible providers in order are healthy and not in cooldown
    let providersToTry = compatibleOrder.filter((p) => getCooldownRemaining(p) === 0);

    // If ALL compatible providers in the chain are in cooldown, do not fail silently,
    // but STRICTLY DO NOT retry hard exhaustion/auth failures (e.g. invalid credentials or quota exhaustion).
    // Bounded retries: only attempt transient errors with consecutive failures <= 2.
    if (providersToTry.length === 0 && compatibleOrder.length > 0) {
      const retryableTransientCandidates = compatibleOrder
        .map((p) => ({
          provider: p,
          entry: getCooldownEntry(p),
          remaining: getCooldownRemaining(p),
        }))
        .filter((c) => {
          if (!c.entry) return false;
          // Strictly forbid retrying quota exhaustion or invalid auth in recovery loops
          if (!c.entry.isRetryable) return false;
          if (
            c.entry.category === "QUOTA_EXHAUSTION" ||
            c.entry.category === "INVALID_AUTHENTICATION" ||
            c.entry.category === "MODEL_CONFIGURATION_ERROR"
          ) {
            return false;
          }
          // Bounded retry policy: maximum 2 transient attempts
          return c.entry.consecutiveFailures <= 2;
        })
        .sort((a, b) => a.remaining - b.remaining);

      if (retryableTransientCandidates.length > 0) {
        providersToTry = [retryableTransientCandidates[0].provider];
      }
    }

    for (const provider of providersToTry) {
      const request = requestFor(compiled, attemptPrompt, attempt, provider);
      const providerStarted = Date.now();

      try {
        const result = await generateWithProvider(provider, request);
        generated = true;

        const verification = await verifyImage({
          image: result.image,
          compiled,
          requirements: compiled.requirements,
          useVision: verify,
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

        if (!best || verification.score > best.verification.score) {
          best = { result, verification, prompt: attemptPrompt };
        }

        // One successful generation per attempt. Retries refine the prompt.
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
        // Try the next provider in the preference order.
      }
    }

    if (best && (!verify || best.verification.score >= targetScore)) break;
    if (!generated && attempt >= maxAttempts - 1) break;
  }

  if (!best) {
    const errorDetails = attempts
      .filter((a) => a.error)
      .map((a) => `${a.provider}: ${a.error}`)
      .join("; ");
    throw new ImageProviderError(
      errorDetails
        ? `All configured image providers are currently unavailable (${errorDetails})`
        : lastError || "All configured image providers are currently unavailable."
    );
  }

  // 3. Post-Generation Output Visual Verification
  const outputCheck = await moderateVisualImage(best.result.image);
  if (!outputCheck.isSafe) {
    throw new ImageProviderError(
      SAFETY_REJECTION_MESSAGE,
      { retryable: false }
    );
  }

  const latencyMs = Date.now() - started;
  let accuracy = best.verification.score;
  const successfulAttempts = attempts.filter((item) => !item.error).length;

  // 4. Advanced Visual Evaluation & Intelligent Refinement (Phase E)
  let evaluationResult: any = null;
  if (verify) {
    try {
      evaluationResult = await evaluateVisualQuality({
        image: best.result.image,
        prompt,
        referenceImage: options.referenceImage,
        useVision: verify,
      });
      if (evaluationResult?.scorecard?.overallScore) {
        accuracy = evaluationResult.scorecard.overallScore;
      }
    } catch (evalErr) {
      console.warn("[Engine] Visual evaluation service non-fatal warning:", evalErr);
    }
  }

  recordGenerationOutcome({
    modelId: best.result.model,
    providerId: best.result.provider,
    category: routingDecision.workflow,
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
      workflow: routingDecision.workflow,
      routing_rationale: routingDecision.selectionRationale,
      estimated_cost_usd: routingDecision.estimatedCostUsd,
      primary_model: routingDecision.primaryModel.name,
      scorecard: evaluationResult?.scorecard,
      refinement_action: evaluationResult?.refinementRecommendation?.type,
      warnings: [...new Set(warnings)],
    },
    evaluation: evaluationResult,
  };
}

/** Strip image data from attempts before sending them over the wire. */
export function publicAttempts(attempts: ImageAttempt[]): ImageAttempt[] {
  return attempts.map(({ image: _image, ...rest }) => rest);
}

export { ImageProviderError };
