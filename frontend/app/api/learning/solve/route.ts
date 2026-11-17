/**
 * TATTVA AI - Step-by-Step Problem Solver Route
 * POST /api/learning/solve -> Decompose problem into step-by-step verified derivation
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { LearningPlatformEngine, SubjectDomain, DifficultyLevel } from "../../../lib/learning";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const problem = typeof body.problem === "string" ? body.problem.trim() : "";
    const domain: SubjectDomain = body.domain || "computer_science";
    const difficulty: DifficultyLevel = body.difficulty || "intermediate";

    if (!problem) {
      return NextResponse.json(
        { error: "Field 'problem' is required." },
        { status: 400 }
      );
    }

    const solution = LearningPlatformEngine.deriveSolution(problem, domain, difficulty);

    return NextResponse.json({
      success: true,
      data: solution,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to derive problem solution" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
