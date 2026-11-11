import { NextResponse } from "next/server";
import {
  listAdapters,
  getAdapterById,
  setAdapterActiveStatus,
  deleteAdapter,
  registerTrainedAdapter,
} from "../../../lib/image-engine/customization/adapter-manager";
import { verifyUserSession } from "../../../lib/security";
import { CustomizationCategory, FineTuningBaseModelId } from "../../../lib/image-engine/customization/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/customization/adapters
 * Lists all adapters available to the authenticated user or workspace.
 */
export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category") as CustomizationCategory | null;
    const baseModel = searchParams.get("baseModel") as FineTuningBaseModelId | null;
    const activeOnly = searchParams.get("activeOnly") === "true";

    const adapters = await listAdapters({
      userId: session.userId,
      workspaceId: session.workspaceId,
      category: category || undefined,
      baseModel: baseModel || undefined,
    });

    const filtered = activeOnly ? adapters.filter((a) => a.isActive) : adapters;

    return NextResponse.json({
      success: true,
      adapters: filtered,
      count: filtered.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/customization/adapters
 * Registers or imports a pre-existing LoRA adapter.
 */
export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => null);

    if (!body || !body.name || !body.baseModel || !body.triggerWord) {
      return NextResponse.json(
        { success: false, error: "Missing required adapter registration fields (name, baseModel, triggerWord)." },
        { status: 400 }
      );
    }

    const weightsBase64 = body.weightsBase64;
    const weightsBuffer = weightsBase64
      ? Buffer.from(weightsBase64, "base64")
      : Buffer.alloc(1024); // Synthetic placeholder weights

    const adapter = await registerTrainedAdapter({
      name: body.name,
      version: body.version || "1.0.0",
      baseModel: body.baseModel,
      category: body.category || "artistic_style",
      triggerWord: body.triggerWord,
      weightsBuffer,
      rank: body.rank || 16,
      alpha: body.alpha || 16,
      scale: body.scale ?? 0.8,
      lossHistory: body.lossHistory || [{ step: 500, loss: 0.08 }],
      userId: session.userId,
      workspaceId: session.workspaceId || "default_workspace",
      datasetManifestId: body.datasetManifestId || "imported_manifest",
    });

    return NextResponse.json({
      success: true,
      adapter,
      message: `Adapter '${adapter.name}' successfully registered.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

/**
 * PATCH /api/customization/adapters
 * Toggles an adapter's active state or adjusts its influence scale.
 */
export async function PATCH(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => null);

    if (!body || !body.adapterId) {
      return NextResponse.json(
        { success: false, error: "adapterId is required." },
        { status: 400 }
      );
    }

    const adapter = await setAdapterActiveStatus(
      body.adapterId,
      session.userId,
      typeof body.isActive === "boolean" ? body.isActive : true,
      typeof body.scale === "number" ? body.scale : undefined
    );

    return NextResponse.json({
      success: true,
      adapter,
      message: `Adapter '${adapter.name}' status updated.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

/**
 * DELETE /api/customization/adapters
 * Deletes an adapter and cleans up stored weights.
 */
export async function DELETE(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const adapterId = searchParams.get("adapterId");

    if (!adapterId) {
      return NextResponse.json(
        { success: false, error: "adapterId parameter is required." },
        { status: 400 }
      );
    }

    const deleted = await deleteAdapter(adapterId, session.userId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: `Adapter '${adapterId}' not found or access denied.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Adapter '${adapterId}' deleted successfully.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

