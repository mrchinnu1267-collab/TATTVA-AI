/**
 * TATTVA AI - Phase M: Validation & Verification Telemetry API Endpoint
 * GET: Retrieves aggregated 9-dimension scores, category pass rates, failure distributions,
 *      baseline comparisons, and recent test run history.
 * POST: Triggers a live or simulated validation audit over benchmark prompts.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getValidationDashboardMetrics,
  getRecentValidationRuns,
  runValidationAudit,
  ValidationCategory,
} from "@/app/lib/image-engine/validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    const metrics = getValidationDashboardMetrics();
    const recentRuns = getRecentValidationRuns(15);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
      recentRuns,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to load validation metrics.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { promptId, category, sampleLimit = 3, useLiveGeneration = false } = body;

    const testRuns = await runValidationAudit({
      promptId: typeof promptId === "number" ? promptId : undefined,
      categoryFilter: category as ValidationCategory | undefined,
      sampleLimit: Math.min(10, Math.max(1, Number(sampleLimit) || 3)),
      useLiveGeneration: Boolean(useLiveGeneration),
    });

    const updatedMetrics = getValidationDashboardMetrics();

    return NextResponse.json({
      success: true,
      testRunsCount: testRuns.length,
      testRuns,
      updatedMetrics,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to execute validation audit.",
      },
      { status: 500 }
    );
  }
}

