/**
 * TATTVA AI - MMMLU Evaluation Cancel API
 * Aborts an active evaluation run via AbortController
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextRequest, NextResponse } from "next/server";
import { mmmluEvaluator } from "../../../lib/evaluation/mmmlu";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { runId } = body;

    if (!runId) {
      return NextResponse.json(
        { success: false, error: "Missing required 'runId' parameter" },
        { status: 400 }
      );
    }

    const stopped = mmmluEvaluator.stopEvaluation(runId);

    return NextResponse.json({
      success: true,
      stopped,
      message: stopped ? `Evaluation run '${runId}' has been aborted.` : `Run '${runId}' not active or already finished.`,
    });
  } catch (err: any) {
    console.error("[MMMLU Cancel API Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
