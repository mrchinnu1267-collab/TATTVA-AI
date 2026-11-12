/**
 * Minimal Gemini REST client used by the image engine.
 * Kept dependency-free so it also works in edge/route handlers.
 */

export const GEMINI_TEXT_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
] as const;

export const GEMINI_IMAGE_MODELS = [
  "gemini-3.1-flash-image",
  "gemini-2.5-flash-image",
  "gemini-3-pro-image-preview",
  "imagen-3.0-generate-002",
] as const;

export const NANO_BANANA_MODELS = [
  "gemini-2.5-flash-image", // Nano Banana 2.1 / Flash Image Preview
  "gemini-3.1-flash-image", // Nano Banana 2
  "gemini-3-pro-image-preview", // Nano Banana Pro
  "imagen-3.0-generate-002", // Imagen 3 Nano Banana Architecture
] as const;

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export const GEMINI_SAFETY_SETTINGS = [
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_LOW_AND_ABOVE",
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH",
    threshold: "BLOCK_MEDIUM_AND_ABOVE",
  },
  {
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE",
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE",
  },
];

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string; code?: number };
}

export function getGeminiApiKey(): string | undefined {
  const key =
    process.env.NANO_BANANA_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  return key ? key.trim() : undefined;
}

function parseDataUri(dataUri: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUri);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function callGemini(
  model: string,
  parts: GeminiPart[],
  options: {
    temperature?: number;
    json?: boolean;
    apiKey: string;
    timeoutMs?: number;
    responseModalities?: string[];
  }
): Promise<GeminiResponse> {
  const res = await fetch(`${BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${options.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: options.temperature ?? 0.4,
        ...(options.json ? { responseMimeType: "application/json" } : {}),
        ...(options.responseModalities ? { responseModalities: options.responseModalities } : {}),
      },
      safetySettings: GEMINI_SAFETY_SETTINGS,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
  });

  const data = (await res.json().catch(() => ({}))) as GeminiResponse;
  if (!res.ok) {
    const message = data.error?.message || `Gemini HTTP ${res.status}`;
    throw new Error(message);
  }
  return data;
}

function textFromResponse(data: GeminiResponse): string {
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .filter(Boolean)
      .join("\n") || ""
  );
}

export async function geminiText(
  prompt: string,
  options: { json?: boolean; temperature?: number; timeoutMs?: number } = {}
): Promise<{ text: string; model: string }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  let lastError: unknown;
  for (const model of GEMINI_TEXT_MODELS) {
    try {
      const data = await callGemini(model, [{ text: prompt }], {
        apiKey,
        json: options.json,
        temperature: options.temperature,
        timeoutMs: options.timeoutMs,
      });
      const text = textFromResponse(data);
      if (text) return { text, model };
      lastError = new Error(`Gemini ${model} returned an empty response.`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini text request failed.");
}

export async function geminiVision(
  prompt: string,
  imageDataUri: string,
  options: { json?: boolean; temperature?: number; timeoutMs?: number } = {}
): Promise<{ text: string; model: string }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const inlineData = parseDataUri(imageDataUri);
  if (!inlineData) throw new Error("Vision input is not a base64 image.");

  const parts: GeminiPart[] = [{ inlineData }, { text: prompt }];
  let lastError: unknown;
  for (const model of GEMINI_TEXT_MODELS) {
    try {
      const data = await callGemini(model, parts, {
        apiKey,
        json: options.json,
        temperature: options.temperature ?? 0.1,
        timeoutMs: options.timeoutMs ?? 90_000,
      });
      const text = textFromResponse(data);
      if (text) return { text, model };
      lastError = new Error(`Gemini vision ${model} returned an empty response.`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini vision request failed.");
}

export async function geminiImage(
  prompt: string,
  options: { referenceImage?: string; aspectRatio?: string; timeoutMs?: number } = {}
): Promise<{ image: string; model: string; revisedPrompt?: string }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const parts: GeminiPart[] = [];
  if (options.referenceImage) {
    const inlineData = parseDataUri(options.referenceImage);
    if (inlineData) parts.push({ inlineData });
  }
  parts.push({
    text: options.aspectRatio
      ? `${prompt}\n\nOutput aspect ratio: ${options.aspectRatio}.`
      : prompt,
  });

  let lastError: unknown;
  for (const model of GEMINI_IMAGE_MODELS) {
    try {
      const data = await callGemini(model, parts, {
        apiKey,
        temperature: 0.7,
        timeoutMs: options.timeoutMs ?? 180_000,
        responseModalities: ["IMAGE", "TEXT"],
      });

      const imagePart = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
      if (imagePart?.inlineData) {
        const mime = imagePart.inlineData.mimeType || "image/png";
        const revised = data.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .filter(Boolean)
          .join("\n");
        return {
          image: `data:${mime};base64,${imagePart.inlineData.data}`,
          model,
          revisedPrompt: revised || undefined,
        };
      }

      const blocked = data.promptFeedback?.blockReason;
      lastError = new Error(
        blocked
          ? `Gemini blocked the prompt (${blocked}).`
          : `Gemini ${model} returned no image.`
      );
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini image generation failed.");
}

/**
 * Nano Banana Image Generation Adapter
 * Uses Google's state-of-the-art conversational image generation models (Gemini Flash Image / Pro Image)
 * with multi-image conditioning, precise prompt alignment, and character preservation.
 */
export async function nanoBananaImage(
  prompt: string,
  options: { referenceImage?: string; aspectRatio?: string; timeoutMs?: number } = {}
): Promise<{ image: string; model: string; revisedPrompt?: string }> {
  return geminiImage(prompt, options);
}
