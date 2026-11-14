/**
 * TATTVA AI - Conversational & Multilingual AI Evaluation API
 * Tests context retention, Telugu-English code-switching, tool selection & topic shifting
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextRequest, NextResponse } from "next/server";
import { conversationalEvaluator } from "../../../lib/evaluation/conversational/conversational-evaluator";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const summary = conversationalEvaluator.getSummaryById(id);
      if (!summary) return NextResponse.json({ success: false, error: "Run not found" }, { status: 404 });
      return NextResponse.json({ success: true, summary });
    }

    const summaries = conversationalEvaluator.listSummaries();
    return NextResponse.json({ success: true, count: summaries.length, summaries });
  } catch (err: any) {
    console.error("[Conversational Eval GET Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      provider = "gemini",
      model = "gemini-2.5-flash",
      datasetId = "conversational-multiturn-eval",
    } = body;

    const summary = await conversationalEvaluator.runConversationalEvaluation(
      provider,
      model,
      datasetId
    );

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (err: any) {
    console.error("[Conversational Eval POST Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
