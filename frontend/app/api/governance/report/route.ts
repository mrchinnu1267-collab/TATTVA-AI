/**
 * TATTVA AI - AI Governance & Responsible AI Master Report API Route (Phase 44)
 * GET /api/governance/report -> Generates complete governance metrics, compliance certification,
 * and safety audit report.
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { AIGovernanceEngine } from "../../../lib/ai-governance";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await verifyUserSession(request);
    const engine = AIGovernanceEngine.getInstance();
    const report = engine.generateGovernanceReport();

    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
