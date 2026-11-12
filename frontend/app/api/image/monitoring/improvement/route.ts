import { NextRequest, NextResponse } from "next/server";
import { ProductionMonitoringService } from "@/app/lib/image-engine/services/production-monitoring.service";

export async function GET() {
  try {
    const recommendations = ProductionMonitoringService.getImprovementRecommendations();
    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to retrieve improvement recommendations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recommendationId, action, reviewerName } = body;

    if (!recommendationId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing recommendationId or action" },
        { status: 400 }
      );
    }

    if (action === "approve" || action === "reject") {
      const rec = ProductionMonitoringService.reviewImprovement(
        recommendationId,
        action,
        reviewerName || "admin"
      );
      return NextResponse.json({ success: true, recommendation: rec });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to review improvement" },
      { status: 500 }
    );
  }
}

