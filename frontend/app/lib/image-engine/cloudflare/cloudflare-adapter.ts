/**
 * TATTVA AI - Cloudflare Workers AI Provider Adapter
 * Model: @cf/black-forest-labs/flux-1-schnell (FLUX.1 [schnell] 12B)
 *
 * Security & Execution Rules:
 * 1. Server-side execution only: API tokens & Account IDs are never exposed to client-side code.
 * 2. Free allocation is 10,000 Neurons/day; remaining account quota must be checked in Cloudflare.
 * 3. This provider is explicit-only and never falls back to another provider.
 * 4. Requests use only the prompt and steps fields supported by Cloudflare's model schema.
 */

import sharp from "sharp";
import { bufferToDataUri } from "../image-utils";
import type { ProviderRequest, ProviderResult } from "../types";

export const CLOUDFLARE_FLUX_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const CF_API_BASE = "https://api.cloudflare.com/client/v4/accounts";

// In-flight deduplication cache to prevent duplicate concurrent requests
const inFlightRequests = new Map<string, Promise<ProviderResult>>();

export interface CloudflareCredentials {
  accountId: string;
  apiToken: string;
}

export interface CloudflareUsageEstimate {
  tiles: number;
  steps: number;
  estimatedNeurons: number;
  estimatedCostUsd: number;
}

/**
 * Safely resolves Cloudflare credentials from server-side environment variables.
 */
export function getCloudflareCredentials(): CloudflareCredentials | null {
  const accountId = (
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CF_ACCOUNT_ID ||
    ""
  ).trim();

  const apiToken = (
    process.env.CLOUDFLARE_API_TOKEN ||
    process.env.CF_API_TOKEN ||
    ""
  ).trim();

  if (!accountId || !apiToken) {
    return null;
  }

  return { accountId, apiToken };
}

/**
 * Checks whether Cloudflare Workers AI is configured on this deployment.
 */
export function isCloudflareConfigured(): boolean {
  return getCloudflareCredentials() !== null;
}

/**
 * Verifies Cloudflare API Token and Account ID validity without generating an image or consuming Neurons.
 * Calls standard Cloudflare v4 verification endpoints:
 * 1. GET /client/v4/user/tokens/verify
 * 2. GET /client/v4/accounts/{accountId}
 */
