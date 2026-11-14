/**
 * TATTVA AI - Single MMMLU Evaluation Run Detail API
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextRequest, NextResponse } from "next/server";
import { evaluationStorage } from "../../../../lib/evaluation/mmmlu";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const run = await evaluationStorage.getRun(id);
    if (!run) {
      return NextResponse.json({ success: false, error: "Evaluation run not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, run });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await evaluationStorage.deleteRun(id);
    return NextResponse.json({ success: true, deleted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
