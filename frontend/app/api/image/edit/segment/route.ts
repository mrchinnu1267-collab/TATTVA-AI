import { NextResponse } from "next/server";
import { autoSegmentSubject, invertMask } from "../../../../lib/image-engine/editing/mask-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/image/edit/segment
 * Automatically generates a subject segmentation mask.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const width = Number(body?.width) || 1024;
    const height = Number(body?.height) || 1024;
    const query = typeof body?.query === "string" ? body.query : undefined;
    const invert = Boolean(body?.invert);

    let mask = autoSegmentSubject(width, height, query);
    if (invert) {
      mask = invertMask(mask);
    }

    return NextResponse.json({
      success: true,
      mask,
      width,
      height,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

