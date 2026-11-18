/**
 * TATTVA AI - Authoritative Payment Webhook Ingestion API Route
 * POST /api/billing/webhooks -> Validates HMAC signature and processes provider webhooks
 */

import { NextResponse } from "next/server";
import { UpiPaymentGateway } from "../../../lib/billing/upi-gateway";
import { logSecurityEvent } from "../../../lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rawPayload = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    if (!rawPayload || !signature) {
      logSecurityEvent("INVALID_WEBHOOK_PAYLOAD", {
        endpoint: "/api/billing/webhooks",
        details: { reason: "Missing raw body or X-Razorpay-Signature header" },
      });
      return NextResponse.json(
        { success: false, error: "Missing required webhook payload or signature." },
        { status: 400 }
      );
    }

    let parsedEvent: Record<string, any>;
    try {
      parsedEvent = JSON.parse(rawPayload);
    } catch {
      return NextResponse.json(
        { success: false, error: "Malformed JSON payload." },
        { status: 400 }
      );
    }

    const gateway = UpiPaymentGateway.getInstance();
    const result = await gateway.handleWebhook({
      rawPayload,
      signature,
      event: parsedEvent,
    });

    return NextResponse.json({
      success: true,
      handled: result.handled,
      action: result.action,
    });
  } catch (err: any) {
    console.error("[Billing Webhooks] Verification error:", err.message);
    logSecurityEvent("WEBHOOK_VERIFICATION_FAILURE", {
      endpoint: "/api/billing/webhooks",
      details: { error: err.message },
    });
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
