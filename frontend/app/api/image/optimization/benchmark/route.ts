import { NextRequest, NextResponse } from "next/server";
import { FinalAccuracyOptimizationService } from "@/app/lib/image-engine/services/final-accuracy-optimization.service";

export async function GET() {
  try {
    const service = FinalAccuracyOptimizationService.getInstance();
    const benchmark = service.runFinalBenchmark();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      benchmark,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to retrieve final accuracy benchmark" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const service = FinalAccuracyOptimizationService.getInstance();
    const benchmark = service.runFinalBenchmark();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      benchmark,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to execute final accuracy benchmark" },
      { status: 500 }
    );
  }
}

