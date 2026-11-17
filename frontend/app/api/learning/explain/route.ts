/**
 * TATTVA AI - Concept Explanation API Route
 * POST /api/learning/explain -> Calibrated concept explanation with analogies & principles
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { LearningPlatformEngine, SubjectDomain, DifficultyLevel } from "../../../lib/learning";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const concept = typeof body.concept === "string" ? body.concept.trim() : "";
    const domain: SubjectDomain = body.domain || "computer_science";
    const level: DifficultyLevel = body.level || "intermediate";

    if (!concept) {
      return NextResponse.json(
        { error: "Field 'concept' is required." },
        { status: 400 }
      );
    }

    const explanation = LearningPlatformEngine.explainConcept(concept, domain, level);

    return NextResponse.json({
      success: true,
      data: explanation,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to explain concept" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
