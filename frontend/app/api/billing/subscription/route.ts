/**
 * TATTVA AI - User Subscription API Route (Phase 45)
 * GET /api/billing/subscription -> Returns active user subscription details and limits
 * POST /api/billing/subscription -> Upgrades user subscription or generates checkout session
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

    return NextResponse.json({
      success: true,
      subscription,
      plan,
      usage,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyUserSession(request);
    const userId = user.userId || "authenticated_user";
    const body = await request.json().catch(() => ({}));
    const { tier = "pro", billingCycle = "monthly", directUpgrade = false } = body;

    const engine = BillingEngine.getInstance();

    if (directUpgrade) {
      const updated = await engine.setSubscriptionTier(userId, tier, billingCycle);
      return NextResponse.json({ success: true, subscription: updated });
    }

    const session = engine.createCheckout({
      userId,
      tier,
      billingCycle,
    });

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
