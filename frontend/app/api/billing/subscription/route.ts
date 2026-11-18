/**
 * TATTVA AI - User Subscription API Route
 * GET /api/billing/subscription -> Returns active user subscription details, plan definition, and current usage
 * POST /api/billing/subscription -> Generates checkout or updates settings (Strict: directUpgrade removed)
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { BillingEngine } from "../../../lib/billing";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await verifyUserSession(request);
    const userId = user.userId || "authenticated_user";

    const engine = BillingEngine.getInstance();
    const subscription = engine.getUserSubscription(userId);
    const plan = engine.getPlan(subscription.tier);
    const usage = engine.getUserUsage(userId, subscription.tier);
    const payments = engine.getUserPayments(userId);

    return NextResponse.json({
      success: true,
      subscription,
      plan,
      usage,
      payments,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyUserSession(request);
    if (!user.authenticated || user.isGuest) {
      return NextResponse.json(
        { success: false, error: "Authentication required to initiate subscription checkout." },
        { status: 401 }
      );
    }

    const userId = user.userId;
    const userEmail = user.email || `${userId}@tattva.ai`;
    const body = await request.json().catch(() => ({}));
    const { autoRenew = true } = body;

    const engine = BillingEngine.getInstance();
    const orderResult = await engine.createUpiOrder({
      userId,
      userEmail,
      autoRenew,
    });

    return NextResponse.json({
      success: true,
      order: orderResult,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
