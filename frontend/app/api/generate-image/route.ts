import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { checkLocalEngine, executeImageGeneration } from "../../lib/image-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = await checkLocalEngine();

  if (status.online) {
    return NextResponse.json({
      success: true,
      engine: "local",
      localOnline: true,
      models: status.models,
      current_model: status.current_model,
      gpu: status.gpu,
      health: status.health,
    });
  }

  return NextResponse.json({
    success: true,
    engine: "cloud_fallback",
    localOnline: false,
    message: "Local engine offline (server.py not running). Cloud AI generation is active.",
    models: [
      { id: "realistic", name: "Realistic Vision V5.1 (Local FP16)", loaded: false },
      { id: "turbo", name: "SDXL Turbo (Local)", loaded: false },
      { id: "cloud", name: "TATTVA Cloud FLUX / SDXL", loaded: true },
    ],
    current_model: "cloud",
    health: { status: "cloud_fallback", device: "Cloud GPU" },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.prompt !== "string" || body.prompt.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Please enter an image prompt (at least 3 characters)." },
        { status: 400 }
      );
    }

    let finalPrompt = body.prompt.trim();
    const originalPrompt = finalPrompt;
    let wasEnhanced = false;

    // Detect non-ASCII (multilingual) or explicit enhance_prompt request
    const isNonAscii = /[^\x00-\x7F]/.test(finalPrompt);
    const shouldEnhance = Boolean(body.enhance_prompt || isNonAscii);

    if (shouldEnhance && process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.6-flash"];
        for (const modelName of candidateModels) {
          try {
            const promptResult = await ai.models.generateContent({
              model: modelName,
              contents: `Transform this user input into a rich, highly descriptive English diffusion prompt for AI image generation.
Preserve the user's intended subject, mood, composition, lighting, and details accurately.
Understand any language (Hindi, Spanish, French, Japanese, etc.) and translate to English for diffusion models.
Do NOT use rigid style presets (no clichés like 'unreal engine 5 trending on artstation'). Focus on tangible visual elements: lighting (e.g. volumetric, rim, soft diffused), textures, atmosphere, perspective, and fine material details.
Output ONLY the resulting prompt text, nothing else.

User Prompt: "${originalPrompt}"`,
              config: {
                temperature: 0.3,
                maxOutputTokens: 300,
              },
            });

            const synthesized = promptResult.text?.trim();
            if (synthesized && synthesized.length > 5) {
              finalPrompt = synthesized.replace(/^["']|["']$/g, "");
              wasEnhanced = true;
              break;
            }
          } catch {
            // Try next model if candidate fails
          }
        }
      } catch (err) {
        console.warn("Prompt enhancement skipped due to error:", err);
      }
    }

    const styleId = typeof body.style === "string" ? body.style.toLowerCase() : "";
    const STYLE_MODIFIERS: Record<string, string> = {
      anime: "Makoto Shinkai style, vibrant anime aesthetics, expressive details, studio key visual",
      cinematic: "35mm anamorphic film still, cinematic lighting, volumetric shadows, cinematic depth of field",
      realistic: "photorealistic, 8K ultra-detailed, authentic skin pores, natural lighting, sharp focus",
      "3d": "3D Octane render, ray-traced lighting, subsurface scattering, CGI masterpiece",
      concept: "digital concept art, atmospheric matte painting, epic scenery, expressive brushwork",
      portrait: "professional studio portrait, softbox rim lighting, Hasselblad medium format clarity",
      architecture: "architectural photography, clean geometric lines, travertine stone, minimalist composition",
      fantasy: "dark fantasy aesthetic, ethereal glow, mystical runes, magical mist, intricate ornaments",
      vintage: "vintage 35mm photograph, Kodak Portra 400 grain, warm nostalgic tones, retro film look",
    };

    if (styleId && STYLE_MODIFIERS[styleId] && !finalPrompt.toLowerCase().includes(styleId)) {
      finalPrompt = `${finalPrompt}, ${STYLE_MODIFIERS[styleId]}`;
    }

    const result = await executeImageGeneration({
      prompt: finalPrompt,
      style: styleId,
      image: typeof body.image === "string" ? body.image : undefined,
      strength: typeof body.strength === "number" ? body.strength : undefined,
      model: typeof body.model === "string" ? body.model : "realistic",
      steps: typeof body.steps === "number" ? body.steps : undefined,
      guidance_scale: typeof body.guidance_scale === "number" ? body.guidance_scale : undefined,
      width: typeof body.width === "number" ? body.width : 512,
      height: typeof body.height === "number" ? body.height : 512,
      seed: typeof body.seed === "number" ? body.seed : undefined,
      negative_prompt: typeof body.negative_prompt === "string" ? body.negative_prompt : undefined,
    });

    return NextResponse.json({
      ...result,
      original_prompt: originalPrompt,
      enhanced_prompt: wasEnhanced ? finalPrompt : undefined,
      prompt_enhanced: wasEnhanced,
    });
  } catch (error) {
    console.error("TATTVA API error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Image generation failed." },
      { status: 500 }
    );
  }
}
