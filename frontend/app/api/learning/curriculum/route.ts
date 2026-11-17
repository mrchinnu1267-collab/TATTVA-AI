/**
 * TATTVA AI - Learning Curriculum API Route
 * POST /api/learning/curriculum -> Generate personalized curriculum
 * GET /api/learning/curriculum -> Retrieve active curriculum
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { LearningPlatformEngine, SubjectDomain, DifficultyLevel } from "../../../lib/learning";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const domain: SubjectDomain = body.domain || "computer_science";
    const baselineLevel: DifficultyLevel = body.baselineLevel || "beginner";
    const targetLevel: DifficultyLevel = body.targetLevel || "advanced";
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "default";

    if (!topic) {
      return NextResponse.json(
        { error: "Field 'topic' is required to generate a curriculum." },
        { status: 400 }
      );
    }

    const curriculum = LearningPlatformEngine.createCurriculum(
      session.userId,
      workspaceId,
      topic,
      domain,
      baselineLevel,
      targetLevel
    );

    return NextResponse.json({
      success: true,
      data: curriculum,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to generate learning curriculum" },
      { status: isAuth ? 401 : 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get("topic") || "System Architecture & Scalability";
    const domain = (searchParams.get("domain") as SubjectDomain) || "system_architecture";
    const workspaceId = searchParams.get("workspaceId") || "default";

    const curriculum = LearningPlatformEngine.createCurriculum(
      session.userId,
      workspaceId,
      topic,
      domain,
      "intermediate",
      "expert"
    );

    return NextResponse.json({
      success: true,
      data: curriculum,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to retrieve curriculum" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
