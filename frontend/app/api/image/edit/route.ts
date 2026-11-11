import { NextResponse } from "next/server";
import { executeImageEdit } from "../../../lib/image-engine/editing/inpainting-engine";
import { getEditHistory, deleteSnapshot } from "../../../lib/image-engine/editing/history-manager";
import { verifyUserSession } from "../../../lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/image/edit
 * Retrieves version history snapshots for the authenticated user.
 */
export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") || session.workspaceId;

    const history = getEditHistory(session.userId, workspaceId);

    return NextResponse.json({
      success: true,
      history,
      count: history.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/image/edit
 * Executes an image editing, inpainting, outpainting, or background operation.
 */
export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => null);

    if (!body || !body.image) {
      return NextResponse.json(
        { success: false, error: "Base image (as Data URI or URL) is required." },
        { status: 400 }
      );
    }

    if (!body.instruction || typeof body.instruction !== "string" || !body.instruction.trim()) {
      return NextResponse.json(
        { success: false, error: "Natural-language editing instruction is required." },
        { status: 400 }
      );
    }

    const result = await executeImageEdit({
      image: body.image,
      instruction: body.instruction.trim(),
      operation: body.operation,
      mask: body.mask,
      expand: body.expand,
      maskOptions: body.maskOptions,
      quality: body.quality,
      provider: body.provider,
      userId: session.userId,
      workspaceId: session.workspaceId || "default_workspace",
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/image/edit?snapshotId=xxx
 * Deletes a specific edit history revision.
 */
export async function DELETE(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const snapshotId = searchParams.get("snapshotId");

    if (!snapshotId) {
      return NextResponse.json(
        { success: false, error: "snapshotId parameter is required." },
        { status: 400 }
      );
    }

    const deleted = deleteSnapshot(snapshotId, session.userId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: `Snapshot '${snapshotId}' not found or access denied.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Snapshot '${snapshotId}' deleted successfully.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

