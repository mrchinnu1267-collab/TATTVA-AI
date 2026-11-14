/**
 * TATTVA AI - AI Performance Analysis & Improvement API
 * Weakness pattern clustering and human-reviewed recommendation workflow
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextRequest, NextResponse } from "next/server";
import { failureAnalyzer } from "../../../lib/evaluation/improvement/failure-analyzer";
import { evaluationStorage } from "../../../lib/evaluation/mmmlu/storage";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const runId = searchParams.get("runId");

    if (id) {
      const report = failureAnalyzer.getAnalysisById(id);
      if (!report) return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
      return NextResponse.json({ success: true, report });
    }

    if (runId) {
      const all = failureAnalyzer.listAnalyses();
      const matching = all.find((a) => a.runId === runId);
      if (matching) return NextResponse.json({ success: true, report: matching });
    }

    const analyses = failureAnalyzer.listAnalyses();
    return NextResponse.json({ success: true, count: analyses.length, analyses });
  } catch (err: any) {
    console.error("[Performance Analysis GET Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { runId } = body;

    if (!runId) {
      return NextResponse.json({ success: false, error: "Missing required 'runId'" }, { status: 400 });
    }

    const run = await evaluationStorage.getRun(runId);
    if (!run) {
      return NextResponse.json({ success: false, error: `Evaluation run '${runId}' not found.` }, { status: 404 });
    }

    const report = failureAnalyzer.analyzeRun(run);
    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    console.error("[Performance Analysis POST Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { analysisId, recommendationId, status, reviewerName } = body;

    if (!analysisId || !recommendationId || !status) {
      return NextResponse.json(
        { success: false, error: "Missing analysisId, recommendationId, or status" },
        { status: 400 }
      );
    }

    const updated = failureAnalyzer.updateRecommendationStatus(
      analysisId,
      recommendationId,
      status,
      reviewerName
    );

    return NextResponse.json({ success: updated });
  } catch (err: any) {
    console.error("[Performance Analysis PATCH Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
