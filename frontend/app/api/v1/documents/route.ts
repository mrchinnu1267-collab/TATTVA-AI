/**
 * TATTVA AI - Developer API v1: Document Ingestion Endpoint
 * POST /api/v1/documents
 * Scope: documents:write
 */

import { NextResponse } from "next/server";
import { ApiKeyManager } from "../../../lib/ecosystem/api-key-manager";
import { DocumentVault } from "../../../lib/document-engine/document-vault";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const rawKey = authHeader.replace(/^Bearer\s+/i, "").trim();

    const auth = ApiKeyManager.authenticateApiKey(rawKey, "documents:write");
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    if (!body.content && !body.base64) {
      return NextResponse.json({ error: "Missing document content." }, { status: 400 });
    }

    const filename = body.filename || "developer_document.txt";
    const mimeType = body.mimeType || "text/plain";
    const buffer = body.base64 ? Buffer.from(body.base64, "base64") : Buffer.from(String(body.content), "utf-8");

    const record = await DocumentVault.ingestDocument(
      auth.apiKey!.userId,
      auth.apiKey!.workspaceId,
      filename,
      buffer,
      mimeType
    );

    return NextResponse.json({
      success: true,
      document: {
        id: record.id,
        filename: record.filename,
        format: record.format,
        sizeBytes: record.sizeBytes,
        uploadedAt: record.uploadedAt,
        category: record.classification.category,
        summary: record.classification.summary,
        tablesCount: record.tables.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
