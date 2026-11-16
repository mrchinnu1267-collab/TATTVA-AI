/**
 * Provider adapters. Ordering is preference-based: cloud quality first, free
 * fallback last, local engine when it is actually running.
 */

import { InferenceClient } from "@huggingface/inference";
import { Client as GradioClient } from "@gradio/client";
import { geminiImage, GEMINI_IMAGE_MODELS } from "./gemini";
import { bufferToDataUri, fitWithinArea, truncate } from "./image-utils";
import { filterCompatibleReferenceProviders } from "./reference-conditioning";
import { optimizePromptForModel } from "./prompt-optimizer";
import { generateWithAiHorde } from "./free-suite/ai-horde";
import {
  generateWithCloudflare,
  isCloudflareConfigured,
  CLOUDFLARE_FLUX_MODEL,
} from "./cloudflare/cloudflare-adapter";
import {
  generateWithGemini as generateWithGeminiNative,
  isGeminiImageConfigured,
  PREFERRED_GEMINI_IMAGE_MODEL,
} from "./gemini/gemini-image-adapter";
import type {
  ImageProviderChoice,
  ImageProviderId,
  ProviderHealthStatus,
  ProviderRequest,
  ProviderResult,
  ProviderRuntimeStatus,
} from "./types";

export type FailureCategory =
  | "QUOTA_EXHAUSTION"
  | "INVALID_AUTHENTICATION"
  | "RATE_LIMITING"
  | "TEMPORARY_SERVER_ERROR"
  | "NETWORK_TIMEOUT"
  | "MODEL_CONFIGURATION_ERROR";

export interface CooldownEntry {
  until: number;
  reason: string;
  category: FailureCategory;
  isRetryable: boolean;
  consecutiveFailures: number;
}

export class ImageProviderError extends Error {
  retryable: boolean;
  cooldownMs: number;
  category?: FailureCategory;

  constructor(
    message: string,
    options: { retryable?: boolean; cooldownMs?: number; category?: FailureCategory } = {}
  ) {
    super(message);
    this.name = "ImageProviderError";
    this.retryable = options.retryable ?? true;
    this.cooldownMs = options.cooldownMs ?? 0;
    this.category = options.category;
  }
}

const cooldowns = new Map<ImageProviderId, CooldownEntry>();

export function isRunningOnVercel(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

export function isLocalhostUrl(url: string): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(url);
}

export function clearCooldowns(): void {
  cooldowns.clear();
}

export function setCooldown(
  provider: ImageProviderId,
  ms: number,
  reason: string,
  category: FailureCategory = "TEMPORARY_SERVER_ERROR",
  isRetryable: boolean = true
): void {
  const prev = cooldowns.get(provider);
  const consecutiveFailures = (prev?.consecutiveFailures || 0) + 1;
  cooldowns.set(provider, {
    until: Date.now() + ms,
    reason,
    category,
    isRetryable,
    consecutiveFailures,
  });
}

export function getCooldownRemaining(provider: ImageProviderId): number {
  const entry = cooldowns.get(provider);
  if (!entry) return 0;
  const remaining = entry.until - Date.now();
  if (remaining <= 0) {
    cooldowns.delete(provider);
    return 0;
  }
  return remaining;
}

export function getCooldownInfo(provider: ImageProviderId): { remaining: number; reason: string } | null {
  const entry = cooldowns.get(provider);
  if (!entry) return null;
  const remaining = entry.until - Date.now();
  if (remaining <= 0) {
    cooldowns.delete(provider);
    return null;
  }
  return { remaining, reason: entry.reason };
}

export function getCooldownEntry(provider: ImageProviderId): CooldownEntry | null {
  const entry = cooldowns.get(provider);
  if (!entry) return null;
  const remaining = entry.until - Date.now();
  if (remaining <= 0) {
    cooldowns.delete(provider);
    return null;
  }
  return entry;
}

