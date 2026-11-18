/**
 * TATTVA AI - AI Quality Evaluation API Route
 * GET /api/evolution/eval -> Returns benchmark dataset questions
 * POST /api/evolution/eval -> Executes evaluation across 8 quality categories
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { aiQualityEvaluator, EvaluationCategory } from "../../../lib/platform-evolution";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as EvaluationCategory | null;

    const questions = aiQualityEvaluator.getBenchmarkQuestions(category || undefined);
    return NextResponse.json({ success: true, count: questions.length, data: questions });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const targetModel = body.targetModel || "gemini-2.5-flash";
    const sampleResponses = body.sampleResponses;

    const evalResult = aiQualityEvaluator.evaluateResponses(targetModel, sampleResponses);
    return NextResponse.json({ success: true, data: evalResult });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
