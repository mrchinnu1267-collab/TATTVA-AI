/**
 * TATTVA AI - Google Gemini Native Image Generation Adapter
 * Official Google Gen AI SDK & Interactions REST API Implementation
 * 
 * Capabilities:
 * - Text-to-image generation with Google Gemini native models (preferred: gemini-3.1-flash-image)
 * - Multi-modal reference image editing (text-and-image-to-image)
 * - Sharp buffer validation, dimension inspection, and MIME-type verification
 * - Dynamic aspect ratio mapping (1:1, 16:9, 9:16, 4:3, 3:4, etc.)
 * - Bounded timeouts, quota exhaustion detection, and safe credential handling
 */

import sharp, { Metadata as SharpMetadata } from "sharp";
import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey, GEMINI_IMAGE_MODELS } from "../gemini";
import { bufferToDataUri, truncate } from "../image-utils";
import type { ProviderRequest, ProviderResult } from "../types";

export const PREFERRED_GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";

export function sanitizeGeminiSecret(text: string): string {
  let sanitized = text || "";
  const keysToScrub = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.NANO_BANANA_API_KEY,
    process.env.CLOUDFLARE_API_TOKEN,
    process.env.CLOUDFLARE_ACCOUNT_ID,
  ].filter((k): k is string => Boolean(k && k.trim().length > 3));

  for (const k of keysToScrub) {
    sanitized = sanitized.split(k).join("[REDACTED_SECRET]");
  }

  return sanitized
    .replace(/AIzaSy[a-zA-Z0-9_-]{20,}/g, "[REDACTED_GEMINI_KEY]")
    .replace(/key=[^&\s]+/gi, "key=[REDACTED]")
    .replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, "Bearer [REDACTED]");
}

export class GeminiImageError extends Error {
  public readonly retryable: boolean;
  public readonly category:
    | "QUOTA_EXHAUSTION"
    | "INVALID_AUTHENTICATION"
    | "RATE_LIMITING"
    | "TEMPORARY_SERVER_ERROR"
    | "NETWORK_TIMEOUT"
    | "MODEL_CONFIGURATION_ERROR";
  public readonly cooldownMs: number;

  constructor(
    message: string,
    options: {
      retryable?: boolean;
      category?: GeminiImageError["category"];
      cooldownMs?: number;
    } = {}
  ) {
    super(sanitizeGeminiSecret(message));
    this.name = "GeminiImageError";
    this.retryable = options.retryable ?? true;
    this.category = options.category ?? "TEMPORARY_SERVER_ERROR";
    this.cooldownMs = options.cooldownMs ?? 0;
  }
}

/**
 * Checks whether server-side Gemini credentials are configured.
 */
export function isGeminiImageConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

/**
 * Parses a data URI into MIME type and base64 string payload.
 */
function parseDataUri(dataUri: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUri.trim());
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

/**
 * Classifies errors into specific retryable/non-retryable categories without leaking API secrets.
 */
