/**
 * TATTVA AI - Knowledge Graph Traversal API Route
 * POST /api/knowledge-graph/traverse -> Find relationship path between two entities
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { KnowledgeGraphEngine } from "../../../lib/knowledge-graph";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const source = typeof body.source === "string" ? body.source.trim() : "";
    const target = typeof body.target === "string" ? body.target.trim() : "";
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "default";

    if (!source || !target) {
      return NextResponse.json(
        { error: "Both 'source' and 'target' entity names or IDs are required." },
        { status: 400 }
      );
    }

    if (typeof body.content === "string" && body.content.trim()) {
      await KnowledgeGraphEngine.ingestContent(session.userId, workspaceId, body.content.trim());
    }

    const path = KnowledgeGraphEngine.traversePath(session.userId, workspaceId, source, target);

    return NextResponse.json({
      success: true,
      found: !!path,
      path: path || null,
      message: path ? `Path found with ${path.hopCount} hop(s)` : `No direct or indirect relationship path found between '${source}' and '${target}'.`,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to traverse knowledge graph" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