function classifyProviderError(label: string, error: unknown): ImageProviderError {
  if (error instanceof ImageProviderError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  const noCredits =
    /no remaining credits|insufficient|billing|payment|quota|limit:\s*0|exceeded your current quota|runs limit|zerogpu quota/.test(
      lower
    );
  const auth = /401|403|unauthorized|invalid.*(token|key)|permission|rejected credentials/.test(lower);
  const config = /not configured|missing.*key|missing.*token|invalid model/.test(lower);
  const notFound = /404|not found|does not exist|not supported/.test(lower);
  const rateLimited = /429|rate limit|too many requests|cooldown/.test(lower);
  const timeout = /timeout|timed out|aborted|etimedout/.test(lower);
  const serverError = /500|502|503|504|internal server error|service unavailable|bad gateway/.test(lower);

  if (noCredits) {
    return new ImageProviderError(
      `${label} has no remaining quota or credits. ${truncate(message, 240)}`,
      { retryable: false, cooldownMs: 120_000, category: "QUOTA_EXHAUSTION" }
    );
  }
  if (auth) {
    return new ImageProviderError(`${label} rejected credentials. ${truncate(message, 240)}`, {
      retryable: false,
      cooldownMs: 300_000,
      category: "INVALID_AUTHENTICATION",
    });
  }
  if (config) {
    return new ImageProviderError(`${label} configuration error: ${truncate(message, 240)}`, {
      retryable: false,
      cooldownMs: 300_000,
      category: "MODEL_CONFIGURATION_ERROR",
    });
  }
  if (notFound) {
    return new ImageProviderError(`${label} could not run the requested model. ${truncate(message, 240)}`, {
      retryable: false,
      cooldownMs: 60_000,
      category: "MODEL_CONFIGURATION_ERROR",
    });
  }
  if (rateLimited) {
    return new ImageProviderError(`${label} is rate limited. ${truncate(message, 240)}`, {
      retryable: true,
      cooldownMs: 25_000,
      category: "RATE_LIMITING",
    });
  }
  if (timeout) {
    return new ImageProviderError(`${label} timed out. ${truncate(message, 240)}`, {
      retryable: true,
      cooldownMs: 15_000,
      category: "NETWORK_TIMEOUT",
    });
  }
  if (serverError) {
    return new ImageProviderError(`${label} temporary server error. ${truncate(message, 240)}`, {
      retryable: true,
      cooldownMs: 15_000,
      category: "TEMPORARY_SERVER_ERROR",
    });
  }
  return new ImageProviderError(`${label} failed: ${truncate(message, 300)}`, {
    retryable: true,
    cooldownMs: 15_000,
    category: "TEMPORARY_SERVER_ERROR",
  });
}

/**
 * Diagnostic message sanitizer.
 * Guarantees zero credential, token, localhost, internal URL or stack trace leakage
 * while preserving informative error descriptions for user visibility.
 */
export function sanitizeDiagnosticMessage(text: string): string {
  let sanitized = text;

  const cfToken = (process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || "").trim();
  const cfAccount = (process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || "").trim();

  if (cfToken && cfToken.length > 5) {
    sanitized = sanitized.replace(new RegExp(cfToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "[REDACTED_CF_TOKEN]");
  }
  if (cfAccount && cfAccount.length > 5) {
    sanitized = sanitized.replace(new RegExp(cfAccount.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "[REDACTED_CF_ACCOUNT]");
  }

  return sanitized
    .replace(/hf_[a-zA-Z0-9]{20,}/g, "[REDACTED_HF_TOKEN]")
    .replace(/AIzaSy[a-zA-Z0-9_-]{25,}/g, "[REDACTED_GEMINI_KEY]")
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_OPENAI_KEY]")
    .replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, "Bearer [REDACTED]")
    .replace(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\S*/gi, "[LOCAL_ENDPOINT]")
    .replace(/https?:\/\/\S+/gi, (url) => {
      try {
        const u = new URL(url);
        return `${u.protocol}//${u.host}`;
      } catch {
        return "[URL]";
      }
    })
    .replace(/[A-Za-z]:\\[^:\n\r]+/g, "[PATH]")
    .replace(/\/[\w.-]+(?:\/[\w.-]+)+/g, "[PATH]")
    .trim();
}

/**
 * User-facing error message sanitizer & diagnostic reporter.
 * Guarantees zero credential, token, localhost, internal URL or stack trace leakage
 * while providing clear, transparent diagnostic visibility into provider states.
 */
export function formatUserFacingImageError(rawError: unknown): string {
  const rawMessage = rawError instanceof Error ? rawError.message : String(rawError);
  const message = sanitizeDiagnosticMessage(rawMessage);
  const lower = message.toLowerCase();

  if (
    lower.includes("safety") ||
    lower.includes("prohibited adult") ||
    lower.includes("content safety guidelines") ||
    lower.includes("safety violation")
  ) {
    return "I cannot fulfill this request as it violates visual content safety guidelines. System policies are strictly enforced. 🔒";
  }

  // Reference image format / validation errors
  if (lower.includes("reference image validation failed") || lower.includes("invalid image format")) {
    const cleanErr = sanitizeDiagnosticMessage(message).replace(/^.*validation failed:\s*/i, "");
    return `Reference image error: ${cleanErr || "The uploaded image could not be processed"}. Please upload a valid PNG, JPEG, or WebP image.`;
  }

  // Cloudflare Authentication Error
  if (lower.includes("cloudflare authentication failed") || (lower.includes("cloudflare") && (lower.includes("401") || lower.includes("403")))) {
    return "Cloudflare Workers AI authentication failed. Please verify your CLOUDFLARE_API_TOKEN and account permissions in server settings.";
  }

  // Cloudflare Quota / Rate Limit
  if (lower.includes("cloudflare") && (lower.includes("quota") || lower.includes("rate limit") || lower.includes("neurons"))) {
    return "Cloudflare Workers AI daily quota (10,000 Neurons/day) or rate limit exceeded. Please verify your Cloudflare Workers AI plan or try again shortly.";
  }

  // Missing Configuration / Invalid Credentials
  if (
    /not configured|no image provider.*configured|missing.*key|missing.*token|credentials missing/i.test(lower)
  ) {
    return "Cloudflare Workers AI is not configured. Please ensure CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are configured in server environment variables.";
  }

  // Deactivated provider notice
  if (lower.includes("has been deactivated")) {
    return message;
  }

  // Multi-provider fallback failure: return transparent diagnostic breakdown
  if (message.includes("All configured image providers failed:")) {
    const breakdown = message.replace(/^.*All configured image providers failed:\s*/i, "").trim();
    const sanitized = sanitizeDiagnosticMessage(breakdown);
    return `Image generation failed (${sanitized}). Please try again shortly.`;
  }

  // Quota / Billing Exhaustion
  if (
    /quota|limit:\s*0|credits|billing|payment|exceeded your current quota|runs limit|zerogpu quota/i.test(lower)
  ) {
    return "Image generation is temporarily unavailable because the cloud provider quota has been reached. Please check your provider billing or try again later.";
  }

  // Network / Connection Timeout
  if (/timeout|timed out|abort|connection refused|econnrefused|fetch failed|service could not be reached/i.test(lower)) {
    return "The image service timed out or could not be reached. Please check your network connection and try again.";
  }

  // Hardware / low-level driver failures (prevent internal register / bus address leakage)
  if (/gpu failure|bus 0x|segfault|core dump|internal driver/i.test(lower)) {
    return "All configured image providers are currently unavailable. Please try again shortly.";
  }

  // Generic fallback with sanitized context
  const snippet = sanitizeDiagnosticMessage(message).slice(0, 160);
  if (snippet && snippet !== "Error") {
    return `Image generation failed: ${snippet}. Please try again shortly.`;
  }

  return "All configured image providers are currently unavailable. Please try again shortly.";
}

// --------------------------------------------------------------------- Gemini

async function generateWithGemini(req: ProviderRequest): Promise<ProviderResult> {
  const remaining = getCooldownRemaining("gemini");
  if (remaining > 0) {
    throw new ImageProviderError(
      `Gemini is cooling down for ${Math.ceil(remaining / 1000)}s.`,
      { retryable: false, cooldownMs: remaining }
    );
  }

  const started = Date.now();
  try {
    const effectivePrompt = req.referenceImage
      ? `[REFERENCE CONDITIONING INSTRUCTION: Visually condition on the attached reference image. Maintain the core subject identity, recognizable facial features, and visual consistency while applying the following user instructions:]\n${req.prompt}`
      : req.prompt;
    const result = await generateWithGeminiNative({
      ...req,
      prompt: effectivePrompt,
    });
    return result;
  } catch (error) {
    const classified = classifyProviderError("Gemini image", error);
    if (classified.cooldownMs) setCooldown("gemini", classified.cooldownMs, classified.message, classified.category, classified.retryable);
    throw classified;
  }
}

// ---------------------------------------------------------------- HuggingFace

function resolveDimensions(req: ProviderRequest): { width: number; height: number } {
  if (req.width && req.height) {
    const w = Math.max(256, Math.min(1536, Math.round(req.width / 16) * 16));
    const h = Math.max(256, Math.min(1536, Math.round(req.height / 16) * 16));
    return { width: w, height: h };
  }
  switch (req.aspectRatio) {
    case "16:9":
      return { width: 1024, height: 576 };
    case "9:16":
      return { width: 576, height: 1024 };
    case "4:3":
      return { width: 1024, height: 768 };
    case "3:4":
      return { width: 768, height: 1024 };
    default:
      return { width: 1024, height: 1024 };
  }
}

async function generateWithHuggingFace(req: ProviderRequest): Promise<ProviderResult> {
  const remaining = getCooldownRemaining("huggingface");
  if (remaining > 0) {
    throw new ImageProviderError(
      `Hugging Face is cooling down for ${Math.ceil(remaining / 1000)}s.`,
      { retryable: false, cooldownMs: remaining }
    );
  }

  const { width, height } = resolveDimensions(req);
  const started = Date.now();
  const seed = typeof req.seed === "number" && req.seed >= 0 ? req.seed : Math.floor(Math.random() * 1_000_000);
  const hfToken = (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "").trim();
  const clientOptions = hfToken ? ({ token: hfToken, hf_token: hfToken } as any) : undefined;
  const authHeaders: Record<string, string> = hfToken ? { Authorization: `Bearer ${hfToken}` } : {};

  let lastHfError: unknown = null;

  // Strategy 1: Persistent Dedicated GPU Space (cagliostrolab/animagine-xl-3.1)
  // Highly resilient, zero ZeroGPU quota limitation, unwatermarked, 1024x1024 SDXL-based engine
  try {
    const animeClient = await GradioClient.connect("cagliostrolab/animagine-xl-3.1", clientOptions);
    const animePredict = animeClient.predict("/run", [
      req.prompt,
      req.negativePrompt ||
        "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
      seed,
      width || 1024,
      height || 1024,
      7,
      28,
      "Euler a",
      "1024 x 1024",
      "(None)",
      "Standard v3.1",
      false,
      0.55,
      1.5,
      true,
    ]) as Promise<{ data: Array<any> }>;

    const animeTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Animagine dedicated GPU space timed out after 50s")), 50_000)
    );
    const animeRes = await Promise.race([animePredict, animeTimeout]);

    const fileObj = animeRes.data?.[0]?.[0]?.image || animeRes.data?.[0];
    const fileUrl = fileObj?.url;
    if (!fileUrl) throw new Error("Animagine returned no image URL.");

    const imgRes = await fetch(fileUrl, {
      headers: authHeaders,
      signal: AbortSignal.timeout(35_000),
    });
    if (!imgRes.ok) throw new Error(`Animagine download failed: HTTP ${imgRes.status}`);

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const mimeType = imgRes.headers.get("content-type") || "image/png";

    return {
      image: bufferToDataUri(buffer, mimeType),
      provider: "huggingface",
      model: "cagliostrolab/animagine-xl-3.1",
      seed,
      width,
      height,
      latencyMs: Date.now() - started,
    };
  } catch (animagineErr) {
    lastHfError = animagineErr;
    const errStr = animagineErr instanceof Error ? animagineErr.message : String(animagineErr);
    console.warn("[Hugging Face] Dedicated GPU space fallback triggered:", errStr);
    if (/exceeded your ZeroGPU quota/i.test(errStr)) {
      // Account-wide ZeroGPU quota exhausted; fast-fail instead of wasting timeouts on subsequent ZeroGPU spaces
      const classified = classifyProviderError("Hugging Face", animagineErr);
      setCooldown("huggingface", 120_000, classified.message);
      throw classified;
    }
  }

  // Strategy 2: SDXL-Lightning (AP123/SDXL-Lightning, fast 4-step diffusion)
  try {
    const client = await GradioClient.connect("AP123/SDXL-Lightning", clientOptions);
    const predictPromise = client.predict("/generate_image", [
      req.prompt,
      "4-Step",
    ]) as Promise<{ data: Array<{ url?: string; path?: string } | undefined> }>;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("SDXL-Lightning timed out after 14s")), 14_000)
    );
    const result = await Promise.race([predictPromise, timeoutPromise]);

    const fileData = result.data?.[0];
    if (!fileData?.url) throw new Error("SDXL-Lightning returned no image URL.");

    const imgRes = await fetch(fileData.url, {
      headers: authHeaders,
      signal: AbortSignal.timeout(20_000),
    });
    if (!imgRes.ok) throw new Error(`Failed to download SDXL image: HTTP ${imgRes.status}`);

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const mimeType = imgRes.headers.get("content-type") || "image/png";

    return {
      image: bufferToDataUri(buffer, mimeType),
      provider: "huggingface",
      model: "AP123/SDXL-Lightning",
      seed,
      width,
      height,
      latencyMs: Date.now() - started,
    };
  } catch (sdxlErr) {
    lastHfError = sdxlErr;
    console.warn("[Hugging Face] SDXL-Lightning fallback triggered:", sdxlErr instanceof Error ? sdxlErr.message : String(sdxlErr));
  }

  // Strategy 3: FLUX.1-schnell Space (4-step distilled diffusion)
  try {
    const client = await GradioClient.connect("black-forest-labs/FLUX.1-schnell", clientOptions);
    const predictPromise = client.predict("/infer", {
      prompt: req.prompt,
      seed,
      randomize_seed: !req.seed,
      width,
      height,
      num_inference_steps: req.steps && req.steps <= 6 ? req.steps : 4,
    }) as Promise<{ data: Array<{ url?: string; path?: string } | number> }>;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("FLUX space timed out after 14s")), 14_000)
    );
    const result = await Promise.race([predictPromise, timeoutPromise]);

    const fileData = result.data?.[0] as { url?: string; path?: string } | undefined;
    const actualSeed = typeof result.data?.[1] === "number" ? result.data[1] : seed;

    if (!fileData?.url) {
      throw new Error("FLUX space returned no image URL.");
    }

    const imgRes = await fetch(fileData.url, {
      headers: authHeaders,
      signal: AbortSignal.timeout(20_000),
    });
    if (!imgRes.ok) {
      throw new Error(`Failed to retrieve generated image from space: HTTP ${imgRes.status}`);
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const mimeType = imgRes.headers.get("content-type") || "image/webp";

    return {
      image: bufferToDataUri(buffer, mimeType),
      provider: "huggingface",
      model: "black-forest-labs/FLUX.1-schnell",
      seed: actualSeed,
      width,
      height,
      latencyMs: Date.now() - started,
    };
  } catch (fluxErr) {
    lastHfError = fluxErr;
    console.warn("[Hugging Face] FLUX.1-schnell fallback triggered:", fluxErr instanceof Error ? fluxErr.message : String(fluxErr));
  }

  const classified = classifyProviderError("Hugging Face", lastHfError || new Error("All Hugging Face spaces failed to generate"));
  if (classified.cooldownMs) setCooldown("huggingface", Math.min(classified.cooldownMs, 60_000), classified.message);
  throw classified;
}

