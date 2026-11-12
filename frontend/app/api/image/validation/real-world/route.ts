/**
 * TATTVA AI - Phase U: Real-World Validation API Route
 * GET: Retrieves complete statistical validation report, model rankings & subsystem checks.
 * POST: Runs targeted evaluations, surgical correction tests, or generalization probes.
 */

import { NextRequest, NextResponse } from "next/server";
import { RealWorldValidationService } from "@/app/lib/image-engine/services/real-world-validation.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "generalization") {
      const genResults = RealWorldValidationService.runGeneralizationSuite();
      return NextResponse.json({ success: true, ...genResults });
    }

    if (action === "production") {
      const prodResults = RealWorldValidationService.verifyProduction();
      return NextResponse.json({ success: true, ...prodResults });
    }

    // Default: Return full validation statistics & rankings
    const stats = RealWorldValidationService.getStatistics();
    const summary = RealWorldValidationService.getDatasetSummary();

    return NextResponse.json({
      success: true,
      stats,
      datasetSummary: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[RealWorldValidation API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve real-world validation data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, promptId, maskedModelId, sampleSeed } = body;

    if (action === "evaluate") {
      if (!promptId || !maskedModelId) {
        return NextResponse.json(
          { success: false, error: "promptId and maskedModelId are required" },
          { status: 400 }
        );
      }
      const result = RealWorldValidationService.evaluatePrompt(promptId, maskedModelId, sampleSeed);
      if (!result) {
        return NextResponse.json({ success: false, error: "Prompt not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, result });
    }

    if (action === "test_correction") {
      if (!promptId) {
        return NextResponse.json({ success: false, error: "promptId is required" }, { status: 400 });
      }
      const correctionResult = RealWorldValidationService.testCorrection(promptId, maskedModelId);
      if (!correctionResult) {
        return NextResponse.json({ success: false, error: "Prompt not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, correctionResult });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("[RealWorldValidation API POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process validation request" },
      { status: 500 }
    );
  }
}

