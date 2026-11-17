/**
 * TATTVA AI - Multi-Document Comparison API Route Handler
 * POST /api/documents/compare -> Compares two or more documents, extracts shared themes and contrasts
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { compareMultipleDocuments } from "../../../lib/document-engine/document-comparator";
import { DocumentVault } from "../../../lib/document-engine/document-vault";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const rawDocs = Array.isArray(body.documents) ? body.documents : [];
    const docsToCompare: Array<{ name: string; content: string }> = [];

    for (const d of rawDocs) {
      if (d.id) {
        const rec = DocumentVault.getDocument(session.userId, d.id);
        if (rec) {
          docsToCompare.push({ name: rec.filename, content: rec.extractedText });
        }
      } else if (d.content) {
        docsToCompare.push({ name: d.name || "document.txt", content: String(d.content) });
      }
    }

    if (docsToCompare.length < 2) {
      return NextResponse.json(
        { error: "At least two documents are required for comparative analysis." },
        { status: 400 }
      );
    }

    const comparison = compareMultipleDocuments(docsToCompare);

    return NextResponse.json({
      success: true,
      data: comparison,
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