function classifyGeminiError(error: unknown): GeminiImageError {
  if (error instanceof GeminiImageError) return error;

  let rawMessage = error instanceof Error ? error.message : String(error);
  // Redact potential API key occurrences
  rawMessage = rawMessage.replace(/key=[a-zA-Z0-9_\-]+/gi, "key=[REDACTED]");
  const lower = rawMessage.toLowerCase();

  if (/quota|exhausted|limit|resource_exhausted|429|credits/.test(lower)) {
    const isFreeTierZero = /limit:\s*0|free tier/i.test(lower);
    const friendlyPrefix = isFreeTierZero
      ? "Google Gemini Native Image Generation requires a linked Pay-as-you-go billing account in Google AI Studio (Free Tier rate limit is 0 for image models)."
      : "Gemini Image API quota exceeded or rate limit reached.";
    return new GeminiImageError(
      `${friendlyPrefix} ${truncate(rawMessage, 200)}`,
      {
        retryable: false,
        category: "QUOTA_EXHAUSTION",
        cooldownMs: 60_000,
      }
    );
  }

  if (/unauthorized|forbidden|invalid.*key|api_key_invalid|401|403/.test(lower)) {
    return new GeminiImageError(
      "Gemini API authentication failed: invalid or unauthorized API key.",
      {
        retryable: false,
        category: "INVALID_AUTHENTICATION",
        cooldownMs: 300_000,
      }
    );
  }

  if (/timeout|timed out|abort|deadline/.test(lower)) {
    return new GeminiImageError(
      `Gemini Image request timed out: ${truncate(rawMessage, 150)}`,
      {
        retryable: true,
        category: "NETWORK_TIMEOUT",
        cooldownMs: 5_000,
      }
    );
  }

  if (/not found|model.*not.*exist|404/.test(lower)) {
    return new GeminiImageError(
      `Gemini Image model unavailable: ${truncate(rawMessage, 150)}`,
      {
        retryable: false,
        category: "MODEL_CONFIGURATION_ERROR",
        cooldownMs: 60_000,
      }
    );
  }

  return new GeminiImageError(
    `Gemini Image generation failed: ${truncate(rawMessage, 240)}`,
    {
      retryable: true,
      category: "TEMPORARY_SERVER_ERROR",
      cooldownMs: 10_000,
    }
  );
}

/**
 * Validates and decodes image bytes using Sharp.
 * Enforces:
 * - Buffer length > 0 and <= 25MB
 * - Valid image format (png, jpeg, webp)
 * - Dimensions: width > 0, height > 0
 */
export async function validateAndExtractImageBuffer(
  buffer: Buffer,
  fallbackMime: string = "image/png"
): Promise<{ buffer: Buffer; mimeType: string; width: number; height: number }> {
  if (!buffer || buffer.length === 0) {
    throw new GeminiImageError("Gemini returned an empty image buffer.", {
      retryable: false,
      category: "TEMPORARY_SERVER_ERROR",
    });
  }

  if (buffer.length > 25 * 1024 * 1024) {
    throw new GeminiImageError("Generated image exceeds the 25MB size limit.", {
      retryable: false,
      category: "TEMPORARY_SERVER_ERROR",
    });
  }

  let metadata: SharpMetadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch (err: any) {
    throw new GeminiImageError(`Invalid image payload returned: ${err.message}`, {
      retryable: false,
      category: "TEMPORARY_SERVER_ERROR",
    });
  }

  const format = (metadata.format || "").toLowerCase();
  let mimeType = fallbackMime;
  if (format === "png") mimeType = "image/png";
  else if (format === "jpeg" || format === "jpg") mimeType = "image/jpeg";
  else if (format === "webp") mimeType = "image/webp";

  const width = metadata.width || 1024;
  const height = metadata.height || 1024;

  if (width <= 0 || height <= 0) {
    throw new GeminiImageError("Generated image has invalid dimensions (0x0).", {
      retryable: false,
      category: "TEMPORARY_SERVER_ERROR",
    });
  }

  return { buffer, mimeType, width, height };
}

/**
 * Maps application aspect ratios to supported Gemini Interactions aspect ratios.
 * Valid: 1:1, 16:9, 9:16, 4:3, 3:4, 2:3, 3:2, 4:5, 5:4, 21:9
 */
export function mapGeminiAspectRatio(aspectRatio?: string): string {
  if (!aspectRatio) return "1:1";
  const normalized = aspectRatio.trim().toLowerCase();
  switch (normalized) {
    case "16:9":
    case "wide":
    case "landscape":
      return "16:9";
    case "9:16":
    case "story":
    case "portrait":
      return "9:16";
    case "4:3":
      return "4:3";
    case "3:4":
      return "3:4";
    case "2:3":
      return "2:3";
    case "3:2":
      return "3:2";
    case "4:5":
      return "4:5";
    case "5:4":
      return "5:4";
    case "21:9":
      return "21:9";
    case "1:1":
    case "square":
    default:
      return "1:1";
  }
}

/**
 * Generates an image using Google's official Gemini Gen AI SDK Interactions API.
 */
