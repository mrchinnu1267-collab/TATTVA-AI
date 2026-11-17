/**
 * TATTVA AI - Interactive Quiz & Assessment Route
 * POST /api/learning/quiz -> Generate new quiz
 * PUT /api/learning/quiz -> Submit quiz answers and receive instant evaluation & mastery updates
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import {
  LearningPlatformEngine,
  SubjectDomain,
  DifficultyLevel,
  Quiz,
  QuizAnswerSubmission,
} from "../../../lib/learning";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const domain: SubjectDomain = body.domain || "computer_science";
    const level: DifficultyLevel = body.level || "intermediate";
    const count = typeof body.questionCount === "number" ? Math.max(1, Math.min(10, body.questionCount)) : 3;

    if (!topic) {
      return NextResponse.json(
        { error: "Field 'topic' is required to generate a quiz." },
        { status: 400 }
      );
    }

    const quiz = LearningPlatformEngine.createQuiz(topic, domain, level, count);

    return NextResponse.json({
      success: true,
      data: quiz,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to generate quiz" },
      { status: isAuth ? 401 : 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const quiz: Quiz = body.quiz;
    const submissions: QuizAnswerSubmission[] = Array.isArray(body.submissions) ? body.submissions : [];
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "default";

    if (!quiz || !quiz.id || !Array.isArray(quiz.questions)) {
      return NextResponse.json(
        { error: "Field 'quiz' with valid questions is required for evaluation." },
        { status: 400 }
      );
    }

    const evaluation = LearningPlatformEngine.evaluateQuiz(
      session.userId,
      workspaceId,
      quiz,
      submissions
    );

    return NextResponse.json({
      success: true,
      data: evaluation,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to evaluate quiz" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
