/**
 * TATTVA AI - Free Image Engine: AI Horde Distributed GPU Cluster Adapter
 * Connects to the free, crowdsourced AI Horde network (hundreds of community GPUs)
 * Supports Stable Diffusion XL and specialized checkpoint models with zero subscription or API key required.
 */

import { bufferToDataUri } from "../image-utils";
import type { ProviderRequest, ProviderResult } from "../types";

const HORDE_API_URL = "https://aihorde.net/api/v2";
const ANONYMOUS_KEY = "0000000000";

export function getAiHordeApiKey(): string {
  return (process.env.AI_HORDE_API_KEY || ANONYMOUS_KEY).trim();
}

export interface AiHordeGenerationOptions {
  model?: string;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  timeoutMs?: number;
}

export async function generateWithAiHorde(
  req: ProviderRequest,
  options: AiHordeGenerationOptions = {}
): Promise<ProviderResult> {
  const started = Date.now();
  const apiKey = getAiHordeApiKey();
  const width = Math.min(1024, Math.max(512, Math.round((req.width || 512) / 64) * 64));
  const height = Math.min(1024, Math.max(512, Math.round((req.height || 512) / 64) * 64));
  const steps = options.steps || 25;
  const cfgScale = options.cfgScale || 7.0;

  // 1. Submit Generation Request to AI Horde
  const submitRes = await fetch(`${HORDE_API_URL}/generate/async`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
      "Client-Agent": "TATTVA_AI:1.0:antigravity",
    },
    body: JSON.stringify({
      prompt: req.negativePrompt
        ? `${req.prompt} ### ${req.negativePrompt}`
        : req.prompt,
      params: {
        sampler_name: options.sampler || "k_euler_a",
        cfg_scale: cfgScale,
        height,
        width,
        steps,
        seed: req.seed !== undefined ? String(req.seed) : undefined,
        n: 1,
      },
      models: options.model
        ? [options.model]
        : ["ICBINP - I Can't Believe It's Not Photography", "stable_diffusion", "SDXL_1.0"],
      nsfw: false,
      censor_nsfw: true,
      slow_workers: false,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!submitRes.ok) {
    const errorBody = await submitRes.text().catch(() => "");
    throw new Error(`AI Horde job submission failed (HTTP ${submitRes.status}): ${errorBody}`);
  }

  const { id: jobId } = (await submitRes.json()) as { id: string };
  if (!jobId) {
    throw new Error("AI Horde did not return a valid task ID.");
  }

  // 2. Poll for Completion (up to timeoutMs, default 60s)
  const maxWaitMs = options.timeoutMs || 60_000;
  const pollIntervalMs = 2_500;
  const pollDeadline = Date.now() + maxWaitMs;

  while (Date.now() < pollDeadline) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    const checkRes = await fetch(`${HORDE_API_URL}/generate/check/${jobId}`, {
      headers: { "Client-Agent": "TATTVA_AI:1.0:antigravity" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!checkRes.ok) continue;
    const checkData = (await checkRes.json()) as {
      done?: boolean;
      faulted?: boolean;
      wait_time?: number;
      queue_position?: number;
    };

    if (checkData.faulted) {
      throw new Error("AI Horde generation worker faulted during processing.");
    }

    if (checkData.done) {
      // 3. Fetch Finished Image Result
      const statusRes = await fetch(`${HORDE_API_URL}/generate/status/${jobId}`, {
        headers: { "Client-Agent": "TATTVA_AI:1.0:antigravity" },
        signal: AbortSignal.timeout(10_000),
      });

      if (!statusRes.ok) {
        throw new Error(`Failed to retrieve finished image from AI Horde (HTTP ${statusRes.status})`);
      }

      const statusData = (await statusRes.json()) as {
        generations?: Array<{ img?: string; seed?: string; model?: string }>;
      };

      const generation = statusData.generations?.[0];
      if (!generation?.img) {
        throw new Error("AI Horde generation returned no image data.");
      }

      // If img is a URL or base64
      let dataUri: string;
      if (generation.img.startsWith("http")) {
        const imgFetch = await fetch(generation.img, { signal: AbortSignal.timeout(15_000) });
        const buf = Buffer.from(await imgFetch.arrayBuffer());
        const mime = imgFetch.headers.get("content-type") || "image/webp";
        dataUri = bufferToDataUri(buf, mime);
      } else if (generation.img.startsWith("data:")) {
        dataUri = generation.img;
      } else {
        dataUri = `data:image/webp;base64,${generation.img}`;
      }

      return {
        image: dataUri,
        provider: "ai-horde",
        model: generation.model || "ai-horde-distributed",
        seed: Number(generation.seed) || req.seed,
        width,
        height,
        latencyMs: Date.now() - started,
      };
    }
  }

  throw new Error(`AI Horde generation timed out after ${Math.round(maxWaitMs / 1000)}s.`);
}

