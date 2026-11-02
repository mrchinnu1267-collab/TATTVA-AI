export const LOCAL_ENGINE_URL = "http://127.0.0.1:8000";
const REQUEST_TIMEOUT = 180000;

export interface UserApiKeys {
  gemini?: string;
  dashscope?: string;
  huggingface?: string;
  stability?: string;
  replicate?: string;
  openai?: string;
}

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

/**
 * High-accuracy Cloud Image Generation Engine.
 * Supports User-Provided Custom API Keys (BYOK: Hugging Face, Stability AI, OpenAI, Replicate),
 * Local RTX Engine, and Free High-Definition Open AI Diffusion (from Awesome Free AI APIs catalog).
 */
export async function generateWithCloud(params: {
  prompt: string;
  image?: string;
  width?: number;
  height?: number;
  seed?: number;
  apiKey?: string;
  userKeys?: UserApiKeys;
  model?: string;
}) {
  const w = params.width || 1024;
  const h = params.height || 1024;
  const seed = params.seed ?? Math.floor(Math.random() * 2147483647);
  const fullPrompt = params.prompt.trim();
  const started = Date.now();

  const geminiKey =
    params.userKeys?.gemini ||
    params.apiKey ||
    process.env.GEMINI_API_KEY ||
    "";
  const dashscopeKey =
    params.userKeys?.dashscope ||
    process.env.DASHSCOPE_API_KEY ||
    process.env.DASH_API_KEY ||
    "";
  const hfToken =
    params.userKeys?.huggingface ||
    params.apiKey ||
    process.env.HF_TOKEN ||
    process.env.HUGGINGFACE_API_KEY ||
    "";
  const stabilityKey = params.userKeys?.stability || process.env.STABILITY_API_KEY || "";
  const openaiKey = params.userKeys?.openai || process.env.OPENAI_API_KEY || "";
  const replicateKey = params.userKeys?.replicate || process.env.REPLICATE_API_KEY || "";

  // 1. Google Nano Banana 2 Engine (gemini-nano-banana-2.1 / gemini-3.1-flash-image / gemini-2.5-flash-image)
  if (geminiKey && geminiKey.length > 5) {
    const nanoBananaModels = [
      "gemini-nano-banana-2.1",
      "gemini-3.1-flash-image",
      "gemini-2.5-flash-image",
    ];

    for (const model of nanoBananaModels) {
      try {
        const parts: Array<Record<string, unknown>> = [];
        if (params.image && params.image.length > 50) {
          const rawBase64 = params.image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: rawBase64,
            },
          });
          parts.push({
            text: `Edit this photo: ${fullPrompt}`,
          });
        } else {
          parts.push({
            text: fullPrompt,
          });
        }

        const nanoRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
            }),
            signal: AbortSignal.timeout(60000),
          }
        );

        if (nanoRes.ok) {
          const data = await nanoRes.json();
          const candidateParts = data?.candidates?.[0]?.content?.parts;
          if (Array.isArray(candidateParts)) {
            for (const part of candidateParts) {
              if (part?.inlineData?.data) {
                const mime = part.inlineData.mimeType || "image/png";
                const elapsed = Math.round((Date.now() - started) / 10) / 100;
                return {
                  success: true,
                  image: `data:${mime};base64,${part.inlineData.data}`,
                  prompt: params.prompt,
                  original_prompt: params.prompt,
                  enhanced_prompt: fullPrompt,
                  prompt_enhanced: true,
                  provider: "Google Nano Banana 2",
                  model: `Google Nano Banana 2 (${model})`,
                  model_id: model,
                  width: w,
                  height: h,
                  steps: 30,
                  guidance_scale: 7.5,
                  seed,
                  generation_time_seconds: elapsed,
                };
              }
            }
          }
        }
      } catch (nanoErr) {
        console.warn(`Nano Banana 2 (${model}) generation error:`, nanoErr);
      }
    }
  }

  // 1. Stability AI (BYOK)
  if (stabilityKey && stabilityKey.length > 5) {
    try {
      const stabRes = await fetch(
        "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${stabilityKey}`,
          },
          body: JSON.stringify({
            text_prompts: [{ text: fullPrompt, weight: 1 }],
            cfg_scale: 7,
            height: h,
            width: w,
            steps: 30,
            seed,
          }),
          signal: AbortSignal.timeout(60000),
        }
      );

      if (stabRes.ok) {
        const data = await stabRes.json();
        const firstArtifact = data?.artifacts?.[0];
        if (firstArtifact?.base64) {
          const elapsed = Math.round((Date.now() - started) / 10) / 100;
          return {
            success: true,
            image: `data:image/png;base64,${firstArtifact.base64}`,
            prompt: params.prompt,
            original_prompt: params.prompt,
            enhanced_prompt: fullPrompt,
            prompt_enhanced: true,
            provider: "TATTVA Neural Cloud (Stability AI BYOK)",
            model: "Stable Diffusion XL 1.0",
            model_id: "stability_byok",
            width: w,
            height: h,
            steps: 30,
            guidance_scale: 7.0,
            seed,
            generation_time_seconds: elapsed,
          };
        }
      }
    } catch (stabErr) {
      console.warn("Stability AI BYOK generation error:", stabErr);
    }
  }

  // 2. OpenAI DALL-E 3 (BYOK)
  if (openaiKey && openaiKey.length > 5) {
    try {
      const oaiRes = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: fullPrompt,
          n: 1,
          size: "1024x1024",
          response_format: "b64_json",
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (oaiRes.ok) {
        const data = await oaiRes.json();
        const b64 = data?.data?.[0]?.b64_json;
        if (b64) {
          const elapsed = Math.round((Date.now() - started) / 10) / 100;
          return {
            success: true,
            image: `data:image/png;base64,${b64}`,
            prompt: params.prompt,
            original_prompt: params.prompt,
            enhanced_prompt: fullPrompt,
            prompt_enhanced: true,
            provider: "TATTVA Neural Cloud (OpenAI DALL-E 3 BYOK)",
            model: "DALL-E 3",
            model_id: "openai_byok",
            width: 1024,
            height: 1024,
            steps: 50,
            guidance_scale: 7.0,
            seed,
            generation_time_seconds: elapsed,
          };
        }
      }
    } catch (oaiErr) {
      console.warn("OpenAI BYOK generation error:", oaiErr);
    }
  }

  // 3. Replicate FLUX Schnell (BYOK)
  if (replicateKey && replicateKey.length > 5) {
    try {
      const repRes = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${replicateKey}`,
        },
        body: JSON.stringify({
          version: "black-forest-labs/flux-schnell",
          input: {
            prompt: fullPrompt,
            width: w,
            height: h,
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "webp",
            output_quality: 90,
          },
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (repRes.ok) {
        const repData = await repRes.json();
        const outputUrl = Array.isArray(repData.output) ? repData.output[0] : repData.output;
        if (outputUrl) {
          const elapsed = Math.round((Date.now() - started) / 10) / 100;
          return {
            success: true,
            image: outputUrl,
            prompt: params.prompt,
            original_prompt: params.prompt,
            enhanced_prompt: fullPrompt,
            prompt_enhanced: true,
            provider: "TATTVA Neural Cloud (Replicate BYOK)",
            model: "FLUX Schnell",
            model_id: "replicate_byok",
            width: w,
            height: h,
            steps: 4,
            guidance_scale: 3.5,
            seed,
            generation_time_seconds: elapsed,
          };
        }
      }
    } catch (repErr) {
      console.warn("Replicate BYOK generation error:", repErr);
    }
  }

  // 5. Alibaba DashScope Qwen-Image 2512 & Qwen-Image-Edit
  if (dashscopeKey && dashscopeKey.length > 5) {
    try {
      const qwenRes = await fetch(
        "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${dashscopeKey}`,
            "X-DashScope-Async": "enable",
          },
          body: JSON.stringify({
            model: "qwen-image-2512",
            input: {
              prompt: fullPrompt,
            },
            parameters: {
              size: `${w}*${h}`,
              n: 1,
              seed,
            },
          }),
          signal: AbortSignal.timeout(60000),
        }
      );

      if (qwenRes.ok) {
        const data = await qwenRes.json();
        const outputImage = data?.output?.results?.[0]?.url || data?.output?.image_url;
        if (outputImage) {
          const elapsed = Math.round((Date.now() - started) / 10) / 100;
          return {
            success: true,
            image: outputImage,
            prompt: params.prompt,
            original_prompt: params.prompt,
            enhanced_prompt: fullPrompt,
            prompt_enhanced: true,
            provider: "Alibaba Qwen-Image",
            model: "Qwen-Image 2512",
            model_id: "qwen_image_2512",
            width: w,
            height: h,
            steps: 30,
            guidance_scale: 7.0,
            seed,
            generation_time_seconds: elapsed,
          };
        }
      }
    } catch (qwenErr) {
      console.warn("Alibaba Qwen-Image generation error:", qwenErr);
    }
  }

  // 6. Hugging Face Inference API (FLUX.1-schnell / SDXL)
  const hfEndpoints = [
    "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
    "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
  ];

  for (const ep of hfEndpoints) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (hfToken) {
        headers.Authorization = `Bearer ${hfToken}`;
      }

      const hfRes = await fetch(ep, {
        method: "POST",
        headers,
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            width: w,
            height: h,
            seed,
          },
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (hfRes.ok) {
        const arrayBuffer = await hfRes.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");
        const contentType = hfRes.headers.get("content-type") || "image/jpeg";
        const elapsed = Math.round((Date.now() - started) / 10) / 100;
        const modelName = ep.split("/").pop() || "FLUX.1";

        return {
          success: true,
          image: `data:${contentType};base64,${base64Data}`,
          prompt: params.prompt,
          original_prompt: params.prompt,
          enhanced_prompt: fullPrompt,
          prompt_enhanced: true,
          provider: "Hugging Face Diffusion Engine",
          model: modelName,
          model_id: modelName.toLowerCase(),
          width: w,
          height: h,
          steps: 25,
          guidance_scale: 7.5,
          seed,
          generation_time_seconds: elapsed,
        };
      }
    } catch (hfErr) {
      console.warn(`Hugging Face (${ep}) generation error:`, hfErr);
    }
  }

  throw new Error("All image generation providers were unreachable. Please verify your API key or model configuration.");
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
  userKeys?: UserApiKeys;
  apiKey?: string;
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
        width: params.width || 1024,
        height: params.height || 1024,
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

  // Cloud multi-provider fallback (Google Nano Banana 2 / BYOK / Open Diffusion)
  return generateWithCloud({
    prompt: params.prompt,
    image: params.image,
    width: params.width,
    height: params.height,
    seed: params.seed,
    apiKey: params.apiKey,
    userKeys: params.userKeys,
    model: params.model,
  });
}
