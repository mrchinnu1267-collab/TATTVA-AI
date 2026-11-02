import { NextResponse } from "next/server";
import { TattvaModelArchitectLLM } from "../../../lib/model-architect-llm";

export const runtime = "nodejs";

export async function GET() {
  const models = TattvaModelArchitectLLM.getAllModels();
  return NextResponse.json({
    success: true,
    version: TattvaModelArchitectLLM.VERSION,
    author: TattvaModelArchitectLLM.ARCHITECT_CREATOR,
    models,
    total_models: models.length,
    support_byok: true,
    supported_keys: [
      { name: "Hugging Face Access Token", key: "hf_token", env: "HF_TOKEN" },
      { name: "Stability AI API Key", key: "stability_key", env: "STABILITY_API_KEY" },
      { name: "Replicate API Token", key: "replicate_key", env: "REPLICATE_API_KEY" },
      { name: "OpenAI API Key", key: "openai_key", env: "OPENAI_API_KEY" },
    ],
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.prompt !== "string" || body.prompt.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Please enter a model specification or description prompt." },
        { status: 400 }
      );
    }

    const blueprint = TattvaModelArchitectLLM.architectModel({
      prompt: body.prompt.trim(),
      category: body.category,
      preferredArchitecture: body.preferredArchitecture,
      targetResolution: body.targetResolution,
      targetDevice: body.targetDevice,
    });

    return NextResponse.json({
      success: true,
      message: `Model "${blueprint.name}" successfully architected by TATTVA Neural Model Studio.`,
      blueprint,
    });
  } catch (error: unknown) {
    console.error("POST /api/models/architect error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to architect model." },
      { status: 500 }
    );
  }
}

