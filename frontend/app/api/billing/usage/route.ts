/**
 * TATTVA AI - Billing Quota & Consumption Telemetry API Route (Phase 45)
 * GET /api/billing/usage -> Returns tenant token, request, and storage balances
 * POST /api/billing/usage -> Records consumption usage
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
    const sub = engine.getUserSubscription(userId);
    const usage = engine.getUserUsage(userId, sub.tier);
    const analytics = engine.getAnalytics();

    return NextResponse.json({
      success: true,
      usage,
      analytics,
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
    const { tokens = 0, storageDeltaBytes = 0 } = body;

    const engine = BillingEngine.getInstance();
    const updated = await engine.recordUsage(userId, tokens, storageDeltaBytes);

    return NextResponse.json({ success: true, usage: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
