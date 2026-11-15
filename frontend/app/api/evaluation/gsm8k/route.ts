/**
 * TATTVA AI - GSM8K Mathematical Evaluation API Endpoint
 * Handles evaluation run dispatch, live status, and run history retrieval.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextRequest, NextResponse } from "next/server";
import { gsm8kEvaluator } from "@/app/lib/evaluation/gsm8k/gsm8k-evaluator";
import { datasetRegistry } from "@/app/lib/evaluation/datasets/dataset-registry";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    if (runId) {
      const run = gsm8kEvaluator.getRunById(runId);
      if (!run) {
        return NextResponse.json({ error: `Run '${runId}' not found` }, { status: 404 });
      }
      return NextResponse.json({ run });
    }

    const history = gsm8kEvaluator.getHistory();
    const trainMeta = datasetRegistry.getDatasetById("gsm8k-train");
    const evalMeta = datasetRegistry.getDatasetById("gsm8k-evaluation");

    return NextResponse.json({
      history,
      metadata: {
        trainDataset: trainMeta,
        evalDataset: evalMeta,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, questionCount, seed, mockInference } = body;

    if (!modelId) {
      return NextResponse.json({ error: "modelId is required" }, { status: 400 });
    }

    const summary = await gsm8kEvaluator.runEvaluation({
      modelId,
      questionCount: questionCount || 10,
      seed: seed !== undefined ? seed : 42,
      mockInference: Boolean(mockInference),
    });

    return NextResponse.json({ success: true, summary });
  } catch (err: any) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
