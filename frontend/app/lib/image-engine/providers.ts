/**
 * Provider adapters. Ordering is preference-based: cloud quality first, free
 * fallback last, local engine when it is actually running.
 */

import { InferenceClient } from "@huggingface/inference";
import { Client as GradioClient } from "@gradio/client";
import { geminiImage, GEMINI_IMAGE_MODELS } from "./gemini";
import { bufferToDataUri, fitWithinArea, truncate } from "./image-utils";
import { filterCompatibleReferenceProviders } from "./reference-conditioning";
import type {
  ImageProviderChoice,
  ImageProviderId,
  ProviderHealthStatus,
  ProviderRequest,
  ProviderResult,
  ProviderRuntimeStatus,
} from "./types";

export class ImageProviderError extends Error {
  retryable: boolean;
  cooldownMs: number;

  constructor(message: string, options: { retryable?: boolean; cooldownMs?: number } = {}) {
    super(message);
    this.name = "ImageProviderError";
    this.retryable = options.retryable ?? true;
    this.cooldownMs = options.cooldownMs ?? 0;
  }
}

interface Cooldown {
  until: number;
  reason: string;
}

const cooldowns = new Map<ImageProviderId, Cooldown>();

export function isRunningOnVercel(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

export function isLocalhostUrl(url: string): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(url);
}

export function clearCooldowns(): void {
  cooldowns.clear();
}