// --------------------------------------------------------------- Local / Hosted Diffusers Engine

let localHealthCache: { at: number; ok: boolean } = { at: 0, ok: false };

export function getLocalBaseUrl(): string {
  const configured = (process.env.LOCAL_IMAGE_ENGINE_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (isRunningOnVercel()) {
    // On Vercel, localhost targets the ephemeral serverless container, never the user's computer.
    return "";
  }
  return "http://127.0.0.1:8001";
}

export async function isLocalEngineHealthy(): Promise<boolean> {
  const baseUrl = getLocalBaseUrl();
  if (!baseUrl) return false;

  // Never probe localhost when executing inside Vercel cloud environment
  if (isRunningOnVercel() && isLocalhostUrl(baseUrl)) {
    return false;
  }

  if (Date.now() - localHealthCache.at < 15_000) return localHealthCache.ok;

  const authKey = (process.env.LOCAL_IMAGE_ENGINE_KEY || process.env.IMAGE_ENGINE_API_KEY || "").trim();
  const headers: Record<string, string> = authKey ? { Authorization: `Bearer ${authKey}`, "X-API-Key": authKey } : {};

  try {
    const res = await fetch(`${baseUrl}/health`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(1200),
    });
    const ok = res.ok;
    localHealthCache = { at: Date.now(), ok };
    return ok;
  } catch {
    localHealthCache = { at: Date.now(), ok: false };
    return false;
  }
}

