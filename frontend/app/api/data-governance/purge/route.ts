/**
 * TATTVA AI - "Right to be Forgotten" Account Purge API Route (Phase 47)
 * GET /api/data-governance/purge -> Inspects pending purge request status
 * POST /api/data-governance/purge -> Requests or confirms an account purge
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
    const requestId = searchParams.get("id");

    if (!requestId) {
      return NextResponse.json({ success: false, error: "requestId is required" }, { status: 400 });
    }

    const engine = DataGovernanceEngine.getInstance();
    const req = engine.getPurgeRequest(requestId, user.userId);

    if (!req) {
      return NextResponse.json({ success: false, error: "Purge request not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, request: req });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await verifyUserSession(request);
    const user = resolveUser(request, sessionUser);
    const body = await request.json().catch(() => ({}));
    const { action = "request", requestId, confirmationCode } = body;

    const engine = DataGovernanceEngine.getInstance();

    if (action === "confirm") {
      if (!requestId || !confirmationCode) {
        return NextResponse.json(
          { success: false, error: "requestId and confirmationCode are required for purge confirmation" },
          { status: 400 }
        );
      }

      const result = await engine.confirmPurge({
        requestId,
        confirmationCode,
        requestingUserId: user.userId,
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, purged: true, request: result.request });
    }

    // Default: initiate purge request
    const purgeReq = await engine.requestPurge({
      userId: user.userId,
      userEmail: user.email,
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, request: purgeReq });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
