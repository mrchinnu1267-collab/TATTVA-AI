import { NextRequest, NextResponse } from "next/server";
import { FinalAccuracyOptimizationService } from "@/app/lib/image-engine/services/final-accuracy-optimization.service";

export async function GET() {
  try {
    const service = FinalAccuracyOptimizationService.getInstance();
    const diagnostics = service.getErrorDiagnostics();
    const profiles = service.getModelProfiles();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      diagnostics,
      profiles,
      rtx3050SafeVramCeilingGb: 3.6,
      status: "operational",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to retrieve accuracy optimization metadata" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, prompt, negativePrompt, provider, referenceInstructions, preferLocal } = body;
    const service = FinalAccuracyOptimizationService.getInstance();

    if (action === "verify_prompt") {
      if (!prompt) {
        return NextResponse.json({ success: false, error: "Prompt is required for verification" }, { status: 400 });
      }
      const verification = service.verifyAndCompilePrompt(prompt, provider || "pollinations", negativePrompt);
      return NextResponse.json({ success: true, verification });
    }

    if (action === "audit_reference") {
      if (!referenceInstructions || referenceInstructions.length === 0) {
        return NextResponse.json({ success: false, error: "Reference instructions are required" }, { status: 400 });
      }
      const audit = service.auditReferencePreservation("ref_req", referenceInstructions);
      return NextResponse.json({ success: true, audit });
    }

    if (action === "execute" || !action) {
      if (!prompt) {
        return NextResponse.json({ success: false, error: "Prompt is required" }, { status: 400 });
      }
      const result = await service.executeOptimizedGeneration({
        prompt,
        negativePrompt,
        targetProvider: provider,
        referenceInstructions,
        preferLocalRTX3050: preferLocal !== false,
      });
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to execute optimization operation" },
      { status: 500 }
    );
  }
}
