/**
 * TATTVA AI - Governance Policies API Route (Phase 44)
 * GET /api/governance/policies -> Lists configured AI policies
 * POST /api/governance/policies -> Updates a governance policy
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { AIGovernanceEngine } from "../../../lib/ai-governance";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await verifyUserSession(request);
    const engine = AIGovernanceEngine.getInstance();
    const policies = engine.getPolicies();
    return NextResponse.json({ success: true, policies });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));
    const { id, enabled, actionOnViolation, description } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Policy id is required" },
        { status: 400 }
      );
    }

    const engine = AIGovernanceEngine.getInstance();
    const updated = engine.updatePolicy(id, { enabled, actionOnViolation, description });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Policy not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, policy: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
