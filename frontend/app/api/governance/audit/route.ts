/**
 * TATTVA AI - Governance Audit Trail API Route (Phase 44)
 * GET /api/governance/audit -> Returns immutable audit trail logs and counts
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { GovernanceAuditTrail } from "../../../lib/ai-governance";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const eventType = (searchParams.get("eventType") || undefined) as any;
    const severity = (searchParams.get("severity") || undefined) as any;
    const actor = searchParams.get("actor") || undefined;
    const limit = Number(searchParams.get("limit")) || 50;

    const auditTrail = GovernanceAuditTrail.getInstance();
    const logs = auditTrail.query({ eventType, severity, actor, limit });
    const counts = auditTrail.getCounts();

    return NextResponse.json({ success: true, logs, counts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