async function generateViaGenAiSdk(
  apiKey: string,
  modelName: string,
  req: ProviderRequest
): Promise<ProviderResult | null> {
  const ai = new GoogleGenAI({ apiKey });
  const geminiAspectRatio = mapGeminiAspectRatio(req.aspectRatio);

  let inputPayload: any;
  if (req.referenceImage) {
    const parsed = parseDataUri(req.referenceImage);
    if (parsed) {
      inputPayload = [
        { type: "text", text: req.prompt },
        { type: "image", mime_type: parsed.mimeType, data: parsed.data },
      ];
    } else {
      inputPayload = req.prompt;
    }
  } else {
    inputPayload = req.prompt;
  }

  const responseFormat: any = {
    type: "image",
    aspect_ratio: geminiAspectRatio,
    image_size: "1K",
  };

  const started = Date.now();
  const interaction = await ai.interactions.create({
    model: modelName,
    input: inputPayload,
    response_format: responseFormat,
  });

  const rawOutput = (interaction as any)?.output_image || (interaction as any)?.outputImage;
  let imgData: string | undefined = rawOutput?.data;
  let mime: string = rawOutput?.mime_type || rawOutput?.mimeType || "image/png";

  if (!imgData && (interaction as any)?.steps) {
    for (const step of (interaction as any).steps) {
      if (step.content) {
        for (const item of step.content) {
          if (item.type === "image" && (item.data || item.image?.data)) {
            imgData = item.data || item.image?.data;
            mime = item.mime_type || item.mimeType || item.image?.mime_type || "image/png";
            break;
          }
        }
      }
    }
  }

  if (imgData) {
    const rawBuffer = Buffer.from(imgData, "base64");
    const validated = await validateAndExtractImageBuffer(rawBuffer, mime);

    return {
      image: bufferToDataUri(validated.buffer, validated.mimeType),
      provider: "gemini",
      model: modelName,
      seed: req.seed,
      width: validated.width,
      height: validated.height,
      latencyMs: Date.now() - started,
      revisedPrompt:
        (interaction as any)?.output_text ||
        (interaction as any)?.outputText ||
        undefined,
    };
  }

  return null;
}

/**
 * Generates an image via direct REST interactions or generateContent endpoints.
 * Provides a reliable fallback across diverse serverless and edge environments.
 */
