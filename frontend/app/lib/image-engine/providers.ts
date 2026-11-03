/**
 * Provider adapters. Ordering is preference-based: cloud quality first, free
 * fallback last, local engine when it is actually running.
 */

import { InferenceClient } from "@huggingface/inference";
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
      { retryable: false, cooldownMs: 10 * 60_000 }
    );
  }
  if (auth) {
    return new ImageProviderError(`${label} rejected the credentials. ${truncate(message, 240)}`, {
      retryable: false,
      cooldownMs: 10 * 60_000,
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

const HF_IMAGE_MODELS = [
  { model: "black-forest-labs/FLUX.1-dev", provider: "fal-ai" },
  { model: "black-forest-labs/FLUX.1-schnell", provider: "nscale" },
  { model: "stabilityai/stable-diffusion-3-medium-diffusers", provider: "hf-inference" },
];

let hfClient: InferenceClient | null = null;

function getHfClient(token: string): InferenceClient {
  if (!hfClient) hfClient = new InferenceClient(token);
  return hfClient;
}

async function generateWithHuggingFace(req: ProviderRequest): Promise<ProviderResult> {
  const token = (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "").trim();
  if (!token) throw new ImageProviderError("HF_TOKEN is not configured.", { retryable: false });

  const remaining = getCooldownRemaining("huggingface");
  if (remaining > 0) {
    throw new ImageProviderError(
      `Hugging Face is cooling down for ${Math.ceil(remaining / 1000)}s.`,
      { retryable: false, cooldownMs: remaining }
    );
  }

  const client = getHfClient(token);
  let lastError: unknown;

  for (const candidate of HF_IMAGE_MODELS) {
    const started = Date.now();
    try {
      const blob = await client.textToImage(
        {
          model: candidate.model,
          inputs: req.prompt,
          parameters: {
            negative_prompt: req.negativePrompt,
            width: req.width,
            height: req.height,
            num_inference_steps: req.steps,
            guidance_scale: req.guidance,
            seed: req.seed,
          },
          provider: candidate.provider as never,
        },
        { outputType: "blob" }
      );

      const buffer = Buffer.from(await blob.arrayBuffer());
      return {
        image: bufferToDataUri(buffer, blob.type || "image/png"),
        provider: "huggingface",
        model: candidate.model,
        seed: req.seed,
        width: req.width,
        height: req.height,
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      const classified = classifyProviderError("Hugging Face", error);
      lastError = classified;
      // Stop early on account-level failures; otherwise try the next model.
      if (/credits|quota|credentials|billing/i.test(classified.message)) break;
    }
  }

  const classified =
    lastError instanceof ImageProviderError
      ? lastError
      : classifyProviderError("Hugging Face", lastError);
  if (classified.cooldownMs) setCooldown("huggingface", classified.cooldownMs, classified.message);
  throw classified;
}

// ---------------------------------------------------------------------- Local

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

// --------------------------------------------------------------- Pollinations

let pollinationsNextSlot = 0;

async function generateWithPollinations(req: ProviderRequest): Promise<ProviderResult> {
  const wait = pollinationsNextSlot - Date.now();
  if (wait > 0) {
    throw new ImageProviderError(
      `Free image slot is cooling down. Try again in ${Math.ceil(wait / 1000)}s or configure Gemini/Hugging Face credits.`,
      { retryable: false, cooldownMs: wait }
    );
  }

  const dims = fitWithinArea(req.width, req.height, 768 * 768, 8);
  const isHumanSubject = /\b(woman|women|girl|girls|lady|ladies|female|man|men|boy|boys|male|person|people|model|portrait|human|character)\b/i.test(req.prompt);
  const safePrompt = isHumanSubject
    ? `${req.prompt}, fully clothed, modest attire, sfw, non-suggestive`
    : req.prompt;
  const prompt = truncate(safePrompt, 1600);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${dims.width}&height=${dims.height}` +
    `&seed=${encodeURIComponent(String(req.seed))}` +
    `&nologo=true&safe=true&enhance=false`;

  const started = Date.now();
  pollinationsNextSlot = Date.now() + 45_000;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const retryAfter = Number(res.headers.get("retry-after") || 0);
      pollinationsNextSlot = Date.now() + Math.max(45_000, retryAfter * 1000);
      throw new Error(`HTTP ${res.status}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      const body = await res.text().catch(() => "");
      throw new Error(`Unexpected response: ${truncate(body, 200)}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      image: bufferToDataUri(buffer, contentType.split(";")[0] || "image/jpeg"),
      provider: "pollinations",
      model: "pollinations-flux",
      seed: req.seed,
      width: dims.width,
      height: dims.height,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    const classified = classifyProviderError("Pollinations", error);
    if (!classified.cooldownMs) setCooldown("pollinations", 45_000, classified.message);
    throw classified;
  }
}

export function resolveProviderOrder(
  requested: ImageProviderChoice | undefined,
  quality: "fast" | "balanced" | "max"
): ImageProviderId[] {
  if (requested && requested !== "auto") return [requested];
  // Quality-first when max, latency-first when fast. Pollinations is always last.
  return quality === "max"
    ? ["gemini", "huggingface", "local", "pollinations"]
    : ["gemini", "huggingface", "pollinations", "local"];
}

export async function generateWithProvider(
  provider: ImageProviderId,
  req: ProviderRequest
): Promise<ProviderResult> {
  switch (provider) {
    case "gemini":
      return generateWithGemini(req);
    case "huggingface":
      return generateWithHuggingFace(req);
    case "local":
      return generateWithLocal(req);
    case "pollinations":
      return generateWithPollinations(req);
    default:
      throw new ImageProviderError(`Unknown provider: ${provider as string}`);
  }
}

export async function getProviderStatuses(): Promise<ProviderRuntimeStatus[]> {
  const geminiKey = Boolean((process.env.GEMINI_API_KEY || "").trim());
  const hfKey = Boolean((process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "").trim());
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
      "gemini",
      "Google Gemini Image",
      geminiKey,
      GEMINI_IMAGE_MODELS[0],
      true,
      "Gemini image access needs quota/billing."
    ),
    status(
      "huggingface",
      "Hugging Face FLUX",
      hfKey,
      HF_IMAGE_MODELS[0].model,
      true,
      "Hugging Face needs inference credits."
    ),
    status(
      "local",
      "Local CUDA Engine",
      true,
      "local SDXL / SD1.5",
      localOnline,
      "Start the Python engine (image-engine/main.py)."
    ),
    status(
      "pollinations",
      "Pollinations (free)",
      true,
      "pollinations-flux",
      true,
      "Free fallback: max 768x768, one image every 45s."
    ),
  ];
}
