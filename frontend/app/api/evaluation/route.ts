import { NextResponse } from "next/server";
import { evaluationEngine } from "../../lib/ai-orchestrator/evaluation-engine";
import { verifyUserSession } from "../../lib/security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const benchmark = await evaluationEngine.runAutomatedBenchmark();

    return NextResponse.json({
      success: true,
      requestedBy: session.email || "guest_user",
      benchmark,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

