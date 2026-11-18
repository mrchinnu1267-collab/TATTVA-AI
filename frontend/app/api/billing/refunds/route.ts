/**
 * TATTVA AI - Billing Refunds API Route
 * POST /api/billing/refunds -> Submits and processes refund requests
 */

import { NextResponse } from "next/server";
import { verifyUserSession, logSecurityEvent } from "../../../lib/security";
import { BillingEngine } from "../../../lib/billing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await verifyUserSession(request);
    if (!user.authenticated || user.isGuest) {
      return NextResponse.json(
        { success: false, error: "Authentication required to request a refund." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { paymentId, reason } = body;

    if (!paymentId || !reason) {
      return NextResponse.json(
        { success: false, error: "Payment ID and reason are required to process a refund." },
        { status: 400 }
      );
    }

    const engine = BillingEngine.getInstance();
    const refund = await engine.requestRefund({
      userId: user.userId,
      paymentId,
      reason,
    });

    logSecurityEvent("REFUND_REQUESTED", {
      userId: user.userId,
      endpoint: "/api/billing/refunds",
      details: {
        paymentId,
        refundId: refund.refundId,
        amount: refund.amount,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Refund request initiated successfully. Account has been restored to the Free plan.",
      refund,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
