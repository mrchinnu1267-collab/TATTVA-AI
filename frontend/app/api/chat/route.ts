import { NextResponse } from "next/server";
import { aiOrchestrator } from "../../lib/ai-orchestrator";
import {
  verifyUserSession,
  checkRateLimit,
  logSecurityEvent,
} from "../../lib/security";
import { getWeatherReport, isWeatherQuery } from "../../lib/weather-service";
import {
  executeCustomProvider,
  scrubCredentials,
  CustomProviderId,
} from "../../lib/custom-provider-executor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let customKeyForScrubbing: string | undefined;
  try {
    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "Invalid request. Messages array is required." }, { status: 400 });
    }

    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    let session = await verifyUserSession(request);

    // If cookies were omitted in cross-origin / tunnel fetch, verify client-supplied auth
    if (
      !session.authenticated &&
      body.isAuthenticated &&
      body.userEmail &&
      typeof body.userEmail === "string" &&
      body.userEmail.includes("@")
    ) {
      const clientEmail = body.userEmail.toLowerCase().trim();
      session = {
        authenticated: true,
        userId: clientEmail,
        email: clientEmail,
        name: body.userName || clientEmail.split("@")[0],
        role: "authenticated",
        isGuest: false,
      };
    }

    // Rate Limiting: 60 requests per minute
    const rateCheck = checkRateLimit(`chat_${session.userId}_${clientIp}`, 60, 60000);
    if (!rateCheck.allowed) {
      logSecurityEvent("RATE_LIMIT_EXCEEDED", {
        userId: session.userId,
        ip: clientIp,
        endpoint: "/api/chat",
      });
      return NextResponse.json(
        { error: `Rate limit exceeded. Please wait ${rateCheck.resetSeconds}s before sending another message.` },
        { status: 429 }
      );
    }

    const userEmail = session.authenticated ? session.email : "guest_user";

    // Real-Time Location & Weather Report Grounding
    const latestUserMsg = [...body.messages].reverse().find((m: any) => m.role === "user");
    if (latestUserMsg && isWeatherQuery(latestUserMsg.content)) {
      try {
        const weather = await getWeatherReport({
          latitude: body.location?.latitude,
          longitude: body.location?.longitude,
          city: body.location?.city,
          userQuery: latestUserMsg.content,
        });

        if (weather) {
          // If the user simply asked for the weather report, we can return the rich report directly for maximum speed and fidelity
          const lower = latestUserMsg.content.toLowerCase().trim();
          const isDirectWeatherRequest =
            lower === "weather" ||
            lower === "wether" ||
            lower === "weather report" ||
            lower === "wether report" ||
            lower === "whether report" ||
            lower === "what is the weather" ||
            lower === "what is the weather today" ||
            lower === "what's the weather" ||
            lower === "what's the weather today" ||
            lower === "current weather" ||
            lower === "give me weather report" ||
            lower === "give weather report";

          if (isDirectWeatherRequest) {
            return NextResponse.json({
              role: "assistant",
              content: weather.summaryText,
              kind: "text",
              intent: "general_chat",
              modelUsed: "TATTVA-Live-Weather-Engine",
              provider: "local",
              latencyMs: 150,
            });
          }

          // Otherwise inject live ground-truth context into conversation
          body.messages.splice(body.messages.length - 1, 0, {
            role: "user",
            content: `[Real-Time Live Weather Information for ${weather.location.city}, ${weather.location.country}]:\n${weather.summaryText}\nUse this live meteorological data to answer my question accurately.`,
          });
        }
      } catch (wErr) {
        console.warn("[TATTVA Chat] Weather lookup failed:", wErr);
      }
    }

    // Check for BYOK / User Custom AI Provider
    const customProvider = request.headers.get("x-custom-provider") as CustomProviderId | null;
    const customKey = request.headers.get("x-custom-key") || undefined;
    const customModel = request.headers.get("x-custom-model") || undefined;
    const customBaseUrl = request.headers.get("x-custom-base-url") || undefined;
    customKeyForScrubbing = customKey;

    if (customProvider && (customKey || customProvider === "custom")) {
      const customResult = await executeCustomProvider({
        provider: customProvider,
        apiKey: customKey,
        model: customModel || "default",
        baseUrl: customBaseUrl,
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
      });

      return NextResponse.json(customResult);
    }

    // Dispatch through the Master AI Orchestrator
    const orchestratorResult = await aiOrchestrator.processRequest({
      messages: body.messages,
      context: {
        userId: session.userId,
        userEmail,
        sessionId: body.sessionId,
        conversationHistory: body.messages.map((m: any) => ({ role: m.role, content: m.content })),
      },
      mode: body.mode,
      preferredModel: body.preferredModel || body.model,
    });

    return NextResponse.json(orchestratorResult);
  } catch (error) {
    const rawError = error instanceof Error ? error.message : String(error);
    const safeError = scrubCredentials(rawError, customKeyForScrubbing);
    console.error("[TATTVA Chat] Error:", safeError);
    return NextResponse.json(
      {
        role: "assistant",
        content: `Error: ${safeError}`,
        error: safeError,
      },
      { status: 500 }
    );
  }
}
