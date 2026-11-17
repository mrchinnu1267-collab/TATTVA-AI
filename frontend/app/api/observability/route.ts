import { NextRequest, NextResponse } from "next/server";
import { platformObservability } from "@/app/lib/platform/observability";
import { verifyUserSession, checkRateLimit } from "@/app/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await verifyUserSession(req);
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rateCheck = checkRateLimit(`obs_get_${session.userId}_${clientIp}`, 60, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const snapshot = platformObservability.getSnapshot();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      authenticatedUser: session.authenticated ? session.email || session.userId : "anonymous",
      snapshot,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
