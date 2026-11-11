/**
 * Provider adapters. Ordering is preference-based: cloud quality first, free
 * fallback last, local engine when it is actually running.
 */

import { InferenceClient } from "@huggingface/inference";
import { Client as GradioClient } from "@gradio/client";
import { geminiImage, GEMINI_IMAGE_MODELS } from "./gemini";
import { bufferToDataUri, fitWithinArea, truncate } from "./image-utils";
import type {
  ImageProviderChoice,
  ImageProviderId,
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

export function clearCooldowns(): void {
  cooldowns.clear();
}

function setCooldown(provider: ImageProviderId, ms: number, reason: string): void {
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

function classifyProviderError(label: string, error: unknown): ImageProviderError {
  if (error instanceof ImageProviderError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  const noCredits =
    /no remaining credits|insufficient|billing|payment|quota|limit:\s*0|exceeded your current quota/.test(lower);
  const auth = /401|403|unauthorized|invalid.*(token|key)|permission/.test(lower);
  const notFound = /404|not found|does not exist|not supported/.test(lower);
  const rateLimited = /429|rate limit|too many requests|cooldown/.test(lower);
  const timeout = /timeout|timed out|aborted/.test(lower);

  if (noCredits) {
    return new ImageProviderError(
      `${label} has no remaining quota or credits. ${truncate(message, 240)}`,
      { retryable: false, cooldownMs: 5_000 }
    );
  }
  if (auth) {
    return new ImageProviderError(`${label} rejected the credentials. ${truncate(message, 240)}`, {
      retryable: false,
      cooldownMs: 5_000,
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
      cooldownMs: 60_000,
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
    const result = await geminiImage(req.prompt, {
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
  const clientOptions = hfToken ? ({ hf_token: hfToken, token: hfToken } as any) : undefined;
  const authHeaders: Record<string, string> = hfToken ? { Authorization: `Bearer ${hfToken}` } : {};

  // Strategy 1: SDXL-Lightning via AP123/SDXL-Lightning (Ultra-fast 4-step SDXL, 1024x1024, unwatermarked)
  try {
    const client = await GradioClient.connect("AP123/SDXL-Lightning", clientOptions);
    const predictPromise = client.predict("/generate_image", [
      req.prompt,
      "4-Step",
    ]) as Promise<{ data: Array<{ url?: string; path?: string } | undefined> }>;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("SDXL-Lightning timed out after 35s")), 35_000)
    );
    const result = await Promise.race([predictPromise, timeoutPromise]);

    const fileData = result.data?.[0];
    if (!fileData?.url) throw new Error("SDXL-Lightning returned no image URL.");

    const imgRes = await fetch(fileData.url, {
      headers: authHeaders,
      signal: AbortSignal.timeout(35_000),
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
    const sdxlMsg = sdxlErr instanceof Error ? sdxlErr.message : String(sdxlErr);
    console.warn("[Hugging Face] SDXL-Lightning fallback triggered:", sdxlMsg);

    // Strategy 2: FLUX.1-schnell Space (Fast 4-step diffusion, unwatermarked)
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
        setTimeout(() => reject(new Error("FLUX space timed out after 35s")), 35_000)
      );
      const result = await Promise.race([predictPromise, timeoutPromise]);

      const fileData = result.data?.[0] as { url?: string; path?: string } | undefined;
      const actualSeed = typeof result.data?.[1] === "number" ? result.data[1] : seed;

      if (!fileData?.url) {
        throw new Error("FLUX space returned no image URL.");
      }

      const imgRes = await fetch(fileData.url, {
        headers: authHeaders,
        signal: AbortSignal.timeout(35_000),
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
      const fluxMsg = fluxErr instanceof Error ? fluxErr.message : String(fluxErr);
      console.warn("[Hugging Face] FLUX.1-schnell fallback triggered:", fluxMsg);

      // Strategy 3: Animagine XL 3.1
      try {
        const animeClient = await GradioClient.connect("cagliostrolab/animagine-xl-3.1", clientOptions);
        const animeRes = (await animeClient.predict("/run", [
          req.prompt,
          req.negativePrompt || "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
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
        ])) as { data: Array<any> };

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
      } catch (thirdErr) {
        const classified = classifyProviderError("Hugging Face", thirdErr || fluxErr || sdxlErr);
        if (classified.cooldownMs) setCooldown("huggingface", Math.min(classified.cooldownMs, 10_000), classified.message);
        throw classified;
      }
    }
  }
}

// --------------------------------------------------------------- Local

let localHealthCache: { at: number; ok: boolean } = { at: 0, ok: false };

function getLocalBaseUrl(): string {
  return (process.env.LOCAL_IMAGE_ENGINE_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");
}

async function isLocalEngineHealthy(): Promise<boolean> {
  if (Date.now() - localHealthCache.at < 20_000) return localHealthCache.ok;
  try {
    const res = await fetch(`${getLocalBaseUrl()}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1800),
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
  if (!(await isLocalEngineHealthy())) {
    throw new ImageProviderError(
      "Local image engine is offline. Start image-engine/main.py to enable offline generation.",
      { retryable: false, cooldownMs: 60_000 }
    );
  }

  const started = Date.now();
  try {
    const res = await fetch(`${getLocalBaseUrl()}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: req.prompt,
        negative_prompt: req.negativePrompt,
        width: req.width,
        height: req.height,
        steps: req.steps,
        cfg_scale: req.guidance,
        seed: req.seed,
        reference_image: req.referenceImage,
      }),
      signal: AbortSignal.timeout(300_000),
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
    const classified = classifyProviderError("Local engine", error);
    localHealthCache = { at: Date.now(), ok: false };
    throw classified;
  }
}

// ------------------------------------------------------------------ OpenAI

async function generateWithOpenAI(req: ProviderRequest): Promise<ProviderResult> {
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

export function resolveProviderOrder(
  requested: ImageProviderChoice | undefined,
  quality: "fast" | "balanced" | "max"
): ImageProviderId[] {
  if (requested && requested !== "auto") return [requested];
  // Prioritize Hugging Face FLUX.1-schnell (unwatermarked, fast, high visual fidelity)
  // Fall back to Gemini, OpenAI, then local engine
  return ["huggingface", "gemini", "openai", "local"];
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

  const status = (
    id: ImageProviderId,
    label: string,
    configured: boolean,
    model: string,
    online: boolean,
    baseReason?: string
  ): ProviderRuntimeStatus => {
    const remaining = getCooldownRemaining(id);
    const available = configured && online && remaining === 0;
    return {
      id,
      label,
      configured,
      available,
      model,
      reason: !configured
        ? "Not configured."
        : remaining > 0
        ? cooldowns.get(id)?.reason
        : !online
        ? baseReason
        : undefined,
    };
  };

  return [
    status(
      "huggingface",
      "Hugging Face SDXL / FLUX",
      hfKey,
      "AP123/SDXL-Lightning",
      true
    ),
    status(
      "gemini",
      "Google Gemini Image",
      geminiKey,
      GEMINI_IMAGE_MODELS[0],
      true,
      "Gemini image access needs quota/billing."
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
      "local",
      "Local CUDA Engine",
      true,
      "local SDXL / SD1.5",
      localOnline,
      "Start the Python engine (image-engine/main.py)."
    ),
  ];
}
