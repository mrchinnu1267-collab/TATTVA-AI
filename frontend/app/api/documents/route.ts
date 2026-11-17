/**
 * TATTVA AI - Document Intelligence API Route Handler
 * POST /api/documents -> Upload & ingest document, extract text/tables, classify genre
 * GET  /api/documents -> List user's tenant-isolated documents
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../lib/security";
import { DocumentVault } from "../../lib/document-engine/document-vault";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const contentType = request.headers.get("content-type") || "";

    let filename = "document.txt";
    let buffer: Buffer;
    let mimeType = "application/octet-stream";
    let workspaceId = "default";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "Missing 'file' field in multipart form." }, { status: 400 });
      }
      filename = file.name || "document.bin";
      mimeType = file.type || "application/octet-stream";
      workspaceId = (formData.get("workspaceId") as string) || "default";
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      const body = await request.json().catch(() => ({}));
      if (!body.content && !body.base64) {
        return NextResponse.json({ error: "Missing document content or base64 data." }, { status: 400 });
      }
      filename = body.filename || "document.txt";
      mimeType = body.mimeType || "text/plain";
      workspaceId = body.workspaceId || "default";

      if (body.base64) {
        buffer = Buffer.from(body.base64, "base64");
      } else {
        buffer = Buffer.from(String(body.content), "utf-8");
      }
    }

    const docRecord = await DocumentVault.ingestDocument(
      session.userId,
      workspaceId,
      filename,
      buffer,
      mimeType
    );

    return NextResponse.json({
      success: true,
      document: {
        id: docRecord.id,
        filename: docRecord.filename,
        format: docRecord.format,
        sizeBytes: docRecord.sizeBytes,
        uploadedAt: docRecord.uploadedAt,
        wordCount: docRecord.classification.wordCount,
        category: docRecord.classification.category,
        summary: docRecord.classification.summary,
        tablesCount: docRecord.tables.length,
        hasCodeBlocks: docRecord.classification.hasCodeBlocks,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") || undefined;

    const docs = DocumentVault.listUserDocuments(session.userId, workspaceId);

    return NextResponse.json({
      success: true,
      total: docs.length,
      documents: docs.map((d) => ({
        id: d.id,
        filename: d.filename,
        format: d.format,
        sizeBytes: d.sizeBytes,
        uploadedAt: d.uploadedAt,
        category: d.classification.category,
        wordCount: d.classification.wordCount,
        tablesCount: d.tables.length,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
