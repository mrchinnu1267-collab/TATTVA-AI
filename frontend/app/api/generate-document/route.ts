import { NextResponse } from "next/server";
import {
  detectDocumentIntent,
  synthesizeResearchToFile,
} from "../../lib/document-engine";

export const runtime = "nodejs";

interface GenerateDocumentRequest {
  prompt: string;
  format?: string;
  archetype?: string;
  userId?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  preferences?: Record<string, any>;
  attachmentBase64?: string;
  attachmentFilename?: string;
}

export async function POST(request: Request) {
  try {
    const body: GenerateDocumentRequest = await request.json().catch(() => null);
    if (!body || !body.prompt || body.prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Please enter a topic or document description." },
        { status: 400 }
      );
    }

    const rawPrompt = body.prompt.trim();
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Intelligent Intent Understanding
    const intent = detectDocumentIntent(rawPrompt, {
      history: body.history,
      preferences: body.preferences,
      hasAttachments: Boolean(body.attachmentBase64),
    });

    // Override format or archetype if explicitly provided in request body
    if (body.format) {
      intent.format = body.format.toLowerCase().replace(/^\./, "") as any;
    }
    if (body.archetype) {
      intent.archetype = body.archetype as any;
    }

    // Check if clarification is needed
    if (intent.needsClarification) {
      return NextResponse.json({
        success: false,
        needsClarification: true,
        clarificationQuestion: intent.clarificationQuestion,
      });
    }

    let attachmentBuffer: Buffer | undefined = undefined;
    if (body.attachmentBase64) {
      try {
        const commaIdx = body.attachmentBase64.indexOf(",");
        const cleanB64 = commaIdx > 0 ? body.attachmentBase64.slice(commaIdx + 1) : body.attachmentBase64;
        attachmentBuffer = Buffer.from(cleanB64, "base64");
      } catch (attErr) {
        console.warn("[Generate Document API] Attachment decode notice:", attErr);
      }
    }

    // 2. Autonomous Research, Organization, Synthesis & Validation Pipeline
    const docPackage = await synthesizeResearchToFile(intent, {
      apiKey,
      userId: body.userId,
      attachmentBuffer,
      attachmentFilename: body.attachmentFilename,
    });

    return NextResponse.json({
      success: true,
      document: {
        fileId: docPackage.vault.fileId,
        filename: docPackage.document.filename,
        format: docPackage.document.format,
        mimeType: docPackage.document.mimeType,
        sizeBytes: docPackage.document.sizeBytes,
        downloadUrl: docPackage.vault.signedUrl,
        title: docPackage.intent.topic,
        archetype: docPackage.intent.archetype,
        dataUri: docPackage.document.dataUri,
        summary: docPackage.summary,
        outlineMarkdown: docPackage.outlineMarkdown,
      },
      validation: docPackage.validation,
      progressStages: docPackage.progressStages,
    });
  } catch (error: unknown) {
    console.error("[Generate Document API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Document generation pipeline failed.",
      },
      { status: 500 }
    );
  }
}

