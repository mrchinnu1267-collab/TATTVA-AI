import { NextResponse } from "next/server";
import { verifyUserSession, checkRateLimit, logSecurityEvent } from "@/app/lib/security";
import { GeminiConnectorService } from "@/app/lib/gemini-connector/gemini-connector-service";
import { GeminiProConsumerAdapter } from "@/app/lib/gemini-connector/gemini-pro-consumer-adapter";
import { GeminiApiAdapter } from "@/app/lib/gemini-connector/gemini-api-adapter";

export const dynamic = "force-dynamic";

/**
 * GET /api/connectors/gemini
 * Returns live status, usage metrics, and policy disclosures for Google Gemini integrations.
 */
export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rate = checkRateLimit(`gemini_conn_get_${session.userId}_${clientIp}`, 60, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
    }

    const consumerAdapter = new GeminiProConsumerAdapter();
    const apiAdapter = new GeminiApiAdapter();

    const [consumerStatus, consumerUsage, apiStatus, apiUsage] = await Promise.all([
      consumerAdapter.connect(),
      consumerAdapter.getUsage(),
      apiAdapter.connect(),
      apiAdapter.getUsage(),
    ]);

    const service = GeminiConnectorService.getInstance();
    const activeMode = service.getProviderMode();

    return NextResponse.json({
      success: true,
      activeMode,
      consumerSubscription: {
        status: consumerStatus,
        usage: consumerUsage,
        policyLimitation:
          "Google does not provide an official API or OAuth endpoint allowing consumer Google AI Pro " +
          "subscriptions to be utilized directly by third-party backends. Kept disabled per Phase 10 rules.",
      },
      developerApi: {
        status: apiStatus,
        usage: apiUsage,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/connectors/gemini
 * Manages connector operations: "switch_mode" or "disconnect".
 */
export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rate = checkRateLimit(`gemini_conn_post_${session.userId}_${clientIp}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait a minute." }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, mode } = body;

    const service = GeminiConnectorService.getInstance();

    if (action === "switch_mode") {
      if (mode !== "consumer_subscription" && mode !== "developer_api") {
        return NextResponse.json({ error: "Invalid provider mode" }, { status: 400 });
      }

      service.setProviderMode(mode);
      const status = await service.getStatus();
      const usage = await service.getUsage();

      logSecurityEvent("AUTH_SUCCESS", {
        userId: session.userId,
        ip: clientIp,
        endpoint: "/api/connectors/gemini [switch_mode]",
        details: { targetMode: mode, isConnected: status.isConnected },
      });

      return NextResponse.json({
        success: true,
        activeMode: mode,
        status,
        usage,
      });
    }

    if (action === "disconnect") {
      await service.disconnect();
      return NextResponse.json({ success: true, message: "Disconnected successfully." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
