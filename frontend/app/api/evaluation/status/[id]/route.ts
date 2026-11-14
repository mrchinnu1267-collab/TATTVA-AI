/**
 * TATTVA AI - MMMLU Evaluation Status API
 * Retrieves active or completed run details by ID
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextRequest, NextResponse } from "next/server";
import { evaluationStorage } from "../../../../lib/evaluation/mmmlu";

export async function GET(
  _req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await segmentData.params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing run ID" }, { status: 400 });
    }

    const run = await evaluationStorage.getRun(id);
    if (!run) {
      return NextResponse.json({ success: false, error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status: run.status || "completed",
      run,
    });
  } catch (err: any) {
    console.error("[MMMLU Status API Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
