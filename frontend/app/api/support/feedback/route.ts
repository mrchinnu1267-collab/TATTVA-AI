/**
 * TATTVA AI - Feedback & Satisfaction Ratings API Route (Phase 46)
 * GET /api/support/feedback -> Returns satisfaction scores and feedback items
 * POST /api/support/feedback -> Ingests user ratings and qualitative feedback
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { CustomerSupportEngine } from "../../../lib/support";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await verifyUserSession(request);
    const engine = CustomerSupportEngine.getInstance();
    const metrics = engine.getMetrics();
    const feedback = engine.listFeedback(25);

    return NextResponse.json({ success: true, metrics, feedback });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyUserSession(request);
    const userId = user.userId || "authenticated_user";
    const body = await request.json().catch(() => ({}));
    const { rating = 5, category = "chat_response", feedbackText = "" } = body;

    const engine = CustomerSupportEngine.getInstance();
    const item = await engine.submitFeedback({
      userId,
      rating: Number(rating),
      category,
      feedbackText,
    });

    return NextResponse.json({ success: true, feedback: item });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
