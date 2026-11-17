/**
 * TATTVA AI - Knowledge Graph Contradictions Route
 * GET /api/knowledge-graph/contradictions -> Retrieve detected factual contradictions
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { KnowledgeGraphEngine } from "../../../lib/knowledge-graph";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") || "default";

    const contradictions = KnowledgeGraphEngine.getContradictions(session.userId, workspaceId);

    return NextResponse.json({
      success: true,
      total: contradictions.length,
      contradictions,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to retrieve knowledge graph contradictions" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
