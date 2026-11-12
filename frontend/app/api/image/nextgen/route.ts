import { NextRequest, NextResponse } from "next/server";
import { NextGenArchitectureService } from "@/app/lib/image-engine/services/nextgen-architecture.service";
import { ModelIntelligenceMatrix } from "@/app/lib/image-engine/nextgen-architecture/model-intelligence-matrix";

export async function GET() {
  try {
    const service = NextGenArchitectureService.getInstance();
    const models = ModelIntelligenceMatrix.getInstance().getAllModels();
    const policy = service.getAdaptivePolicy();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      models,
      adaptivePolicy: policy,
      vramCeilingGb: 3.6,
      status: "operational",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to retrieve next-gen architecture status" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, prompt, referenceImages, preferLocal, hierarchical, maxCorrectionAttempts } = body;
    const service = NextGenArchitectureService.getInstance();

    if (action === "plan_scene") {
      if (!prompt) {
        return NextResponse.json({ success: false, error: "Prompt is required for scene planning" }, { status: 400 });
      }
      const plan = service.planScene(prompt, referenceImages);
      return NextResponse.json({ success: true, plan });
    }

    if (action === "select_model") {
      if (!prompt) {
        return NextResponse.json({ success: false, error: "Prompt is required" }, { status: 400 });
      }
      const plan = service.planScene(prompt, referenceImages);
      const decision = service.selectModel(plan, referenceImages, preferLocal);
      return NextResponse.json({ success: true, plan, decision });
    }

    if (action === "execute_pipeline" || !action) {
      if (!prompt) {
        return NextResponse.json({ success: false, error: "Prompt is required for pipeline execution" }, { status: 400 });
      }
      const result = await service.executePipeline({
        prompt,
        referenceImages,
        hierarchicalGeneration: hierarchical !== false,
        maxCorrectionAttempts: maxCorrectionAttempts || 2,
        vramCeilingGb: 3.6,
      });
      return NextResponse.json({ success: true, result });
    }

    if (action === "apply_policy") {
      const { weights } = body;
      const res = service.applyExperimentalPolicy(weights || {});
      return NextResponse.json(res);
    }

    if (action === "rollback_policy") {
      const res = service.rollbackPolicy();
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to execute next-gen pipeline operation" },
      { status: 500 }
    );
  }
}

