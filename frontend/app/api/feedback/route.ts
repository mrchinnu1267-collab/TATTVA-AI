import { NextResponse } from "next/server";
import { recordMessageFeedback, getUserFeedbackSummary } from "../../lib/memory-service";
import { MessageFeedback, FeedbackCategory } from "../../lib/memory-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.messageId || !body.category) {
      return NextResponse.json({ error: "messageId and category are required" }, { status: 400 });
    }

    const feedback: MessageFeedback = {
      id: crypto.randomUUID(),
      messageId: body.messageId,
      sessionId: body.sessionId,
      userEmail: body.userEmail,
      rating: body.rating === "negative" ? "negative" : "positive",
      category: body.category as FeedbackCategory,
      comment: typeof body.comment === "string" ? body.comment.trim() : undefined,
      createdAt: Date.now(),
    };

    await recordMessageFeedback(feedback);

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error("POST /api/feedback error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record feedback" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const summary = await getUserFeedbackSummary(email);
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("GET /api/feedback error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get feedback summary" },
      { status: 500 }
    );
  }
}
