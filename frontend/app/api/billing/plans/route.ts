/**
 * TATTVA AI - Subscription Plans API Route (Phase 45)
 * GET /api/billing/plans -> Returns active plan definitions and feature entitlement matrices
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { BillingEngine } from "../../../lib/billing";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await verifyUserSession(request);
    const engine = BillingEngine.getInstance();
    const plans = engine.getPlans();
    return NextResponse.json({ success: true, plans });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
