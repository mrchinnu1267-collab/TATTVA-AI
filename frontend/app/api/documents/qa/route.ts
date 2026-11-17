/**
 * TATTVA AI - Document Question Answering API Route Handler
 * POST /api/documents/qa -> Answers questions grounded strictly in document passages with citations
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { answerQuestionFromDocuments } from "../../../lib/document-engine/document-qa-engine";
import { DocumentVault } from "../../../lib/document-engine/document-vault";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) {
      return NextResponse.json({ error: "Missing required parameter: question" }, { status: 400 });
    }

    const docsToQuery: Array<{ name: string; content: string }> = [];

    // Support 1: Document ID from tenant vault
    if (body.documentId) {
      const docRecord = DocumentVault.getDocument(session.userId, body.documentId);
      if (!docRecord) {
        return NextResponse.json(
          { error: "Document not found or access unauthorized for this tenant." },
          { status: 404 }
        );
      }
      docsToQuery.push({ name: docRecord.filename, content: docRecord.extractedText });
    }

    // Support 2: Direct document text or multiple documents array
    if (body.documentText) {
      docsToQuery.push({ name: body.documentName || "provided_document.txt", content: String(body.documentText) });
    }

    if (Array.isArray(body.documents)) {
      for (const d of body.documents) {
        if (d.id) {
          const rec = DocumentVault.getDocument(session.userId, d.id);
          if (rec) docsToQuery.push({ name: rec.filename, content: rec.extractedText });
        } else if (d.content) {
          docsToQuery.push({ name: d.name || "document.txt", content: String(d.content) });
        }
      }
    }

    if (docsToQuery.length === 0) {
      return NextResponse.json(
        { error: "No document specified. Provide 'documentId', 'documentText', or 'documents'." },
        { status: 400 }
      );
    }

    const response = answerQuestionFromDocuments(question, docsToQuery);

    return NextResponse.json({
      success: true,
      data: response,
      tenant: {
        userId: session.userId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
