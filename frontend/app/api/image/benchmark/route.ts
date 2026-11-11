/**
 * TATTVA AI - Model Accuracy Benchmarking & Intelligence API (Phase J)
 * Endpoint for running benchmarks, inspecting empirical rankings,
 * reviewing historical runs, and analyzing failed requirements.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  rankModelsByParetoEfficiency,
  MODEL_BENCHMARK_PROFILES,
} from "@/app/lib/image-engine/model-benchmarking/model-intelligence";
import {
  runBenchmarkAudit,
  getHistoricalBenchmarkRuns,
  getFailedBenchmarkCases,
} from "@/app/lib/image-engine/model-benchmarking/continuous-benchmarking";
import { BenchmarkCategory } from "@/app/lib/image-engine/model-benchmarking/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") as BenchmarkCategory | null;
    const view = searchParams.get("view"); // "rankings" | "history" | "failed_cases" | "profiles"

    if (view === "history") {
      const history = getHistoricalBenchmarkRuns();
      return NextResponse.json({
        success: true,
        history,
        totalRuns: history.length,
      });
    }

    if (view === "failed_cases") {
      const failedCases = getFailedBenchmarkCases();
      return NextResponse.json({
        success: true,
        failedCases,
        totalFailed: failedCases.length,
      });
    }

    if (view === "profiles") {
      return NextResponse.json({
        success: true,
        profiles: MODEL_BENCHMARK_PROFILES,
      });
    }

    // Default: Return Pareto rankings
    const rankings = rankModelsByParetoEfficiency(category || undefined);

    return NextResponse.json({
      success: true,
      categoryFilter: category || "all",
      rankings,
      totalModels: rankings.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch benchmark data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sampleLimit = typeof body.sampleLimit === "number" ? body.sampleLimit : 10;
    const categoryFilter = body.categoryFilter as BenchmarkCategory | undefined;
    const modelIds = Array.isArray(body.modelIds) ? body.modelIds : undefined;

    const summary = await runBenchmarkAudit({
      sampleLimit,
      categoryFilter,
      modelIds,
    });

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute benchmark audit" },
      { status: 500 }
    );
  }
}