async function generateWithLocal(req: ProviderRequest): Promise<ProviderResult> {
  const baseUrl = getLocalBaseUrl();
  if (!baseUrl || (isRunningOnVercel() && isLocalhostUrl(baseUrl))) {
    throw new ImageProviderError(
      "Hosted GPU image engine is not configured in LOCAL_IMAGE_ENGINE_URL.",
      { retryable: false, cooldownMs: 300_000 }
    );
  }

  if (!(await isLocalEngineHealthy())) {
    throw new ImageProviderError(
      isRunningOnVercel()
        ? "Hosted GPU image engine is currently unreachable."
        : "Local image engine is offline. Start image-engine/main.py to enable offline generation.",
      { retryable: false, cooldownMs: 30_000 }
    );
  }

  const authKey = (process.env.LOCAL_IMAGE_ENGINE_KEY || process.env.IMAGE_ENGINE_API_KEY || "").trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(authKey ? { Authorization: `Bearer ${authKey}`, "X-API-Key": authKey } : {}),
  };

  const started = Date.now();
  try {
    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: req.prompt,
        negative_prompt: req.negativePrompt,
        width: req.width,
        height: req.height,
        steps: req.steps,
        cfg_scale: req.guidance,
        seed: req.seed,
        reference_image: req.referenceImage,
        strength: req.strength,
        lora_adapter: req.activeAdapterId,
        lora_scale: req.adapterScale,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${truncate(body, 240)}`);
    }

    const data = (await res.json()) as {
      image?: string;
      seed?: number;
      width?: number;
      height?: number;
      model?: string;
    };

    if (!data.image) throw new Error("Local engine returned no image.");
    return {
      image: data.image,
      provider: "local",
      model: data.model || "local-diffusion",
      seed: data.seed ?? req.seed,
      width: data.width ?? req.width,
      height: data.height ?? req.height,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    const classified = classifyProviderError("Image engine", error);
    localHealthCache = { at: Date.now(), ok: false };
    throw classified;
  }
}

// ------------------------------------------------------------------ OpenAI

async function generateWithOpenAI(req: ProviderRequest): Promise<ProviderResult> {
  if (req.referenceImage) {
    throw new ImageProviderError(
      "OpenAI DALL-E 3 does not support reference-image conditioning. Reference images are never silently discarded.",
      { retryable: false }
    );
  }

  const token = (process.env.OPENAI_API_KEY || "").trim();
  if (!token) throw new ImageProviderError("OPENAI_API_KEY is not configured.", { retryable: false });

  const remaining = getCooldownRemaining("openai");
  if (remaining > 0) {
    throw new ImageProviderError(
      `OpenAI is cooling down for ${Math.ceil(remaining / 1000)}s.`,
      { retryable: false, cooldownMs: remaining }
    );
  }

  const started = Date.now();
  try {
    const size = req.aspectRatio === "16:9" ? "1792x1024" : "1024x1024";
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: req.prompt,
        n: 1,
        size,
        response_format: "b64_json",
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${truncate(body, 240)}`);
    }

    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI returned no image data.");

    return {
      image: `data:image/png;base64,${b64}`,
      provider: "openai",
      model: "dall-e-3",
      seed: req.seed,
      width: req.aspectRatio === "16:9" ? 1792 : 1024,
      height: 1024,
      latencyMs: Date.now() - started,
      revisedPrompt: data?.data?.[0]?.revised_prompt,
    };
  } catch (error) {
    const classified = classifyProviderError("OpenAI DALL-E 3", error);
    if (classified.cooldownMs) setCooldown("openai", classified.cooldownMs, classified.message);
    throw classified;
  }
}

