/**
 * TATTVA AI - Flashcard & Study Guide Export Route
 * POST /api/learning/export -> Generate Anki-compatible TSV and JSON export
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { LearningPlatformEngine, SpacedRepetitionCard } from "../../../lib/learning";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const topic = typeof body.topic === "string" ? body.topic.trim() : "General";
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "default";

    // Use passed cards or fetch user's saved cards
    let cards: SpacedRepetitionCard[] = Array.isArray(body.cards) ? body.cards : [];
    if (cards.length === 0) {
      cards = LearningPlatformEngine.getCards(session.userId, workspaceId);
    }

    // If still empty, synthesize sample cards for the topic
    if (cards.length === 0) {
      const sample1 = LearningPlatformEngine.createCard(
        session.userId,
        workspaceId,
        topic,
        `What is the primary role of ${topic}?`,
        `${topic} enforces deterministic state boundaries and optimal algorithmic complexity.`,
        [topic.replace(/\s+/g, "_")]
      );
      const sample2 = LearningPlatformEngine.createCard(
        session.userId,
        workspaceId,
        topic,
        `What is a critical pitfall to avoid in ${topic}?`,
        `Premature optimization without profiling, and neglecting boundary edge conditions.`,
        [topic.replace(/\s+/g, "_")]
      );
      cards = [sample1, sample2];
    }

    const bundle = LearningPlatformEngine.exportFlashcards(topic, cards);

    return NextResponse.json({
      success: true,
      data: bundle,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to export flashcards" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
