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

import { bufferToDataUri } from "../image-utils";
import type { ProviderRequest, ProviderResult } from "../types";

export const CLOUDFLARE_FLUX_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const CF_API_BASE = "https://api.cloudflare.com/client/v4/accounts";

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
 * Generates an image using Cloudflare Workers AI FLUX.1 Schnell.
 * Throws explicit, categorized errors if credentials are missing, invalid, or quota exceeded.
 */
export async function generateWithCloudflare(req: ProviderRequest): Promise<ProviderResult> {
  const credentials = getCloudflareCredentials();
  if (!credentials) {
    throw new Error(
      "Cloudflare Workers AI credentials missing: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set in environment variables."
    );
  }

  if (req.aspectRatio !== "1:1") {
    throw new Error("Cloudflare FLUX.1 Schnell supports square 1:1 output only.");
  }
  const prompt = req.prompt.trim();
  if (!prompt || prompt.length > 2048) {
    throw new Error("Cloudflare FLUX.1 Schnell requires a prompt between 1 and 2048 characters.");
  }

  const width = 1024;
  const height = 1024;
  const steps = resolveCloudflareSteps(req.quality);
  const seed = req.seed || Math.floor(Math.random() * 2147483647);
  
  const usage = calculateCloudflareUsage(width, height, steps);
  const endpoint = `${CF_API_BASE}/${credentials.accountId}/ai/run/${CLOUDFLARE_FLUX_MODEL}`;
  const started = Date.now();

  const payload: Record<string, unknown> = {
    prompt,
    steps,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.apiToken}`,
      "Content-Type": "application/json",
      "User-Agent": "TATTVA-AI-Image-Engine/1.0",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000), // 30s timeout
  });

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

    if (response.status === 401 || response.status === 403) {
      throw new Error(`Cloudflare Authentication Failed: ${errorMessage}. Verify CLOUDFLARE_API_TOKEN permissions.`);
    }
    if (response.status === 429) {
      throw new Error(`Cloudflare Workers AI Rate Limit or Daily Free Neurons Quota Exceeded (10,000 Neurons/day).`);
    }
    throw new Error(`Cloudflare Workers AI API error: ${errorMessage}`);
  }

  // Cloudflare Workers AI returns JSON with { result: { image: "<base64>" }, success: true }
  // or binary stream depending on headers. We handle both:
  const contentType = response.headers.get("content-type") || "";
  let base64Image = "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    if (!data.success && data.errors && data.errors.length > 0) {
      throw new Error(`Cloudflare Workers AI error: ${data.errors[0].message}`);
    }
    if (!data.result || !data.result.image) {
      throw new Error("Cloudflare Workers AI returned success but missing result.image payload.");
    }
    base64Image = data.result.image;
  } else {
    // Binary image buffer returned
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return {
      image: bufferToDataUri(buffer, contentType || "image/jpeg"),
      provider: "cloudflare",
      model: CLOUDFLARE_FLUX_MODEL,
      seed,
      width,
      height,
      latencyMs: durationMs,
    };
  }

  // Construct Data URI from base64
  const dataUri = base64Image.startsWith("data:")
    ? base64Image
    : `data:image/jpeg;base64,${base64Image}`;

  return {
    image: dataUri,
    provider: "cloudflare",
    model: CLOUDFLARE_FLUX_MODEL,
    seed,
    width,
    height,
    latencyMs: durationMs,
  };
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
