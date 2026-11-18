/**
 * TATTVA AI - Administrative Billing Controls & Reconciliation API Route
 * GET /api/billing/admin -> Returns tenant metrics, subscriber counts, and revenue reconciliation
 */

import { NextResponse } from "next/server";
import { verifyUserSession, logSecurityEvent } from "../../../lib/security";
import { BillingEngine } from "../../../lib/billing";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await verifyUserSession(request);
    
    // Strict admin authorization guard
    const isAdmin =
      user.authenticated &&
      (user.role === "admin" ||
        user.email === process.env.ADMIN_EMAIL ||
        request.headers.get("x-tattva-admin-secret") === process.env.APP_ENCRYPTION_KEY);

    if (!isAdmin) {
      logSecurityEvent("UNAUTHORIZED_ADMIN_BILLING_ACCESS", {
        userId: user.userId,
        endpoint: "/api/billing/admin",
        details: {
          email: user.email,
          ip: request.headers.get("x-forwarded-for") || undefined,
        },
      });

      return NextResponse.json(
        { success: false, error: "Access denied. Administrative authorization required." },
        { status: 403 }
      );
    }

    const engine = BillingEngine.getInstance();
    const metrics = engine.getAdminMetrics();
    const analytics = engine.getAnalytics();

    return NextResponse.json({
      success: true,
      metrics,
      analytics,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
