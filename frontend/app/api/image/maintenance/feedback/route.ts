/**
 * TATTVA AI - Phase W: User Feedback API Route
 * Collects optional subjective user ratings & problem reporting without re-uploading private images.
 */

import { NextRequest, NextResponse } from "next/server";
import { EngineMaintenanceService } from "@/app/lib/image-engine/services/engine-maintenance.service";

export async function GET() {
  try {
    const aggregates = EngineMaintenanceService.getUserFeedbackAggregates();
    return NextResponse.json({ success: true, aggregates });
  } catch (error: any) {
    console.error("[Maintenance Feedback API] GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve feedback aggregates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      generationId,
      matchesPrompt,
      objectsAreCorrect,
      positioningIsCorrect,
      referenceSimilarityAcceptable,
      textIsReadable,
      imageQualityAcceptable,
      specificIssueDetails,
    } = body;

    const submission = EngineMaintenanceService.submitUserFeedback({
      generationId: generationId || `gen-${Date.now().toString(36)}`,
      matchesPrompt: matchesPrompt ?? true,
      objectsAreCorrect: objectsAreCorrect ?? true,
      positioningIsCorrect: positioningIsCorrect ?? true,
      referenceSimilarityAcceptable: referenceSimilarityAcceptable ?? true,
      textIsReadable: textIsReadable ?? true,
      imageQualityAcceptable: imageQualityAcceptable ?? true,
      specificIssueDetails: specificIssueDetails || undefined,
    });

    return NextResponse.json({ success: true, submission });
  } catch (error: any) {
    console.error("[Maintenance Feedback API] POST Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit user feedback" },
      { status: 500 }
    );
  }
}

