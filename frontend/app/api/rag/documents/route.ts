import { NextRequest, NextResponse } from "next/server";
import { ragEngine } from "@/app/lib/ai-orchestrator/rag-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || undefined;
    const userId = searchParams.get("userId") || undefined;

    const docs = ragEngine.listDocuments(workspaceId, userId);
    return NextResponse.json({
      success: true,
      documents: docs,
      totalCount: docs.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list documents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, documentName, content, workspaceId, userId, accessLevel, format } = body;

    if (!documentName || !content) {
      return NextResponse.json(
        { success: false, error: "documentName and content are required" },
        { status: 400 }
      );
    }

    const docId = documentId || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const chunkCount = await ragEngine.ingestDocument(docId, documentName, content, {
      workspaceId,
      userId,
      accessLevel: accessLevel || "owner",
      format: format || "text",
    });

    return NextResponse.json({
      success: true,
      documentId: docId,
      documentName,
      chunkCount,
      message: `Document indexed successfully with ${chunkCount} chunks.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to ingest document" },
      { status: 500 }
    );
  }
}
