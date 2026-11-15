import { NextResponse } from "next/server";
import { recordMessageFeedback, getUserFeedbackSummary } from "../../lib/memory-service";
import { MessageFeedback, FeedbackCategory } from "../../lib/memory-types";
import { feedbackIntelligenceService } from "../../lib/feedback-intelligence/feedback-service";
import { FeedbackCategoryDetailed } from "../../lib/feedback-intelligence/types";
import { verifyUserSession } from "../../lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Request body is required" }, { status: 400 });
    }

    const userId = session.userId || body.userId || body.userEmail || "anonymous_user";

    // 1. Submit through Feedback Intelligence Service
    const intelligenceResult = feedbackIntelligenceService.submitFeedback({
      userId,
      workspaceId: body.workspaceId,
      category: (body.category as FeedbackCategoryDetailed) || (body.rating === "positive" ? "helpful" : "not_helpful"),
      rating: body.rating === "negative" ? "negative" : "positive",
      userComments: body.comment || body.userComments,
      conversationSnippet: body.conversationSnippet,
      modelUsed: body.modelUsed,
      toolInvolved: body.toolInvolved,
      userConsentedToStore: body.userConsentedToStore ?? true,
      consentToAnonymizedImprovement: body.consentToAnonymizedImprovement ?? false,
    });

    if (!intelligenceResult.success) {
      return NextResponse.json({ error: intelligenceResult.error }, { status: 403 });
    }

    // 2. Also record in legacy memory service if messageId is provided
    if (body.messageId) {
      const legacyFeedback: MessageFeedback = {
        id: intelligenceResult.record?.id || crypto.randomUUID(),
        messageId: body.messageId,
        sessionId: body.sessionId,
        userEmail: session.email || body.userEmail,
        rating: body.rating === "negative" ? "negative" : "positive",
        category: (body.category as FeedbackCategory) || "other",
        comment: typeof body.comment === "string" ? body.comment.trim() : undefined,
        createdAt: Date.now(),
      };
      await recordMessageFeedback(legacyFeedback);
    }

    return NextResponse.json({
      success: true,
      record: intelligenceResult.record,
      message: "Feedback recorded with privacy safeguards.",
    });
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
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const reportMode = searchParams.get("report") === "true";
    const workspaceId = searchParams.get("workspaceId") || undefined;
    const userId = session.userId || searchParams.get("userId") || undefined;

    if (reportMode) {
      const report = feedbackIntelligenceService.generateIntelligenceReport(workspaceId);
      return NextResponse.json({ success: true, report });
    }

    if (!userId) {
      return NextResponse.json({ error: "User authentication required to view feedback" }, { status: 401 });
    }

    const items = feedbackIntelligenceService.listFeedback(userId, workspaceId);
    return NextResponse.json({ success: true, items, count: items.length });
  } catch (error) {
    console.error("GET /api/feedback error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get feedback" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const feedbackId = searchParams.get("id");
    const purgeAll = searchParams.get("purge") === "true";
    const userId = session.userId;

    if (!userId) {
      return NextResponse.json({ error: "Authentication required to delete feedback" }, { status: 401 });
    }

    if (purgeAll) {
      const deletedCount = feedbackIntelligenceService.purgeAllUserData(userId);
      return NextResponse.json({
        success: true,
        message: `Purged all ${deletedCount} feedback records for user.`,
        deletedCount,
      });
    }

    if (!feedbackId) {
      return NextResponse.json({ error: "feedbackId is required" }, { status: 400 });
    }

    const deleted = feedbackIntelligenceService.deleteFeedback(feedbackId, userId);
    if (!deleted) {
      return NextResponse.json({ error: "Feedback not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Feedback ${feedbackId} deleted.` });
  } catch (error) {
    console.error("DELETE /api/feedback error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete feedback" },
      { status: 500 }
    );
  }
}
