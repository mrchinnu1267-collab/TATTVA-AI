/**
 * TATTVA AI - MMMLU Evaluation Stop API
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextRequest, NextResponse } from "next/server";
import { mmmluEvaluator } from "../../../lib/evaluation/mmmlu";

export async function POST(req: NextRequest) {
  try {
    const { runId } = await req.json();
    if (!runId) {
      return NextResponse.json({ success: false, error: "Missing runId" }, { status: 400 });
    }

    const stopped = mmmluEvaluator.stopEvaluation(runId);
    return NextResponse.json({ success: true, stopped });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
