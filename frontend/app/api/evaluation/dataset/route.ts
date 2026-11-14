/**
 * TATTVA AI - MMMLU Dataset Metadata & Available Models API
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextResponse } from "next/server";
import { mmmluCSVLoader } from "../../../lib/evaluation/mmmlu";
import { modelRouter } from "../../../lib/ai-orchestrator/model-router";

export async function GET() {
  try {
    const { report } = mmmluCSVLoader.loadAndValidateDataset();
    const models = modelRouter.getModelCatalog();

    return NextResponse.json({
      success: true,
      dataset: {
        name: "OpenAI MMMLU (Hindi)",
        filename: "mmlu_HI-IN.csv",
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
