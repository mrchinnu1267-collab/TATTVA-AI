import { NextResponse } from "next/server";
import { getAdapterById } from "../../../lib/image-engine/customization/adapter-manager";
import { evaluateAdapterQuality } from "../../../lib/image-engine/customization/evaluation";
import { verifyUserSession } from "../../../lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/customization/evaluate
 * Evaluates an adapter's performance against its base model, auditing style consistency,
 * prompt adherence, and overfitting risk.
 */
export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => null);

    if (!body || !body.adapterId) {
      return NextResponse.json(
        { success: false, error: "adapterId is required." },
        { status: 400 }
      );
    }

    const adapter = await getAdapterById(body.adapterId, session.userId);
    if (!adapter) {
      return NextResponse.json(
        { success: false, error: `Adapter '${body.adapterId}' not found or access denied.` },
        { status: 404 }
      );
    }

    const report = await evaluateAdapterQuality(adapter, body.samplePrompts || []);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

