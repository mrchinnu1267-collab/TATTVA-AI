/**
 * TATTVA AI - UPI Payment & Subscription Status API Route
 * GET /api/billing/upi/status?orderId=... -> Retrieves real-time status of payment or subscription
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../../lib/security";
import { BillingEngine } from "../../../../lib/billing";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await verifyUserSession(request);
    const userId = user.userId || "authenticated_user";
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");

    const engine = BillingEngine.getInstance();
    const subscription = engine.getUserSubscription(userId);

    let paymentRecord: any = null;
    if (orderId) {
      const payments = engine.getUserPayments(userId);
      paymentRecord = payments.find((p) => p.providerOrderId === orderId) || null;
    }

    return NextResponse.json({
      success: true,
      subscription,
      payment: paymentRecord,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