export function setCooldown(provider: ImageProviderId, ms: number, reason: string): void {
  cooldowns.set(provider, { until: Date.now() + ms, reason });
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

function classifyProviderError(label: string, error: unknown): ImageProviderError {
  if (error instanceof ImageProviderError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  const noCredits =
    /no remaining credits|insufficient|billing|payment|quota|limit:\s*0|exceeded your current quota|runs limit|zerogpu quota/.test(
      lower
    );
  const auth = /401|403|unauthorized|invalid.*(token|key)|permission/.test(lower);
  const notFound = /404|not found|does not exist|not supported/.test(lower);
  const rateLimited = /429|rate limit|too many requests|cooldown/.test(lower);
  const timeout = /timeout|timed out|aborted/.test(lower);

  if (noCredits) {
    return new ImageProviderError(
      `${label} has no remaining quota or credits. ${truncate(message, 240)}`,
      { retryable: false, cooldownMs: 120_000 } // 2 minute cooldown for quota exhaustion (allows quick recovery)
    );
  }
  if (auth) {
    return new ImageProviderError(`${label} rejected credentials. ${truncate(message, 240)}`, {
      retryable: false,
      cooldownMs: 300_000, // 5 minute cooldown for bad auth
    });
  }
  if (notFound) {
    return new ImageProviderError(`${label} could not run the requested model. ${truncate(message, 240)}`, {
      retryable: true,
    });
  }
  if (rateLimited) {
    return new ImageProviderError(`${label} is rate limited. ${truncate(message, 240)}`, {
      retryable: false,
      cooldownMs: 30_000,
    });
  }
  if (timeout) {
    return new ImageProviderError(`${label} timed out. ${truncate(message, 240)}`, {
      retryable: true,
    });
  }
  return new ImageProviderError(`${label} failed: ${truncate(message, 300)}`, {
    retryable: true,
  });
}

/**
 * User-facing error message sanitizer.
 * Guarantees zero credential, token, localhost, internal URL or stack trace leakage.
 */
export function formatUserFacingImageError(rawError: unknown): string {
  const message = rawError instanceof Error ? rawError.message : String(rawError);
  const lower = message.toLowerCase();

  if (
    lower.includes("safety") ||
    lower.includes("prohibited adult") ||
    lower.includes("content safety guidelines") ||
    lower.includes("safety violation")
  ) {
    return "I cannot fulfill this request as it violates visual content safety guidelines. System policies are strictly enforced. 🔒";
  }

  // Quota / Billing Exhaustion
  if (
    /quota|limit:\s*0|credits|billing|payment|exceeded your current quota|runs limit|zerogpu quota/i.test(lower)
  ) {
    return "Image generation is temporarily unavailable because the cloud provider quota has been reached. Please check your provider billing or try again later.";
  }

  // Missing Configuration / Invalid Credentials
  if (
    /not configured|no image provider.*configured|missing.*key|credentials rejected/i.test(lower)
  ) {
    return "Image generation is not configured yet. Please configure a valid cloud image provider key (Gemini, Hugging Face, or OpenAI) in application settings.";
  }

  // Network / Connection Timeout
  if (/timeout|timed out|abort|connection refused|econnrefused|fetch failed|service could not be reached/i.test(lower)) {
    return "The image service timed out or could not be reached. Please check your network connection and try again.";
  }

  // Fallback for all providers unavailable
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
    const result = await geminiImage(effectivePrompt, {
      referenceImage: req.referenceImage,
      aspectRatio: req.aspectRatio,
    });
    return {
      image: result.image,
      provider: "gemini",
      model: result.model,
      seed: req.seed,
      width: req.width,
      height: req.height,
      latencyMs: Date.now() - started,
      revisedPrompt: result.revisedPrompt,
    };
  } catch (error) {
    const classified = classifyProviderError("Gemini image", error);
    if (classified.cooldownMs) setCooldown("gemini", classified.cooldownMs, classified.message);
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

// ------------------------------------------------------------- Pollinations FLUX & Turbo

function cleanPollinationsPrompt(prompt: string, maxLen = 280): string {
  let clean = prompt
    .replace(/[()[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length > maxLen) {
    const sliced = clean.slice(0, maxLen);
    const lastBoundary = Math.max(sliced.lastIndexOf(" "), sliced.lastIndexOf(","));
    clean = (lastBoundary > 120 ? sliced.slice(0, lastBoundary) : sliced).trim();
  }
  return clean;
}

async function generateWithPollinations(req: ProviderRequest): Promise<ProviderResult> {
  const remaining = getCooldownRemaining("pollinations");
  if (remaining > 0) {
    throw new ImageProviderError(
      `Pollinations is cooling down for ${Math.ceil(remaining / 1000)}s.`,
      { retryable: false, cooldownMs: remaining }
    );
  }

  const started = Date.now();
  const width = req.width || 1024;
  const height = req.height || 1024;
  const seed = req.seed ?? Math.floor(Math.random() * 1_000_000);
  const cleanPrompt = cleanPollinationsPrompt(req.prompt, 260);
  const encoded = encodeURIComponent(cleanPrompt);

  // Strategy 1: FLUX model on Pollinations
  const fluxUrl = `https://image.pollinations.ai/prompt/${encoded}?model=flux&width=${width}&height=${height}&seed=${seed}&nologo=true`;

  try {
    const res = await fetch(fluxUrl, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    return {
      image: bufferToDataUri(buffer, mimeType),
      provider: "pollinations",
      model: "flux",
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
        // Transient failures on zero-auth cloud provider receive a max 15s cooldown
        if (classified.cooldownMs) setCooldown("pollinations", Math.min(classified.cooldownMs, 15_000), classified.message);
        throw classified;
      }
    }
  }
}

export function resolveProviderOrder(
  requested: ImageProviderChoice | undefined,
  quality: "fast" | "balanced" | "max",
  hasReferenceImage = false
): ImageProviderId[] {
  let baseOrder: ImageProviderId[];
  if (requested && requested !== "auto") {
    baseOrder = [requested];
  } else if (hasReferenceImage) {
    // When reference image is present, prioritize multimodal native and img2img-capable engines
    baseOrder = ["gemini", "huggingface", "local"];
  } else {
    baseOrder = ["huggingface", "gemini", "pollinations", "openai", "local"];
  }

  if (hasReferenceImage) {
    const { compatibleProviders } = filterCompatibleReferenceProviders(baseOrder, true);
    return compatibleProviders.length > 0 ? compatibleProviders : baseOrder;
  }

  return baseOrder;
}

export async function generateWithProvider(
  provider: ImageProviderId,
  req: ProviderRequest
): Promise<ProviderResult> {
  switch (provider) {
    case "huggingface":
      return generateWithHuggingFace(req);
    case "gemini":
      return generateWithGemini(req);
    case "pollinations":
      return generateWithPollinations(req);
    case "openai":
      return generateWithOpenAI(req);
    case "local":
      return generateWithLocal(req);
    default:
      throw new ImageProviderError(`Unknown provider: ${provider as string}`);
  }
}

export async function getProviderStatuses(): Promise<ProviderRuntimeStatus[]> {
  const geminiKey = Boolean((process.env.GEMINI_API_KEY || "").trim());
  const hfKey = Boolean((process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "").trim());
  const openAiKey = Boolean((process.env.OPENAI_API_KEY || "").trim());
  const localOnline = await isLocalEngineHealthy();

  const onVercel = isRunningOnVercel();
  const configuredEngineUrl = (process.env.LOCAL_IMAGE_ENGINE_URL || "").trim();
  const isHostedEngine = Boolean(configuredEngineUrl && !isLocalhostUrl(configuredEngineUrl));

  const localConfigured = onVercel ? isHostedEngine : true;
  const localReason = onVercel && !isHostedEngine
    ? "Localhost engine is disabled on cloud deployment. Configure a hosted GPU endpoint in LOCAL_IMAGE_ENGINE_URL."
    : isHostedEngine
    ? "Hosted GPU image engine is currently unreachable."
    : "Start the Python engine (image-engine/main.py).";

  const status = (
    id: ImageProviderId,
    label: string,
    configured: boolean,
    model: string,
    online: boolean,
    baseReason?: string
  ): ProviderRuntimeStatus => {
    const remaining = getCooldownRemaining(id);
    const cooldownEntry = cooldowns.get(id);

    let healthStatus: ProviderHealthStatus = "AVAILABLE";
    let reason = baseReason;

    if (!configured) {
      healthStatus = "CONFIGURATION_ERROR";
      reason = reason || `${label} is not configured. Missing API credentials.`;
    } else if (remaining > 0 && cooldownEntry) {
      const lower = cooldownEntry.reason.toLowerCase();
      if (/quota|credit|billing|limit:\s*0|runs limit|zerogpu/i.test(lower)) {
        healthStatus = "QUOTA_EXCEEDED";
      } else if (/auth|unauthorized|credential|token|key|forbidden|401|403/i.test(lower)) {
        healthStatus = "AUTHENTICATION_FAILED";
      } else if (/rate limit|too many|429/i.test(lower)) {
        healthStatus = "RATE_LIMITED";
      } else if (/timeout|aborted|timed out|503|busy/i.test(lower)) {
        healthStatus = "DEGRADED";
      } else {
        healthStatus = "TEMPORARILY_UNAVAILABLE";
      }
      reason = `${cooldownEntry.reason} (cooldown: ${Math.ceil(remaining / 1000)}s)`;
    } else if (!online) {
      healthStatus = id === "local" ? "DEGRADED" : "TEMPORARILY_UNAVAILABLE";
    }

    const available = configured && online && remaining === 0;

    return {
      id,
      label,
      configured,
      available,
      status: healthStatus,
      model,
      reason: available ? undefined : reason,
    };
  };

  return [
    status(
      "huggingface",
      "Hugging Face SDXL / Animagine",
      hfKey,
      "cagliostrolab/animagine-xl-3.1",
      true
    ),
    status(
      "gemini",
      "Google Gemini Image",
      geminiKey,
      GEMINI_IMAGE_MODELS[0],
      true,
      "Gemini API key configured. Active quota required."
    ),
    status(
      "openai",
      "OpenAI DALL-E 3",
      openAiKey,
      "dall-e-3",
      true,
      "OpenAI API key needed for DALL-E 3."
    ),
    status(
      "pollinations",
      "Pollinations FLUX Cloud",
      true,
      "flux",
      true
    ),
    status(
      "local",
      onVercel ? (isHostedEngine ? "Hosted GPU Engine" : "Local Engine (Cloud Disabled)") : "Local CUDA Engine",
      localConfigured,
      "SDXL / SD1.5",
      localOnline,
      localReason
    ),
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
