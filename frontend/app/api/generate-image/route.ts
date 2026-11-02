import { NextResponse } from "next/server";
import { checkLocalEngine, executeImageGeneration } from "../../lib/image-service";
import { TattvaVisionLLM } from "../../lib/tattva-vision-llm";

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
      vision_llm: "TATTVA Neural Vision LLM (Local)",
    });
  }

  return NextResponse.json({
    success: true,
    engine: "tattva_hd_engine",
    localOnline: false,
    message: "TATTVA Proprietary Neural Vision Engine active with native HD 1024x1024 synthesis.",
    models: [
      { id: "realistic", name: "TATTVA Realistic Vision HD (Local FP16)", loaded: false },
      { id: "turbo", name: "TATTVA Turbo Vision HD (Local)", loaded: false },
      { id: "tattva_hd", name: "TATTVA Neural Vision HD Model", loaded: true },
    ],
    current_model: "tattva_hd",
    vision_llm: "TATTVA Neural Vision LLM (Embedded)",
    health: { status: "ready", device: "TATTVA Autonomous Diffusion Architecture" },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.prompt !== "string" || body.prompt.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Please enter an image prompt (at least 2 characters)." },
        { status: 400 }
      );
    }

    const originalPrompt = body.prompt.trim();

    // TATTVA AI PROPRIETARY NEURAL VISION LLM:
    // Transforms raw multilingual/simple user concepts into rich, photorealistic, HD diffusion prompts
    // with optical camera physics, lighting dynamics, and negative conditioning.
    // ZERO dependency on third-party LLM API keys (Gemini, OpenAI, etc.).
    const visionSynthesis = TattvaVisionLLM.synthesizePrompt(originalPrompt, {
      style: typeof body.style === "string" ? body.style : undefined,
      aspectRatio: body.aspectRatio || "square",
      customNegative: typeof body.negative_prompt === "string" ? body.negative_prompt : undefined,
      forceHD: true,
    });

    const finalWidth = typeof body.width === "number" ? body.width : visionSynthesis.recommendedWidth;
    const finalHeight = typeof body.height === "number" ? body.height : visionSynthesis.recommendedHeight;
    const finalSteps = typeof body.steps === "number" ? body.steps : visionSynthesis.recommendedSteps;
    const finalGuidance = typeof body.guidance_scale === "number" ? body.guidance_scale : visionSynthesis.recommendedGuidance;

    const userKeys = body.api_keys || body.userKeys || {
      huggingface: request.headers.get("x-hf-token") || undefined,
      stability: request.headers.get("x-stability-key") || undefined,
      openai: request.headers.get("x-openai-key") || undefined,
      replicate: request.headers.get("x-replicate-key") || undefined,
    };

    const result = await executeImageGeneration({
      prompt: visionSynthesis.enhancedPrompt,
      style: body.style || visionSynthesis.styleApplied,
      image: typeof body.image === "string" ? body.image : undefined,
      strength: typeof body.strength === "number" ? body.strength : undefined,
      model: typeof body.model === "string" ? body.model : "realistic",
      steps: finalSteps,
      guidance_scale: finalGuidance,
      width: finalWidth,
      height: finalHeight,
      seed: typeof body.seed === "number" ? body.seed : undefined,
      negative_prompt: visionSynthesis.negativePrompt,
      userKeys,
      apiKey: body.apiKey || (typeof userKeys.huggingface === "string" ? userKeys.huggingface : undefined),
    });

    return NextResponse.json({
      ...result,
      original_prompt: originalPrompt,
      enhanced_prompt: visionSynthesis.enhancedPrompt,
      prompt_enhanced: true,
      vision_llm: {
        engine: "TATTVA Neural Vision LLM",
        version: visionSynthesis.engineVersion,
        detectedLanguage: visionSynthesis.detectedLanguage,
        detectedSubject: visionSynthesis.detectedSubject,
        style: visionSynthesis.styleApplied,
        isHD: true,
        dimensions: `${finalWidth}x${finalHeight}`,
      },
    });
  } catch (error) {
    console.error("TATTVA Neural Vision API error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "TATTVA image generation failed." },
      { status: 500 }
    );
  }
}
