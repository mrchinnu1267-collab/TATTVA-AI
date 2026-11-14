/**
 * TATTVA AI - MMMLU Dataset Metadata & Available Models API
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextRequest, NextResponse } from "next/server";
import { mmmluCSVLoader } from "../../../lib/evaluation/mmmlu";
import { modelRouter } from "../../../lib/ai-orchestrator/model-router";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const datasetParam = searchParams.get("dataset") || "sample";

    const { report } = mmmluCSVLoader.loadAndValidateDataset(datasetParam);
    const models = modelRouter.getModelCatalog();

    const isFull = datasetParam === "full";

    return NextResponse.json({
      success: true,
      dataset: {
        name: isFull ? "OpenAI MMMLU (Full Corpus)" : "OpenAI MMMLU (Sample Benchmark)",
        filename: isFull ? "mmlu_HI-IN.csv" : "MMMLU_HI-IN_456_question_sample.csv",
        language: "hi-IN",
        totalRows: report.totalRows,
        validQuestions: report.validQuestions,
        invalidRows: report.invalidRows,
        subjectsCount: report.subjects.length,
        subjects: report.subjects,
      },
      availableModels: models.map((m) => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        isAvailable: m.isAvailable,
        latencyTier: m.latencyTier,
        strengths: m.strengths,
      })),
    });
  } catch (err: any) {
    console.error("[MMMLU Dataset API Error]:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
