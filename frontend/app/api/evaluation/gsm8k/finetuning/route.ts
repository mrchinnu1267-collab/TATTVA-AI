/**
 * TATTVA AI - GSM8K Custom Model Fine-Tuning Readiness API Endpoint
 * Handles SFT dataset conversion and hardware feasibility checks.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextRequest, NextResponse } from "next/server";
import { gsm8kFineTuningPipeline } from "@/app/lib/evaluation/gsm8k/fine-tuning-pipeline";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const baseModel = searchParams.get("baseModel") || "Qwen/Qwen2.5-Math-1.5B-Instruct";
    const peftType = (searchParams.get("peftType") as any) || "qlora";

    const report = gsm8kFineTuningPipeline.assessTrainingReadiness({
      baseModel,
      peftType,
    });

    return NextResponse.json({ report });
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
    const { format = "alpaca", maxSamples = 20 } = body;

    const samples = await gsm8kFineTuningPipeline.prepareSftDataset(
      "gsm8k-train",
      format,
      maxSamples
    );

    return NextResponse.json({
      success: true,
      format,
      totalGenerated: samples.length,
      samplePreview: samples.slice(0, 3),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
