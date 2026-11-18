/**
 * TATTVA AI - Governance Access Audit API Route (Phase 47)
 * GET /api/data-governance/audit -> Returns access audit events and governance metrics
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { DataGovernanceEngine } from "../../../lib/data-governance";

export const runtime = "nodejs";

function resolveUser(request: Request, sessionUser: any) {
  if (sessionUser && sessionUser.authenticated && !sessionUser.isGuest) {
    return { userId: sessionUser.userId, email: sessionUser.email };
  }
  const customHeader = request.headers.get("x-tattva-session");
  if (customHeader) {
    try {
      const part = customHeader.includes(".") ? customHeader.split(".")[0] : customHeader;
      const raw = Buffer.from(part, "base64url").toString("utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.userId || parsed.email) {
        return { userId: parsed.userId || parsed.email, email: parsed.email || "user@tattva.ai" };
      }
    } catch {}
    try {
      const raw = Buffer.from(customHeader, "base64").toString("utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.userId || parsed.email) {
        return { userId: parsed.userId || parsed.email, email: parsed.email || "user@tattva.ai" };
      }
    } catch {}
  }
  const explicitUserId = request.headers.get("x-user-id");
  if (explicitUserId) {
    return { userId: explicitUserId, email: request.headers.get("x-user-email") || `${explicitUserId}@tattva.ai` };
  }
  return { userId: sessionUser?.userId || "guest_user", email: sessionUser?.email || "guest@tattva.ai" };
}

export async function GET(request: Request) {
  try {
    const sessionUser = await verifyUserSession(request);
    const user = resolveUser(request, sessionUser);
    const { searchParams } = new URL(request.url);
    const action = (searchParams.get("action") || undefined) as any;
    const limit = Number(searchParams.get("limit")) || 50;

    const engine = DataGovernanceEngine.getInstance();
    const logs = engine.listAuditLogs({
      actorId: user.userId === "admin" ? undefined : user.userId,
      action,
      limit,
    });
    const metrics = engine.getMetrics();

    return NextResponse.json({ success: true, metrics, logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
