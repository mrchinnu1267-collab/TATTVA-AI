/**
 * TATTVA AI - Human Approval Gate API Route (Phase 44)
 * GET /api/governance/approvals -> Lists pending/all approval requests
 * POST /api/governance/approvals -> Creates a new human approval request
 * PUT /api/governance/approvals -> Resolves an approval request (approve/reject)
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { ApprovalGate, GovernanceAuditTrail } from "../../../lib/ai-governance";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";

    const gate = ApprovalGate.getInstance();
    const requests = filter === "pending" ? gate.listPending() : gate.listAll();

    return NextResponse.json({ success: true, requests });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));
    const { operationType, toolName, riskTier = "high", reason, contextPayload } = body;

    if (!operationType || !reason) {
      return NextResponse.json(
        { success: false, error: "operationType and reason are required" },
        { status: 400 }
      );
    }

    const gate = ApprovalGate.getInstance();
    const auditTrail = GovernanceAuditTrail.getInstance();

    const created = await gate.requestApproval({
      requestedBy: user.userId || "authenticated_user",
      operationType,
      toolName,
      riskTier,
      reason,
      contextPayload,
    });

    await auditTrail.logEvent({
      actor: user.userId || "authenticated_user",
      eventType: "approval_requested",
      severity: riskTier === "critical" ? "critical" : "warning",
      summary: `Human approval requested for ${operationType} (${riskTier})`,
      details: { id: created.id, reason },
    });

    return NextResponse.json({ success: true, request: created });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));
    const { id, decision, resolutionNotes } = body;

    if (!id || (decision !== "approved" && decision !== "rejected")) {
      return NextResponse.json(
        { success: false, error: "id and decision ('approved' | 'rejected') are required" },
        { status: 400 }
      );
    }

    const gate = ApprovalGate.getInstance();
    const auditTrail = GovernanceAuditTrail.getInstance();

    const resolved = await gate.resolve(
      id,
      decision,
      user.userId || "safety_operator",
      resolutionNotes
    );

    if (!resolved) {
      return NextResponse.json(
        { success: false, error: "Approval request not found" },
        { status: 404 }
      );
    }

    await auditTrail.logEvent({
      actor: user.userId || "safety_operator",
      eventType: "approval_resolved",
      severity: decision === "approved" ? "info" : "warning",
      summary: `Approval request ${id} ${decision} by operator`,
      details: { id, decision, notes: resolutionNotes },
    });

    return NextResponse.json({ success: true, request: resolved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
