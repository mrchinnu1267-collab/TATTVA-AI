/**
 * TATTVA AI - UPI Order Creation API Route
 * POST /api/billing/upi/order -> Generates ₹40 INR UPI order, dynamic QR, and UPI intent links
 */

import { NextResponse } from "next/server";
import { verifyUserSession, checkRateLimit } from "../../../../lib/security";
import { BillingEngine } from "../../../../lib/billing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await verifyUserSession(request);
    if (!user.authenticated || user.isGuest) {
      return NextResponse.json(
        { success: false, error: "Authentication required to generate UPI checkout order." },
        { status: 401 }
      );
    }

    // Rate limit checkout creations to prevent order spam
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const rateCheck = checkRateLimit(`upi_order_${user.userId}_${clientIp}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: `Too many checkout requests. Please wait ${rateCheck.resetSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { autoRenew = true } = body;

    const engine = BillingEngine.getInstance();
    const order = await engine.createUpiOrder({
      userId: user.userId,
      userEmail: user.email || `${user.userId}@tattva.ai`,
      autoRenew,
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
