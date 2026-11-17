/**
 * TATTVA AI - Spaced Repetition (SM-2) Flashcard Route
 * GET /api/learning/spaced-repetition -> Retrieve cards or due cards
 * POST /api/learning/spaced-repetition -> Create a card or submit a review grade
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { LearningPlatformEngine } from "../../../lib/learning";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") || "default";
    const dueOnly = searchParams.get("due") === "true";

    const cards = dueOnly
      ? LearningPlatformEngine.getDueCards(session.userId, workspaceId)
      : LearningPlatformEngine.getCards(session.userId, workspaceId);

    const mastery = LearningPlatformEngine.getMasteryProfile(session.userId, workspaceId);

    return NextResponse.json({
      success: true,
      data: {
        cards,
        totalCards: cards.length,
        mastery,
      },
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to retrieve spaced repetition cards" },
      { status: isAuth ? 401 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "default";

    // Review Action
    if (body.action === "review") {
      const cardId = typeof body.cardId === "string" ? body.cardId.trim() : "";
      const quality = typeof body.quality === "number" ? body.quality : 4;

      if (!cardId) {
        return NextResponse.json(
          { error: "Field 'cardId' is required for review action." },
          { status: 400 }
        );
      }

      const updatedCard = LearningPlatformEngine.reviewCard(
        session.userId,
        workspaceId,
        cardId,
        quality
      );

      if (!updatedCard) {
        return NextResponse.json(
          { error: "Card not found." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: updatedCard,
      });
    }

    // Create Card Action
    const concept = typeof body.concept === "string" ? body.concept.trim() : "";
    const front = typeof body.front === "string" ? body.front.trim() : "";
    const back = typeof body.back === "string" ? body.back.trim() : "";
    const tags = Array.isArray(body.tags) ? body.tags : [];

    if (!front || !back) {
      return NextResponse.json(
        { error: "Fields 'front' and 'back' are required to create a flashcard." },
        { status: 400 }
      );
    }

    const card = LearningPlatformEngine.createCard(
      session.userId,
      workspaceId,
      concept || "General Concept",
      front,
      back,
      tags
    );

    return NextResponse.json({
      success: true,
      data: card,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to process spaced repetition request" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
