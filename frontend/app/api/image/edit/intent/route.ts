import { NextResponse } from "next/server";
import { classifyEditingIntent } from "../../../../lib/image-engine/editing/intent-classifier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/image/edit/intent
 * Analyzes natural-language instructions to identify editing operations and ambiguity.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || !body.instruction || typeof body.instruction !== "string") {
      return NextResponse.json(
        { success: false, error: "instruction string is required." },
        { status: 400 }
      );
    }

    const intent = classifyEditingIntent(body.instruction);

    return NextResponse.json({
      success: true,
      intent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