export async function verifyCloudflareCredentials(): Promise<{
  configured: boolean;
  tokenValid: boolean;
  tokenStatus?: string;
  accountValid: boolean;
  accountName?: string;
  errors?: string[];
}> {
  const credentials = getCloudflareCredentials();
  if (!credentials) {
    return {
      configured: false,
      tokenValid: false,
      accountValid: false,
      errors: ["Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in environment variables"],
    };
  }

  const errors: string[] = [];
  let tokenValid = false;
  let tokenStatus: string | undefined;
  let accountValid = false;
  let accountName: string | undefined;

  // 1. Verify token status (zero cost, zero neurons)
  try {
    const tokenRes = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    const tokenData = await tokenRes.json().catch(() => null);
    if (tokenRes.ok && tokenData?.success) {
      tokenValid = true;
      tokenStatus = tokenData.result?.status || "active";
    } else {
      errors.push(
        tokenData?.errors?.[0]?.message || `Token verification returned HTTP ${tokenRes.status}`
      );
    }
  } catch (err: any) {
    errors.push(`Token verification network error: ${err.message}`);
  }

  // 2. Verify account accessibility (zero cost, zero neurons)
  try {
    const accountRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${credentials.accountId}`, {
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    const accountData = await accountRes.json().catch(() => null);
    if (accountRes.ok && accountData?.success) {
      accountValid = true;
      accountName = accountData.result?.name;
    } else {
      errors.push(
        accountData?.errors?.[0]?.message || `Account access check returned HTTP ${accountRes.status}`
      );
    }
  } catch (err: any) {
    errors.push(`Account access network error: ${err.message}`);
  }

  return {
    configured: true,
    tokenValid,
    tokenStatus,
    accountValid,
    accountName,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Computes exact Neuron usage based on official Cloudflare Workers AI pricing:
 * - 4.80 Neurons per 512x512 tile ($0.0000528)
 * - 9.60 Neurons per step per tile ($0.0001056)
 */
export function calculateCloudflareUsage(width: number, height: number, steps: number): CloudflareUsageEstimate {
  // Tile count is calculated in 512x512 blocks
  const horizontalTiles = Math.max(1, Math.ceil(width / 512));
  const verticalTiles = Math.max(1, Math.ceil(height / 512));
  const tiles = horizontalTiles * verticalTiles;
  
  const tileNeurons = tiles * 4.80;
  const stepNeurons = steps * (tiles * 9.60);
  const totalNeurons = Math.round((tileNeurons + stepNeurons) * 10) / 10;
  
  // Paid overage cost ($0.011 per 1,000 Neurons)
  const estimatedCostUsd = Math.round((totalNeurons / 1000) * 0.011 * 100000) / 100000;

  return {
    tiles,
    steps,
    estimatedNeurons: totalNeurons,
    estimatedCostUsd,
  };
}

export function resolveCloudflareSteps(quality: ProviderRequest["quality"]): number {
  return quality === "fast" ? 1 : quality === "max" ? 8 : 4;
}

/**
 * Helper to determine target dimensions from aspect ratio.
 * Cloudflare FLUX.1 Schnell generates at 1024x1024, and Sharp adjusts to the requested framing.
 */
function resolveDimensionsForAspectRatio(aspectRatio?: string): { width: number; height: number } {
  switch (aspectRatio) {
    case "16:9":
      return { width: 1024, height: 576 };
    case "9:16":
      return { width: 576, height: 1024 };
    case "4:3":
      return { width: 1024, height: 768 };
    case "3:4":
      return { width: 768, height: 1024 };
    case "3:2":
      return { width: 1024, height: 682 };
    case "2:3":
      return { width: 682, height: 1024 };
    case "1:1":
    default:
      return { width: 1024, height: 1024 };
  }
}

/**
 * Generates an image using Cloudflare Workers AI FLUX.1 Schnell.
 * Throws explicit, categorized errors if credentials are missing, invalid, or quota exceeded.
 * Employs in-flight deduplication to prevent double-billing and duplicate requests.
 */
export async function generateWithCloudflare(req: ProviderRequest): Promise<ProviderResult> {
  const credentials = getCloudflareCredentials();
  if (!credentials) {
    throw new Error(
      "Cloudflare Workers AI credentials missing: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be configured in server environment."
    );
  }

  const prompt = req.prompt.trim();
  if (!prompt) {
    throw new Error("A prompt is required for image generation.");
  }

  // Cloudflare schema accepts prompt string (trim to 2048 if longer)
  const safePrompt = prompt.length > 2048 ? prompt.slice(0, 2048) : prompt;
  const steps = resolveCloudflareSteps(req.quality);
  const targetDims = resolveDimensionsForAspectRatio(req.aspectRatio);
  const seed = req.seed || Math.floor(Math.random() * 2147483647);

  // Deduplication key based on safe prompt, quality, and aspect ratio
  const dedupKey = `${safePrompt}_${req.aspectRatio || "1:1"}_${req.quality || "balanced"}`;
  const existingRequest = inFlightRequests.get(dedupKey);
  if (existingRequest) {
    return existingRequest;
  }

  const executionPromise = (async (): Promise<ProviderResult> => {
    const endpoint = `${CF_API_BASE}/${credentials.accountId}/ai/run/${CLOUDFLARE_FLUX_MODEL}`;
    const started = Date.now();

    const payload: Record<string, unknown> = {
      prompt: safePrompt,
      steps,
    };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
          "Content-Type": "application/json",
          "User-Agent": "TATTVA-AI-Image-Engine/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45_000), // 45s timeout
      });
    } catch (networkErr: any) {
      if (networkErr.name === "TimeoutError" || networkErr.message?.includes("timed out")) {
        throw new Error("Cloudflare Workers AI generation timed out after 45 seconds. Please try again.");
      }
      throw new Error(`Cloudflare Workers AI network error: ${networkErr.message || "Connection failed"}`);
    }

    const durationMs = Date.now() - started;

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson.errors && Array.isArray(errJson.errors) && errJson.errors.length > 0) {
          const firstErr = errJson.errors[0];
          errorMessage = `[Code ${firstErr.code}] ${firstErr.message}`;
        }
      } catch {
        // Keep HTTP status text if not JSON
      }

      // Ensure credentials are never logged or leaked
      errorMessage = errorMessage.replace(new RegExp(credentials.apiToken, "g"), "[REDACTED_TOKEN]");
      errorMessage = errorMessage.replace(new RegExp(credentials.accountId, "g"), "[REDACTED_ACCOUNT]");

      if (response.status === 401 || response.status === 403) {
        throw new Error(`Cloudflare Authentication Failed: ${errorMessage}. Check CLOUDFLARE_API_TOKEN permissions.`);
      }
      if (response.status === 429) {
        throw new Error(`Cloudflare Workers AI Rate Limit or Daily Free Neurons Quota Exceeded (10,000 Neurons/day).`);
      }
      throw new Error(`Cloudflare Workers AI API error: ${errorMessage}`);
    }

    // Cloudflare Workers AI returns JSON with { result: { image: "<base64>" }, success: true }
    // or binary image stream depending on headers.
    const contentType = response.headers.get("content-type") || "";
    let rawBuffer: Buffer;

    if (contentType.includes("application/json")) {
      const data = await response.json();
      if (!data.success && data.errors && data.errors.length > 0) {
        throw new Error(`Cloudflare Workers AI error: ${data.errors[0].message}`);
      }
      if (!data.result || !data.result.image) {
        throw new Error("Cloudflare Workers AI returned success but missing result.image payload.");
      }
      rawBuffer = Buffer.from(data.result.image, "base64");
    } else {
      const arrayBuffer = await response.arrayBuffer();
      rawBuffer = Buffer.from(arrayBuffer);
    }

    // Process with Sharp to conform to requested aspect ratio & format
    let finalBuffer: Buffer = rawBuffer;
    let finalWidth = 1024;
    let finalHeight = 1024;

    try {
      const sharpInstance = sharp(rawBuffer);
      const meta = await sharpInstance.metadata();
      const currentWidth = meta.width || 1024;
      const currentHeight = meta.height || 1024;

      if (req.aspectRatio && req.aspectRatio !== "1:1") {
        finalBuffer = await sharp(rawBuffer)
          .resize(targetDims.width, targetDims.height, {
            fit: "cover",
            position: "center",
          })
          .jpeg({ quality: 92, mozjpeg: true })
          .toBuffer();
        finalWidth = targetDims.width;
        finalHeight = targetDims.height;
      } else {
        finalWidth = currentWidth;
        finalHeight = currentHeight;
      }
    } catch {
      finalBuffer = rawBuffer;
    }

    const dataUri = bufferToDataUri(finalBuffer, "image/jpeg");

    return {
      image: dataUri,
      provider: "cloudflare",
      model: CLOUDFLARE_FLUX_MODEL,
      seed,
      width: finalWidth,
      height: finalHeight,
      latencyMs: durationMs,
    };
  })();

  // Track in-flight request and clean up upon completion or rejection
  inFlightRequests.set(dedupKey, executionPromise);
  try {
    return await executionPromise;
  } finally {
    inFlightRequests.delete(dedupKey);
  }
}

/**
 * Diagnostic test harness for verifying Cloudflare Workers AI configuration and live connectivity.
 */
export async function testCloudflareWorkersAi(testPrompt = "A realistic studio photograph of a golden retriever puppy"): Promise<{
  configured: boolean;
  authenticated: boolean;
  generationSuccess: boolean;
  latencyMs: number;
  error?: string;
  returnedImageLength?: number;
  dimensions?: { width: number; height: number };
  usageEstimate?: CloudflareUsageEstimate;
}> {
  const credentials = getCloudflareCredentials();
  if (!credentials) {
    return {
      configured: false,
      authenticated: false,
      generationSuccess: false,
      latencyMs: 0,
      error: "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN environment variables.",
    };
  }

  const usageEstimate = calculateCloudflareUsage(1024, 1024, 4);
  const started = Date.now();

  try {
    const result = await generateWithCloudflare({
      prompt: testPrompt,
      negativePrompt: "",
      width: 1024,
      height: 1024,
      steps: 4,
      guidance: 3.5,
      seed: 42,
      aspectRatio: "1:1",
      quality: "balanced",
    });

    return {
      configured: true,
      authenticated: true,
      generationSuccess: true,
      latencyMs: result.latencyMs || (Date.now() - started),
      returnedImageLength: result.image.length,
      dimensions: { width: result.width, height: result.height },
      usageEstimate,
    };
  } catch (err: any) {
    const isAuth = err.message.includes("Authentication Failed") || err.message.includes("401");
    return {
      configured: true,
      authenticated: !isAuth,
      generationSuccess: false,
      latencyMs: Date.now() - started,
      error: err.message,
      usageEstimate,
    };
  }
}
