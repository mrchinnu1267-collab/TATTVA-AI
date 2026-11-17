/**
 * TATTVA AI - Knowledge Graph Semantic QA Route
 * POST /api/knowledge-graph/qa -> Answer questions grounded in tenant knowledge graph
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { KnowledgeGraphEngine } from "../../../lib/knowledge-graph";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const question = typeof body.question === "string" ? body.question.trim() : "";
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "default";

    if (!question) {
      return NextResponse.json(
        { error: "Field 'question' is required." },
        { status: 400 }
      );
    }

    const qaResult = await KnowledgeGraphEngine.queryGraphQA(
      session.userId,
      workspaceId,
      question
    );

    return NextResponse.json({
      success: true,
      data: qaResult,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to query knowledge graph QA" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
