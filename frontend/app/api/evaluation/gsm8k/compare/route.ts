/**
 * TATTVA AI - GSM8K Model Comparison API Endpoint
 * Executes head-to-head mathematical evaluation across multiple models on identical question slices.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextRequest, NextResponse } from "next/server";
import { gsm8kModelComparator } from "@/app/lib/evaluation/gsm8k/model-comparator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelIds, questionCount, seed, mockInference } = body;

    if (!Array.isArray(modelIds) || modelIds.length === 0) {
      return NextResponse.json(
        { error: "modelIds must be a non-empty array of model identifiers" },
        { status: 400 }
      );
    }

    const comparison = await gsm8kModelComparator.compareModels(
      modelIds,
      questionCount || 10,
      seed !== undefined ? seed : 42,
      Boolean(mockInference)
    );

    return NextResponse.json({ success: true, comparison });
  } catch (err: any) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
