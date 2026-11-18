/**
 * TATTVA AI - Model Providers & Canary Testing API Route
 * GET /api/evolution/providers -> Returns registered model metadata, health, and canary history
 * POST /api/evolution/providers -> Executes an isolated canary test on a candidate model
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { modelProviderManager } from "../../../lib/platform-evolution";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await verifyUserSession(request);
    const models = modelProviderManager.getRegisteredModels();
    const canaryHistory = modelProviderManager.getCanaryHistory();

    return NextResponse.json({
      success: true,
      data: {
        models,
        canaryHistory,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    if (!body.candidateModel || !body.candidateModel.id) {
      return NextResponse.json(
        { error: "Provide 'candidateModel' with at least 'id' and 'displayName'." },
        { status: 400 }
      );
    }

    const baselineModelId = body.baselineModelId || "gemini-2.5-flash";
    const canaryResult = modelProviderManager.runCanaryTest(body.candidateModel, baselineModelId);

    return NextResponse.json({ success: true, data: canaryResult });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
