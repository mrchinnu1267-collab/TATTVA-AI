import { NextResponse } from "next/server";
import { upscaleImage } from "../../../lib/image-engine/upscaler/super-resolution";
import { moderateVisualImage, SAFETY_REJECTION_MESSAGE } from "../../../lib/content-moderation";
import { checkRateLimit, logSecurityEvent, verifyUserSession } from "../../../lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rateCheck = checkRateLimit(`upscale_${session.userId}_${clientIp}`, 10, 60_000);
    if (!rateCheck.allowed) {
      logSecurityEvent("RATE_LIMIT_EXCEEDED", {
        userId: session.userId,
        ip: clientIp,
        endpoint: "/api/image/upscale",
      });
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${rateCheck.resetSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.image !== "string" || !body.image.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid base64 image data URI is required." }, { status: 400 });
    }

    // Safety verification before upscaling
    const visualCheck = await moderateVisualImage(body.image);
    if (!visualCheck.isSafe) {
      return NextResponse.json(
        { error: SAFETY_REJECTION_MESSAGE, safetyViolation: true },
        { status: 400 }
      );
    }

    const scale = body.scale === 4 ? 4 : 2;

    const result = await upscaleImage({
      image: body.image,
      scale,
      enhanceDetails: body.enhanceDetails !== false,
      denoise: body.denoise !== false,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[TATTVA Image Upscaler] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

