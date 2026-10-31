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

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`;

  const started = Date.now();
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    throw new Error(`Cloud image generation failed with HTTP ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const elapsed = Math.round((Date.now() - started) / 10) / 100;

  return {
    success: true,
    image: `data:${contentType};base64,${base64Data}`,
    prompt: params.prompt,
    original_prompt: params.prompt,
    enhanced_prompt: fullPrompt,
    prompt_enhanced: false,
    provider: "TATTVA AI Cloud Engine (FLUX/SDXL)",
    model: "FLUX / SDXL Cloud",
    model_id: "cloud",
    width: w,
    height: h,
    steps: 25,
    guidance_scale: 7.0,
    seed,
    generation_time_seconds: elapsed,
  };
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
}) {
  const isEdit = typeof params.image === "string" && params.image.length > 50;
  const localStatus = await checkLocalEngine();

  if (localStatus.online) {
    try {
      const endpoint = isEdit ? `${LOCAL_ENGINE_URL}/edit` : `${LOCAL_ENGINE_URL}/generate`;
      const payload: Record<string, unknown> = {
        prompt: params.prompt,
        model: params.model === "turbo" ? "turbo" : "realistic",
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
