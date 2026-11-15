import { NextRequest, NextResponse } from "next/server";
import { ragEngine } from "@/app/lib/ai-orchestrator/rag-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, workspaceId } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: "documentId is required" },
        { status: 400 }
      );
    }

    const deleted = ragEngine.deleteDocument(documentId, workspaceId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Document not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Document ${documentId} deleted successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete document" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  return POST(req);
}