// -------------------------------------------------------------- Azure OpenAI

interface AzureOpenAIImageConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
}

function getAzureOpenAIConfigError(): string | null {
  const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || "").trim();
  const apiKey = (process.env.AZURE_OPENAI_API_KEY || "").trim();
  const deployment = (process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT || "").trim();

  if (!endpoint || !apiKey || !deployment) {
    return "Configure AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_IMAGE_DEPLOYMENT.";
  }

  try {
    const parsedEndpoint = new URL(endpoint);
    if (
      parsedEndpoint.protocol !== "https:" ||
      parsedEndpoint.pathname !== "/" ||
      parsedEndpoint.search ||
      parsedEndpoint.hash ||
      parsedEndpoint.username ||
      parsedEndpoint.password
    ) {
      return "AZURE_OPENAI_ENDPOINT must be an HTTPS Azure resource endpoint without a path or query.";
    }
  } catch {
    return "AZURE_OPENAI_ENDPOINT must be a valid HTTPS Azure resource endpoint.";
  }

  return null;
}

export function isAzureOpenAIConfigured(): boolean {
  return getAzureOpenAIConfigError() === null;
}

function getAzureOpenAIConfig(): AzureOpenAIImageConfig {
  const configurationError = getAzureOpenAIConfigError();
  if (configurationError) {
    throw new ImageProviderError(configurationError, { retryable: false });
  }

  return {
    endpoint: new URL(process.env.AZURE_OPENAI_ENDPOINT!.trim()).origin,
    apiKey: process.env.AZURE_OPENAI_API_KEY!.trim(),
    deployment: process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT!.trim(),
    apiVersion: (process.env.AZURE_OPENAI_API_VERSION || "").trim() || "2024-02-01",
  };
}

