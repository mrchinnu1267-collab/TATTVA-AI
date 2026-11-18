/**
 * TATTVA AI - Data Retention Policy API Route (Phase 47)
 * GET /api/data-governance/retention -> Retrieves workspace retention policy
 * PUT /api/data-governance/retention -> Updates retention parameters
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
    } catch { }
    try {
      const raw = Buffer.from(customHeader, "base64").toString("utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.userId || parsed.email) {
        return { userId: parsed.userId || parsed.email, email: parsed.email || "user@tattva.ai" };
      }
    } catch { }
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
    resolveUser(request, sessionUser);
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") || "default";

    const engine = DataGovernanceEngine.getInstance();
    const policy = engine.getRetentionPolicy(workspaceId);

    return NextResponse.json({ success: true, policy });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const sessionUser = await verifyUserSession(request);
    const user = resolveUser(request, sessionUser);
    const body = await request.json().catch(() => ({}));
    const {
      workspaceId = "default",
      chatRetentionDays,
      researchRetentionDays,
      documentRetentionDays,
      auditLogRetentionDays,
      codeArtifactRetentionDays,
      autoPurgeEnabled,
    } = body;

    const engine = DataGovernanceEngine.getInstance();
    const updated = engine.updateRetentionPolicy(
      workspaceId,
      {
        ...(chatRetentionDays !== undefined && { chatRetentionDays: Number(chatRetentionDays) }),
        ...(researchRetentionDays !== undefined && { researchRetentionDays: Number(researchRetentionDays) }),
        ...(documentRetentionDays !== undefined && { documentRetentionDays: Number(documentRetentionDays) }),
        ...(auditLogRetentionDays !== undefined && { auditLogRetentionDays: Number(auditLogRetentionDays) }),
        ...(codeArtifactRetentionDays !== undefined && { codeArtifactRetentionDays: Number(codeArtifactRetentionDays) }),
        ...(autoPurgeEnabled !== undefined && { autoPurgeEnabled: Boolean(autoPurgeEnabled) }),
      },
      user.userId
    );

    return NextResponse.json({ success: true, policy: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
