/**
 * TATTVA AI - GDPR & CCPA Self-Service Data Export API Route (Phase 47)
 * GET /api/data-governance/export -> Returns generated export bundle or lists past user exports
 * POST /api/data-governance/export -> Initiates a machine-readable export generation
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
    const exportId = searchParams.get("id");

    const engine = DataGovernanceEngine.getInstance();

    if (exportId) {
      const archive = engine.getExport(exportId, user.userId);
      if (!archive) {
        return NextResponse.json(
          { success: false, error: "Export archive not found or unauthorized" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, archive });
    }

    const exportsList = engine.listUserExports(user.userId);
    return NextResponse.json({ success: true, count: exportsList.length, exports: exportsList });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await verifyUserSession(request);
    const user = resolveUser(request, sessionUser);
    const body = await request.json().catch(() => ({}));
    const { format = "json" } = body;

    const engine = DataGovernanceEngine.getInstance();
    const archive = await engine.requestExport({
      userId: user.userId,
      userEmail: user.email,
      format: format === "zip" ? "zip" : "json",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, archive });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
