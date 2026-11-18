/**
 * TATTVA AI - Platform Completeness & Engineering Completeness Audit API Route
 * GET /api/platform-completeness/audit -> Executes full 15-dimension engineering audit with evidence scoring
 * Enforces zero-trust session validation and sliding-window rate limiting.
 */

import { NextResponse } from "next/server";
import { platformCompletenessAuditor } from "../../../lib/platform-completeness";
import { verifyUserSession, checkRateLimit, logSecurityEvent } from "../../../lib/security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    if (!session.authenticated) {
      return NextResponse.json(
        { error: "Authentication required to access platform completeness audit results." },
        { status: 401 }
      );
    }

    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const rateCheck = checkRateLimit(`comp_audit_${session.userId}_${clientIp}`, 30, 60000);
    if (!rateCheck.allowed) {
      logSecurityEvent("RATE_LIMIT_EXCEEDED", {
        userId: session.userId,
        ip: clientIp,
        endpoint: "/api/platform-completeness/audit",
      });
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("targetUrl") || "https://tattva-ai-phi.vercel.app";

    const report = platformCompletenessAuditor.runFullCompletenessAudit(targetUrl);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
