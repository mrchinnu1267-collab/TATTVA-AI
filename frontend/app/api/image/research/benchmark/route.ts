import { NextResponse } from "next/server";
import { AccuracyResearchService } from "@/app/lib/image-engine/services/accuracy-research.service";

export async function GET() {
  try {
    const report = AccuracyResearchService.getComparativeBenchmark();
    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to retrieve comparative benchmark" },
      { status: 500 }
    );
  }
}

