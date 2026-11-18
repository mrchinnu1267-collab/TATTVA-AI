/**
 * TATTVA AI - Subscription Cancellation API Route
 * POST /api/billing/subscription/cancel -> Cancels recurring subscription renewals
 */

import { NextResponse } from "next/server";
import { verifyUserSession, logSecurityEvent } from "../../../../lib/security";
import { BillingEngine } from "../../../../lib/billing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await verifyUserSession(request);
    if (!user.authenticated || user.isGuest) {
      return NextResponse.json(
        { success: false, error: "Authentication required to cancel subscription." },
        { status: 401 }
      );
    }

    const engine = BillingEngine.getInstance();
    const result = await engine.cancelSubscription(user.userId);

    logSecurityEvent("SUBSCRIPTION_CANCELLED", {
      userId: user.userId,
      endpoint: "/api/billing/subscription/cancel",
      details: { email: user.email },
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
