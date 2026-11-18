/**
 * TATTVA AI - UPI Payment Verification API Route
 * POST /api/billing/upi/verify -> Authoritatively verifies Razorpay HMAC signature and activates Go plan
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
        { success: false, error: "Authentication required to verify payment." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { orderId, paymentId, signature, upiVpa } = body;

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { success: false, error: "Missing required verification parameters (orderId, paymentId, signature)." },
        { status: 400 }
      );
    }

    const engine = BillingEngine.getInstance();
    const result = await engine.verifyUpiPayment({
      userId: user.userId,
      orderId,
      paymentId,
      signature,
      upiVpa,
    });

    if (!result.success) {
      logSecurityEvent("PAYMENT_VERIFICATION_FAILED", {
        userId: user.userId,
        endpoint: "/api/billing/upi/verify",
        details: {
          orderId,
          paymentId,
          error: result.error,
        },
      });

      return NextResponse.json(
        { success: false, error: result.error || "Payment verification failed." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment successfully verified. TATTVA AI Go plan activated!",
      subscription: result.subscription,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
