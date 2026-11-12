import { NextRequest, NextResponse } from "next/server";
import { AccuracyResearchService } from "@/app/lib/image-engine/services/accuracy-research.service";

export async function GET() {
  try {
    const benchmark = AccuracyResearchService.getComparativeBenchmark();
    const hardware = AccuracyResearchService.evaluateVRAM("flux-schnell", "fp8_e4m3");

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      architecturesEvaluated: [
        { id: "diffusion_transformers", name: "Diffusion Transformers (DiT)", status: "Prototype Validated", license: "Apache 2.0 / Open Weights" },
        { id: "flow_matching", name: "Flow Matching (FLUX.1-schnell)", status: "Production Integrated", license: "Apache 2.0" },
        { id: "rectified_flow", name: "Rectified Flow (SD3.5 Medium)", status: "Research Validated", license: "Community License" },
        { id: "multimodal_vlm", name: "Multimodal Gemini Flash Vision", status: "Production Integrated", license: "Commercial API" },
        { id: "controlnet_depth", name: "ControlNet Depth & Canny Adapters", status: "Prototype Validated", license: "Open Source" },
      ],
      hardwareSafety: hardware,
      benchmarkSummary: benchmark,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to retrieve research metadata" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, prompt, modelId, precision } = body;

    if (action === "scene_graph") {
      if (!prompt) {
        return NextResponse.json({ success: false, error: "Prompt is required" }, { status: 400 });
      }
      const graph = AccuracyResearchService.generateSceneGraph(prompt);
      return NextResponse.json({ success: true, graph });
    }

    if (action === "multi_stage_pipeline") {
      if (!prompt) {
        return NextResponse.json({ success: false, error: "Prompt is required" }, { status: 400 });
      }
      const result = await AccuracyResearchService.executeMultiStagePipeline(prompt);
      return NextResponse.json({ success: true, result });
    }

    if (action === "vram_eval") {
      const vram = AccuracyResearchService.evaluateVRAM(modelId || "flux-schnell", precision || "fp8_e4m3");
      return NextResponse.json({ success: true, vram });
    }

    return NextResponse.json({ success: false, error: "Unknown research action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to execute research operation" },
      { status: 500 }
    );
  }
}

