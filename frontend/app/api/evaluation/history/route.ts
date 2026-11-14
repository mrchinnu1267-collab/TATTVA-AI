/**
 * TATTVA AI - MMMLU Evaluation History API
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextResponse } from "next/server";
import { evaluationStorage } from "../../../lib/evaluation/mmmlu";

export async function GET() {
  try {
    const runs = await evaluationStorage.listRuns();
    return NextResponse.json({ success: true, runs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
