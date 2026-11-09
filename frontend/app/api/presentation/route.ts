import { NextResponse } from "next/server";
import {
  executePythonOffice,
  validateDocumentBuffer,
  saveGeneratedDocumentToVault,
  validatePptxWithPython,
} from "../../lib/document-engine";
import { verifyUserSession, checkRateLimit } from "../../lib/security";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rateCheck = checkRateLimit(`pres_post_${session.userId}_${clientIp}`, 60, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ success: false, error: "Rate limit exceeded. Please wait a moment." }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.presentation) {
      return NextResponse.json({ success: false, error: "Missing presentation payload." }, { status: 400 });
    }

    const { presentation, action = "save" } = body;
    const title = presentation.title || "TATTVA AI Presentation";
    const subtitle = presentation.subtitle || "";
    const slides = Array.isArray(presentation.slides) ? presentation.slides : [];
    const theme = presentation.theme || {};

    if (slides.length === 0) {
      return NextResponse.json({ success: false, error: "Presentation must contain at least 1 slide." }, { status: 400 });
    }

    // 1. Compile genuine PowerPoint PPTX binary via Python engine
    const pyResult = executePythonOffice("generate_pptx", {
      title,
      subtitle,
      slides,
      theme,
      author: presentation.author || "TATTVA AI Presentation Studio",
      organization: "TATTVA AI",
    });

    if (!pyResult || !pyResult.success || !pyResult.buffer) {
      return NextResponse.json(
        { success: false, error: pyResult?.error || "Failed to compile PowerPoint binary." },
        { status: 500 }
      );
    }

    const buffer = pyResult.buffer;
    const cleanBaseName = `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}_presentation`;
    const filename = `${cleanBaseName}.pptx`;
    const mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

    // 2. Perform deep OpenXML & Python PPTX structure validation
    const validation = validateDocumentBuffer(buffer, "pptx", slides.length);
    const deepPptxVal = validatePptxWithPython(buffer);

    if (!validation.valid || (deepPptxVal.error && !deepPptxVal.valid)) {
      const errorMsg = validation.error || deepPptxVal.error || "Corrupted OpenXML package structure.";
      return NextResponse.json({ success: false, error: errorMsg }, { status: 422 });
    }

    // 3. Save to Supabase Private Storage / Vault
    const userId = session.userId || body.userId || "user_workspace";
    const vault = await saveGeneratedDocumentToVault(buffer, filename, mimeType, userId);

    const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      document: {
        fileId: vault.fileId,
        filename,
        format: "pptx",
        mimeType,
        sizeBytes: buffer.length,
        downloadUrl: vault.signedUrl,
        title,
        slides,
        theme,
        dataUri,
      },
      validation: {
        ...validation,
        deepCheck: deepPptxVal,
      },
      action,
    });
  } catch (error: any) {
    console.error("[Presentation API] Execution error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal presentation synthesis error" },
      { status: 500 }
    );
  }
}
