import { NextRequest, NextResponse } from "next/server";
import { StorageService } from "@/app/lib/image-engine/services/storage.service";
import { verifyUserSession } from "@/app/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: Retrieves workspace image history or a specific record.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifyUserSession(req);
    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get("id");
    const workspaceId = searchParams.get("workspaceId") || "default";
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    if (imageId) {
      const record = await StorageService.getRecord(imageId);
      if (!record) {
        return NextResponse.json({ error: "Image not found." }, { status: 404 });
      }
      return NextResponse.json({ record });
    }

    const history = await StorageService.listHistory(session.userId, workspaceId, limit);
    return NextResponse.json({ history });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST: Persists a generated or edited image to Supabase Storage / Vault
 * with full prompt, parameters, version tree, and accuracy report.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await verifyUserSession(req);
    const body = await req.json();

    const {
      image,
      prompt,
      originalPrompt,
      provider = "gemini",
      model = "gemini-2.5-flash-image",
      parameters = {},
      accuracyScorecard,
      validatedChecklist,
      parentImageId,
      operation = "generate",
      workspaceId = "default",
    } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "An image data URI is required." }, { status: 400 });
    }
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
    }

    const record = await StorageService.persistImage({
      dataUriOrBuffer: image,
      prompt: prompt.trim(),
      originalPrompt: originalPrompt || prompt.trim(),
      provider,
      model,
      parameters,
      accuracyScorecard,
      validatedChecklist,
      parentImageId,
      operation,
      userId: session.userId,
      workspaceId,
    });

    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE: Deletes an image record.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await verifyUserSession(req);
    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get("id");

    if (!imageId) {
      return NextResponse.json({ error: "Image ID is required." }, { status: 400 });
    }

    const deleted = await StorageService.deleteRecord(imageId, session.userId);
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

