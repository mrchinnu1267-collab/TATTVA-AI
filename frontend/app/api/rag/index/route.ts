import { NextRequest, NextResponse } from "next/server";
import { ragEngine, WorkspaceAccessLevel } from "@/app/lib/ai-orchestrator/rag-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, limit, filterDocId, filterUserId, filterWorkspaceId, userRole } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { success: false, error: "A valid search query string is required" },
        { status: 400 }
      );
    }

    const searchResult = await ragEngine.hybridSearch(
      query,
      limit || 4,
      filterDocId,
      filterUserId,
      filterWorkspaceId,
      userRole as WorkspaceAccessLevel
    );

    return NextResponse.json({
      success: true,
      query: searchResult.query,
      matchedCount: searchResult.matchedChunks.length,
      confidenceScore: searchResult.confidenceScore,
      retrievalMethod: searchResult.retrievalMethod,
      combinedContext: searchResult.combinedContext,
      sources: searchResult.sources,
      citations: searchResult.citations,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute hybrid search" },
      { status: 500 }
    );
  }
}
