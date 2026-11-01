export const LOCAL_ENGINE_URL = "http://127.0.0.1:8000";
const REQUEST_TIMEOUT = 180000;

export async function checkLocalEngine(): Promise<{
  online: boolean;
  models?: unknown[];
  current_model?: string | null;
  gpu?: unknown;
  health?: unknown;
}> {
  try {
    const healthRes = await fetch(`${LOCAL_ENGINE_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });

    if (!healthRes.ok) return { online: false };

    const [modelsRes, gpuRes] = await Promise.all([
      fetch(`${LOCAL_ENGINE_URL}/models`, { cache: "no-store", signal: AbortSignal.timeout(1500) }).catch(() => null),
      fetch(`${LOCAL_ENGINE_URL}/gpu`, { cache: "no-store", signal: AbortSignal.timeout(1500) }).catch(() => null),
    ]);

    const health = await healthRes.json().catch(() => null);
    const models = modelsRes?.ok ? await modelsRes.json().catch(() => null) : null;
    const gpu = gpuRes?.ok ? await gpuRes.json().catch(() => null) : null;

    return {
      online: true,
      models: models?.models ?? [],
      current_model: models?.current_model ?? null,
      gpu: gpu?.gpu ?? gpu?.manager ?? null,
      health,
    };
  } catch {
    return { online: false };
  }
}

export async function generateWithCloud(params: {
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
}) {
  const w = params.width || 512;
  const h = params.height || 512;
  const seed = params.seed ?? Math.floor(Math.random() * 2147483647);
  const fullPrompt = params.prompt.trim();
  const apiKey = process.env.POLLINATIONS_API_KEY?.trim() || "";

  // Pollinations supported endpoints & model candidates
  const candidateEndpoints = [
    {
      url: `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux${apiKey ? `&key=${apiKey}` : ""}`,
      name: "Pollinations FLUX Primary",
    },
    {
      url: `https://gen.pollinations.ai/image/${encodeURIComponent(fullPrompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux${apiKey ? `&key=${apiKey}` : ""}`,
      name: "Pollinations FLUX Gen-Mirror",
    },
    {
      url: `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${w}&height=${h}&seed=${Math.floor(Math.random() * 2147483647)}&nologo=true${apiKey ? `&key=${apiKey}` : ""}`,
      name: "Pollinations Standard",
    },
  ];

  let lastError: Error | null = null;
  const started = Date.now();

  for (let attempt = 0; attempt < candidateEndpoints.length; attempt++) {
    const candidate = candidateEndpoints[attempt];
    try {
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const res = await fetch(candidate.url, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(45000),
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("image/")) {
          const arrayBuffer = await res.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString("base64");
          const elapsed = Math.round((Date.now() - started) / 10) / 100;

          return {
            success: true,
            image: `data:${contentType.split(";")[0]};base64,${base64Data}`,
            prompt: params.prompt,
            original_prompt: params.prompt,
            enhanced_prompt: fullPrompt,
            prompt_enhanced: false,
            provider: "TATTVA AI Cloud Engine (FLUX)",
            model: "FLUX.1 Schnell Cloud",
            model_id: "cloud",
            width: w,
            height: h,
            steps: 25,
            guidance_scale: 7.0,
            seed,
            generation_time_seconds: elapsed,
          };
        }
      }

      // If rate limited (HTTP 402 or 429), parse response to see if retry is possible
      if (res.status === 402 || res.status === 429 || res.status === 503) {
        const errorText = await res.text().catch(() => "");
        let retrySeconds = 0;
        try {
          const parsed = JSON.parse(errorText);
          const msg = parsed?.error?.message || "";
          const match = msg.match(/retry after (\d+)s/i);
          if (match) retrySeconds = parseInt(match[1], 10);
        } catch {
          // not JSON
        }

        // If retry wait is short (<= 3s) and this is first attempt, wait and retry candidate
        if (retrySeconds > 0 && retrySeconds <= 3 && attempt === 0) {
          await new Promise((r) => setTimeout(r, (retrySeconds + 0.5) * 1000));
          continue;
        }

        lastError = new Error(
          `Cloud generation limit reached (${res.status}). For instant unlimited generations, launch the local RTX CUDA engine (image-engine/start_engine.bat).`
        );
      } else {
        lastError = new Error(`Cloud image generator returned HTTP ${res.status}`);
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw (
    lastError ||
    new Error(
      "Cloud image generation temporarily unavailable. Start your local RTX engine (image-engine/start_engine.bat) for zero-wait generation."
    )
  );
}

export async function executeImageGeneration(params: {
  prompt: string;
  image?: string; // base64 for edit
  strength?: number;
  model?: string;
  steps?: number;
  guidance_scale?: number;
  width?: number;
  height?: number;
  seed?: number;
  negative_prompt?: string;
  style?: string;
}) {
  const isEdit = typeof params.image === "string" && params.image.length > 50;
  const localStatus = await checkLocalEngine();

  if (localStatus.online) {
    try {
      const endpoint = isEdit ? `${LOCAL_ENGINE_URL}/edit` : `${LOCAL_ENGINE_URL}/generate`;
      const payload: Record<string, unknown> = {
        prompt: params.prompt,
        model: params.model === "turbo" ? "turbo" : "realistic",
        style: params.style || "",
        enhance_prompt: false,
        steps: params.model === "turbo" ? Math.min(params.steps || 4, 4) : params.steps || 25,
        guidance_scale: params.model === "turbo" ? 0 : params.guidance_scale || 7.0,
        width: params.width || 512,
        height: params.height || 512,
      };

      if (isEdit) {
        payload.image = params.image;
        payload.strength = params.strength ?? 0.65;
      }

      if (params.negative_prompt) {
        payload.negative_prompt = params.negative_prompt;
      }
      if (params.seed !== undefined) {
        payload.seed = params.seed;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.success && typeof data.image === "string") {
          return data;
        }
      }
    } catch (localError) {
      console.warn("Local engine attempt failed, falling back to cloud:", localError);
    }
  }

  // Cloud fallback directly with the complex prompt
  return generateWithCloud({
    prompt: params.prompt,
    width: params.width,
    height: params.height,
    seed: params.seed,
  });
}