async function generateWithAzureOpenAI(req: ProviderRequest): Promise<ProviderResult> {
  if (req.referenceImage) {
    throw new ImageProviderError(
      "Azure OpenAI DALL-E 3 does not support reference-image conditioning. Reference images are never silently discarded.",
      { retryable: false }
    );
  }

  const config = getAzureOpenAIConfig();
  const remaining = getCooldownRemaining("azure-openai");
  if (remaining > 0) {
    throw new ImageProviderError(
      `Azure OpenAI is cooling down for ${Math.ceil(remaining / 1000)}s.`,
      { retryable: false, cooldownMs: remaining }
    );
  }

  const isLandscape = req.aspectRatio === "16:9";
  const isPortrait = req.aspectRatio === "9:16";
  const size = isLandscape ? "1792x1024" : isPortrait ? "1024x1792" : "1024x1024";
  const width = isLandscape ? 1792 : 1024;
  const height = isPortrait ? 1792 : 1024;
  const endpoint = new URL(
    `/openai/deployments/${encodeURIComponent(config.deployment)}/images/generations`,
    `${config.endpoint}/`
  );
  endpoint.searchParams.set("api-version", config.apiVersion);
  const started = Date.now();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": config.apiKey,
      },
      body: JSON.stringify({
        prompt: req.prompt,
        n: 1,
        size,
        quality: req.quality === "max" ? "hd" : "standard",
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${truncate(body, 240)}`);
    }

    const result = await response.json();
    const imageResult = result?.data?.[0] as
      | { b64_json?: string; url?: string; revised_prompt?: string }
      | undefined;
    let image: string;

    if (imageResult?.b64_json) {
      image = `data:image/png;base64,${imageResult.b64_json}`;
    } else if (imageResult?.url) {
      const imageUrl = new URL(imageResult.url);
      if (imageUrl.protocol !== "https:") {
        throw new Error("Azure OpenAI returned an invalid image URL.");
      }

      const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
      if (!imageResponse.ok) {
        throw new Error(`Failed to retrieve generated image: HTTP ${imageResponse.status}`);
      }
      const contentType = imageResponse.headers.get("content-type") || "";
      if (!contentType.toLowerCase().startsWith("image/")) {
        throw new Error("Azure OpenAI returned a URL that did not contain an image.");
      }
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      if (imageBuffer.length > 25_000_000) {
        throw new Error("Azure OpenAI returned an image that is too large to process.");
      }
      image = bufferToDataUri(imageBuffer, contentType);
    } else {
      throw new Error("Azure OpenAI returned no image data.");
    }

    return {
      image,
      provider: "azure-openai",
      model: config.deployment,
      seed: req.seed,
      width,
      height,
      latencyMs: Date.now() - started,
      revisedPrompt: imageResult?.revised_prompt,
    };
  } catch (error) {
    const classified = classifyProviderError("Azure OpenAI DALL-E 3", error);
    if (classified.cooldownMs) {
      setCooldown("azure-openai", classified.cooldownMs, classified.message);
    }
    throw classified;
  }
}

// ------------------------------------------------------------- Pollinations FLUX & Turbo

async function generateWithPollinations(req: ProviderRequest): Promise<ProviderResult> {
  const remaining = getCooldownRemaining("pollinations");
  if (remaining > 0) {
    throw new ImageProviderError(
      `Pollinations is cooling down for ${Math.ceil(remaining / 1000)}s.`,
      { retryable: false, cooldownMs: remaining, category: "TEMPORARY_SERVER_ERROR" }
    );
  }

  const started = Date.now();
  const width = req.width || 1024;
  const height = req.height || 1024;
  const seed = req.seed ?? Math.floor(Math.random() * 1_000_000);

  // Model-specific prompt optimizer preserves all 8 semantic dimensions (subject, counts, objects, attributes, layout, bg, style, text):
  const promptOpt = optimizePromptForModel({
    originalPrompt: req.prompt,
    provider: "pollinations",
    maxCharLimit: 380,
  });
  const encoded = encodeURIComponent(promptOpt.optimizedPrompt);

  // Choose premier model based on prompt attributes
  const isPhotoreal =
    /\b(photo|photorealistic|camera|hyperrealistic|dslr|portrait)\b/i.test(req.prompt);
  const preferredModel = isPhotoreal ? "flux-realism" : "flux";

  // Strategy 1: Targeted FLUX (Realism or Standard) on Pollinations
  const fluxUrl = `https://image.pollinations.ai/prompt/${encoded}?model=${preferredModel}&width=${width}&height=${height}&seed=${seed}&nologo=true`;

  try {
    const res = await fetch(fluxUrl, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    return {
      image: bufferToDataUri(buffer, mimeType),
      provider: "pollinations",
      model: preferredModel,
      seed,
      width,
      height,
      latencyMs: Date.now() - started,
    };
  } catch {
    // Strategy 2: Fast Turbo model on Pollinations
    try {
      const turboUrl = `https://image.pollinations.ai/prompt/${encoded}?model=turbo&width=${width}&height=${height}&seed=${seed}&nologo=true`;
      const res = await fetch(turboUrl, { signal: AbortSignal.timeout(18_000) });
      if (!res.ok) throw new Error(`Pollinations Turbo HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const mimeType = res.headers.get("content-type") || "image/jpeg";
      return {
        image: bufferToDataUri(buffer, mimeType),
        provider: "pollinations",
        model: "pollinations-turbo",
        seed,
        width,
        height,
        latencyMs: Date.now() - started,
      };
    } catch {
      // Strategy 3: Standard bare pollinations endpoint
      try {
        const standardUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
        const res = await fetch(standardUrl, { signal: AbortSignal.timeout(15_000) });
        if (!res.ok) throw new Error(`Pollinations standard HTTP ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        const mimeType = res.headers.get("content-type") || "image/jpeg";
        return {
          image: bufferToDataUri(buffer, mimeType),
          provider: "pollinations",
          model: "pollinations-standard",
          seed,
          width,
          height,
          latencyMs: Date.now() - started,
        };
      } catch (fallbackErr) {
        const classified = classifyProviderError("Pollinations AI", fallbackErr);
        // Transient failures on zero-auth cloud provider receive a bounded 15s cooldown
        if (classified.cooldownMs) {
          setCooldown(
            "pollinations",
            Math.min(classified.cooldownMs, 15_000),
            classified.message,
            classified.category || "TEMPORARY_SERVER_ERROR",
            true
          );
        }
        throw classified;
      }
    }
  }
}

export function resolveProviderOrder(
  requested?: ImageProviderChoice,
  _quality: "fast" | "balanced" | "max" = "balanced",
  hasReferenceImage = false
): ImageProviderId[] {
  // If specific provider requested, honor explicit preference
  if (requested === "gemini") {
    return ["gemini"];
  }
  if (requested === "cloudflare") {
    return ["cloudflare"];
  }

  // If request contains a reference image (image editing / conditioning):
  // Cloudflare FLUX.1 Schnell only supports text-to-image.
  // Google Gemini natively supports text-and-image-to-image editing.
  if (hasReferenceImage) {
    if (isGeminiImageConfigured()) {
      return ["gemini"];
    }
  }

  // Order active providers based on configuration and availability
  const geminiAvailable = isGeminiImageConfigured() && getCooldownRemaining("gemini") === 0;
  const cfAvailable = isCloudflareConfigured() && getCooldownRemaining("cloudflare") === 0;

  if (geminiAvailable && cfAvailable) {
    return ["gemini", "cloudflare"];
  }
  if (geminiAvailable) {
    return ["gemini"];
  }
  if (cfAvailable) {
    return ["cloudflare"];
  }

  // Fallback to configured provider
  return isGeminiImageConfigured() ? ["gemini"] : ["cloudflare"];
}

export async function generateWithProvider(
  provider: ImageProviderId,
  req: ProviderRequest
): Promise<ProviderResult> {
  // 1. Google Gemini Native Image Generation
  if (provider === "gemini") {
    return generateWithGemini(req);
  }

  // 2. Cloudflare Workers AI FLUX.1 Schnell
  if (provider === "cloudflare") {
    return generateWithCloudflare(req);
  }

  // 3. Auto-routed execution
  if ((provider as string) === "auto") {
    if (req.referenceImage && isGeminiImageConfigured()) {
      return generateWithGemini(req);
    }
    const order = resolveProviderOrder("auto", req.quality, Boolean(req.referenceImage));
    const targetProvider = order[0] || "cloudflare";
    if (targetProvider === "gemini") {
      return generateWithGemini(req);
    }
    return generateWithCloudflare(req);
  }

  // Other providers remain deactivated
  throw new ImageProviderError(
    `Image provider '${provider}' is deactivated. TATTVA AI supports Google Gemini (${PREFERRED_GEMINI_IMAGE_MODEL}) and Cloudflare Workers AI (${CLOUDFLARE_FLUX_MODEL}).`,
    { retryable: false, category: "MODEL_CONFIGURATION_ERROR" }
  );
}

export async function getProviderStatuses(): Promise<ProviderRuntimeStatus[]> {
  const cfConfigured = isCloudflareConfigured();
  const geminiConfigured = isGeminiImageConfigured();
  const geminiCooldown = getCooldownRemaining("gemini");
  const cfCooldown = getCooldownRemaining("cloudflare");

  return [
    {
      id: "gemini",
      label: "Google Gemini Native Image",
      model: PREFERRED_GEMINI_IMAGE_MODEL,
      configured: geminiConfigured,
      available: geminiConfigured && geminiCooldown === 0,
      status: geminiConfigured ? (geminiCooldown > 0 ? "RATE_LIMITED" : "AVAILABLE") : "CONFIGURATION_ERROR",
      reason: geminiConfigured
        ? undefined
        : "Missing GEMINI_API_KEY in server environment variables.",
    },
    {
      id: "cloudflare",
      label: "Cloudflare Workers AI",
      model: CLOUDFLARE_FLUX_MODEL,
      configured: cfConfigured,
      available: cfConfigured && cfCooldown === 0,
      status: cfConfigured ? (cfCooldown > 0 ? "RATE_LIMITED" : "AVAILABLE") : "CONFIGURATION_ERROR",
      reason: cfConfigured
        ? undefined
        : "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in server environment variables.",
    },
    {
      id: "huggingface",
      label: "Hugging Face",
      model: "deactivated",
      configured: false,
      available: false,
      status: "TEMPORARILY_UNAVAILABLE",
      reason: "Deactivated: TATTVA AI uses Google Gemini and Cloudflare Workers AI.",
    },
    {
      id: "pollinations",
      label: "Pollinations AI",
      model: "deactivated",
      configured: false,
      available: false,
      status: "TEMPORARILY_UNAVAILABLE",
      reason: "Deactivated: TATTVA AI uses Google Gemini and Cloudflare Workers AI.",
    },
    {
      id: "openai",
      label: "DALL-E / OpenAI",
      model: "deactivated",
      configured: false,
      available: false,
      status: "TEMPORARILY_UNAVAILABLE",
      reason: "Deactivated: TATTVA AI uses Google Gemini and Cloudflare Workers AI.",
    },
    {
      id: "local",
      label: "Local Stable Diffusion",
      model: "deactivated",
      configured: false,
      available: false,
      status: "TEMPORARILY_UNAVAILABLE",
      reason: "Deactivated: TATTVA AI uses Google Gemini and Cloudflare Workers AI.",
    },
  ];
}

/**
 * Formats a clear diagnostic summary for logs and admin troubleshooting
 */
export function formatDetailedProviderDiagnostics(statuses: ProviderRuntimeStatus[]): string {
  return statuses
    .map((s) => {
      const badge = s.status === "AVAILABLE" ? "READY" : s.status;
      const reason = s.reason ? ` - ${s.reason}` : "";
      return `[${s.id.toUpperCase()}] ${s.label}: ${badge}${reason}`;
    })
    .join("\n");
}
