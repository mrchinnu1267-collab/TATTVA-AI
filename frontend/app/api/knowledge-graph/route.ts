/**
 * TATTVA AI - Knowledge Graph Main API Route
 * POST /api/knowledge-graph -> Ingest document/text content into tenant knowledge graph
 * GET  /api/knowledge-graph -> Search nodes, retrieve subgraph, or fetch graph stats
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../lib/security";
import { KnowledgeGraphEngine } from "../../lib/knowledge-graph";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json(
        { error: "Content string is required for knowledge graph ingestion." },
        { status: 400 }
      );
    }

    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "default";
    const documentId = typeof body.documentId === "string" ? body.documentId.trim() : undefined;

    const result = await KnowledgeGraphEngine.ingestContent(
      session.userId,
      workspaceId,
      content,
      documentId
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to process knowledge graph ingestion" },
      { status: isAuth ? 401 : 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);

    const workspaceId = searchParams.get("workspaceId") || "default";
    const seed = searchParams.get("seed");
    const query = searchParams.get("query");
    const statsOnly = searchParams.get("stats") === "true";

    if (statsOnly) {
      const stats = KnowledgeGraphEngine.getStats(session.userId, workspaceId);
      return NextResponse.json({ success: true, stats });
    }

    if (seed) {
      const depth = Math.min(parseInt(searchParams.get("depth") || "2", 10), 4);
      const subgraph = KnowledgeGraphEngine.getSubgraph(session.userId, workspaceId, seed, depth);
      return NextResponse.json({ success: true, subgraph });
    }

    if (query) {
      const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);
      const nodes = KnowledgeGraphEngine.searchNodes(session.userId, workspaceId, query, limit);
      return NextResponse.json({ success: true, nodes });
    }

    // Default: return stats and sample nodes
    const stats = KnowledgeGraphEngine.getStats(session.userId, workspaceId);
    const nodes = KnowledgeGraphEngine.searchNodes(session.userId, workspaceId, "", 20);

    return NextResponse.json({
      success: true,
      stats,
      sampleNodes: nodes,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to query knowledge graph" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