async function generateViaRest(
  apiKey: string,
  modelName: string,
  req: ProviderRequest
): Promise<ProviderResult> {
  const started = Date.now();
  const geminiAspectRatio = mapGeminiAspectRatio(req.aspectRatio);

  // Strategy A: Interactions API REST endpoint
  const interactionsEndpoint = "https://generativelanguage.googleapis.com/v1beta/interactions";
  let inputPayload: any;
  if (req.referenceImage) {
    const parsed = parseDataUri(req.referenceImage);
    if (parsed) {
      inputPayload = [
        { type: "text", text: req.prompt },
        { type: "image", mime_type: parsed.mimeType, data: parsed.data },
      ];
    } else {
      inputPayload = req.prompt;
    }
  } else {
    inputPayload = req.prompt;
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 90_000);

  try {
    const res = await fetch(interactionsEndpoint, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        input: inputPayload,
        response_format: {
          type: "image",
          aspect_ratio: geminiAspectRatio,
          image_size: "1K",
        },
      }),
      signal: abortController.signal,
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const outputImg = data?.output_image;
      if (outputImg?.data) {
        const rawBuffer = Buffer.from(outputImg.data, "base64");
        const mime = outputImg.mime_type || "image/png";
        const validated = await validateAndExtractImageBuffer(rawBuffer, mime);

        return {
          image: bufferToDataUri(validated.buffer, validated.mimeType),
          provider: "gemini",
          model: modelName,
          seed: req.seed,
          width: validated.width,
          height: validated.height,
          latencyMs: Date.now() - started,
          revisedPrompt: data?.output_text || undefined,
        };
      }
    }
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new GeminiImageError("Gemini Interactions request timed out.", {
        retryable: true,
        category: "NETWORK_TIMEOUT",
      });
    }
    // Fall through to Strategy B
  } finally {
    clearTimeout(timeoutId);
  }

  // Strategy B: generateContent with IMAGE and TEXT response modalities
  const contentEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    modelName
  )}:generateContent?key=${apiKey}`;

  const parts: any[] = [];
  if (req.referenceImage) {
    const parsed = parseDataUri(req.referenceImage);
    if (parsed) {
      parts.push({
        inlineData: {
          mimeType: parsed.mimeType,
          data: parsed.data,
        },
      });
    }
  }

  const promptText = req.aspectRatio
    ? `${req.prompt}\n\nAspect ratio: ${geminiAspectRatio}. Generate the requested image.`
    : req.prompt;
  parts.push({ text: promptText });

  const contentAbortController = new AbortController();
  const contentTimeoutId = setTimeout(() => contentAbortController.abort(), 90_000);

  try {
    const res = await fetch(contentEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.7,
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
      signal: contentAbortController.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || `Gemini HTTP ${res.status}`;
      throw new Error(msg);
    }

    const candidate = data?.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData?.data);
    if (imagePart?.inlineData?.data) {
      const mime = imagePart.inlineData.mimeType || "image/png";
      const rawBuffer = Buffer.from(imagePart.inlineData.data, "base64");
      const validated = await validateAndExtractImageBuffer(rawBuffer, mime);

      const revised = candidate?.content?.parts
        ?.map((p: any) => p.text || "")
        .filter(Boolean)
        .join("\n");

      return {
        image: bufferToDataUri(validated.buffer, validated.mimeType),
        provider: "gemini",
        model: modelName,
        seed: req.seed,
        width: validated.width,
        height: validated.height,
        latencyMs: Date.now() - started,
        revisedPrompt: revised || undefined,
      };
    }

    const blocked = data?.promptFeedback?.blockReason;
    if (blocked) {
      throw new GeminiImageError(`Prompt was blocked by Gemini safety filters: ${blocked}`, {
        retryable: false,
        category: "MODEL_CONFIGURATION_ERROR",
      });
    }

    throw new GeminiImageError(`Gemini model ${modelName} returned no image parts in candidate output.`, {
      retryable: true,
      category: "TEMPORARY_SERVER_ERROR",
    });
  } finally {
    clearTimeout(contentTimeoutId);
  }
}

/**
 * Master entrypoint for generating an image with Google Gemini.
 * Tries the preferred model first (`gemini-3.1-flash-image`), falling back gracefully
 * to secondary image-capable models if necessary.
 */
export async function generateWithGemini(req: ProviderRequest): Promise<ProviderResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new GeminiImageError(
      "GEMINI_API_KEY is not configured in server environment variables.",
      { retryable: false, category: "INVALID_AUTHENTICATION" }
    );
  }

  // Model cascade: Preferred model first, then alternatives
  const modelsToTry = [
    PREFERRED_GEMINI_IMAGE_MODEL,
    ...GEMINI_IMAGE_MODELS.filter((m) => m !== PREFERRED_GEMINI_IMAGE_MODEL),
  ];

  let lastError: unknown;
  for (const model of modelsToTry) {
    try {
      // 1. Try official SDK Interactions API
      try {
        const sdkResult = await generateViaGenAiSdk(apiKey, model, req);
        if (sdkResult) return sdkResult;
      } catch (sdkErr: any) {
        // If SDK fails with quota or auth error, don't silently loop; classify and check
        const classified = classifyGeminiError(sdkErr);
        if (classified.category === "QUOTA_EXHAUSTION" || classified.category === "INVALID_AUTHENTICATION") {
          throw classified;
        }
      }

      // 2. Try REST Interactions & generateContent API
      const restResult = await generateViaRest(apiKey, model, req);
      if (restResult) return restResult;
    } catch (err: any) {
      const classified = classifyGeminiError(err);
      if (classified.category === "QUOTA_EXHAUSTION" || classified.category === "INVALID_AUTHENTICATION") {
        throw classified;
      }
      lastError = classified;
    }
  }

  throw lastError instanceof GeminiImageError
    ? lastError
    : classifyGeminiError(lastError || "Gemini native image generation failed.");
}
