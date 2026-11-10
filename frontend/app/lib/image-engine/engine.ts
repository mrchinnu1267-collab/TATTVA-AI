/**
 * Image engine orchestration:
 *   compile -> generate -> verify -> refine/retry -> return the best attempt.
 */

import { compileImagePrompt, refinePrompt } from "./prompt-compiler";
import {
  generateWithProvider,
  getCooldownRemaining,
  ImageProviderError,
  resolveProviderOrder,
} from "./providers";
import { verifyImage } from "./verifier";
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
  attempt: number
): ProviderRequest {
  return {
    prompt,
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

  // 2. Reference Image Moderation (if supplied)
  if (options.referenceImage) {
    const refModeration = await moderateVisualImage(options.referenceImage);
    if (!refModeration.isSafe) {
      throw new ImageProviderError(
        SAFETY_REJECTION_MESSAGE,
        { retryable: false }
      );
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

  const order = resolveProviderOrder(options.provider, compiled.quality);
  const attempts: ImageAttempt[] = [];
  const warnings: string[] = [];
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

    for (const provider of order) {
      if (getCooldownRemaining(provider) > 0) continue;

      const request = requestFor(compiled, attemptPrompt, attempt);
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
    throw new Error(
      lastError ||
        "No image provider could generate this image. Configure Gemini image access, Hugging Face credits, or start the local engine."
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
  const accuracy = best.verification.score;
  const successfulAttempts = attempts.filter((item) => !item.error).length;

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
      warnings: [...new Set(warnings)],
    },
  };
}

/** Strip image data from attempts before sending them over the wire. */
export function publicAttempts(attempts: ImageAttempt[]): ImageAttempt[] {
  return attempts.map(({ image: _image, ...rest }) => rest);
}

export { ImageProviderError };
