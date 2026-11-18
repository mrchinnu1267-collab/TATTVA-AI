/**
 * TATTVA AI - Unified Content Safety & Injection Scanner API Route (Phase 44)
 * POST /api/governance/scan -> Evaluates prompts or responses against safety rules,
 * adversarial injection heuristics, and PII filters.
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { AIGovernanceEngine } from "../../../lib/ai-governance";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));
    const { text, type = "inbound", modelName = "gemini-2.5-flash" } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { success: false, error: "Text string is required for governance scanning" },
        { status: 400 }
      );
    }

    const engine = AIGovernanceEngine.getInstance();

    if (type === "outbound") {
      const result = await engine.scanOutboundResponse(text, modelName);
      return NextResponse.json({ success: true, result });
    } else {
      const actor = user.userId || "authenticated_user";
      const result = await engine.scanInboundPrompt(text, actor);
      return NextResponse.json({ success: true, result });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
