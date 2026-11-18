/**
 * TATTVA AI - Payment Webhook Ingestion API Route (Phase 45)
 * POST /api/billing/webhooks -> Ingests webhook events from Stripe, LemonSqueezy, and Razorpay
 */

import { NextResponse } from "next/server";
import { PaymentGateway } from "../../../lib/billing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const eventType = body.type || body.event || body.eventType || "unknown";
    const provider = body.provider || (body.type?.startsWith("customer.") || body.type?.startsWith("checkout.") ? "stripe" : "lemonsqueezy");
    const data = body.data?.object || body.data || body;

    const gateway = PaymentGateway.getInstance();
    const result = await gateway.handleWebhook({
      id: body.id || `evt_${Date.now()}`,
      provider,
      eventType,
      timestamp: Date.now(),
      data,
    });

    return NextResponse.json({ success: true, handled: result.handled, action: result.action });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
