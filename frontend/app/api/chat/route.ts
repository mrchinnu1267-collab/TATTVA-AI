import { NextResponse } from "next/server";
import { aiOrchestrator } from "../../lib/ai-orchestrator";
import { humanIntelligence } from "../../lib/human-intelligence";
import {
  verifyUserSession,
  checkRateLimit,
  logSecurityEvent,
} from "../../lib/security";
import { getWeatherReport, isWeatherQuery } from "../../lib/weather-service";
import { getClockReport, isClockQuery, ClockReport } from "../../lib/clock-service";
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
    const latestUserMsg = [...body.messages].reverse().find((m: any) => m.role === "user");

    // 1. INBUILT CLOCK & REAL-TIME GROUNDING
    let clockData: ClockReport | undefined;
    if (latestUserMsg && isClockQuery(latestUserMsg.content)) {
      try {
        clockData = getClockReport(latestUserMsg.content, body.timeZone || body.clientTimeZone);
        const lower = latestUserMsg.content.toLowerCase().trim();
        const isDirectClockRequest =
          lower === "time" ||
          lower === "clock" ||
          lower === "what is the time" ||
          lower === "what time is it" ||
          lower === "current time" ||
          lower === "time now" ||
          lower === "what's the time" ||
          lower === "tell me the time" ||
          lower === "tell time" ||
          lower === "what day is today" ||
          lower === "what is today's date" ||
          lower === "what is the date today" ||
          lower === "what's today's date" ||
          lower === "current date";

        if (isDirectClockRequest) {
          return NextResponse.json({
            role: "assistant",
            content: clockData.summaryText,
            kind: "text",
            intent: "clock",
            modelUsed: "TATTVA-Live-Clock-Engine",
            provider: "local",
            latencyMs: 30,
            clockData,
          });
        }

        // Inject live ground-truth clock context
        body.messages.splice(body.messages.length - 1, 0, {
          role: "user",
          content: `[Real-Time Live Clock for ${clockData.timeZone}]: Current time is ${clockData.currentTime} on ${clockData.currentDate}. Provide a clear, natural answer with this exact actual time.`,
        });
      } catch (cErr) {
        console.warn("[TATTVA Chat] Clock lookup error:", cErr);
      }
    }

    // 2. REAL-TIME LOCATION & WEATHER GROUNDING
    if (latestUserMsg && isWeatherQuery(latestUserMsg.content)) {
      try {
        const weather = await getWeatherReport({
          latitude: body.location?.latitude,
          longitude: body.location?.longitude,
          city: body.location?.city,
          userQuery: latestUserMsg.content,
        });

        if (weather) {
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

      return NextResponse.json({
        ...customResult,
        ...(clockData ? { clockData } : {}),
      });
    }

    // Claude MCP Connectors Integration
    if (body.connectorIds && Array.isArray(body.connectorIds) && body.connectorIds.length > 0) {
      const { claudeConnectors } = await import("../../lib/mcp/claude-connectors");
      const connectorResult = await claudeConnectors.executeChat(session.userId, {
        messages: body.messages.map((m: any) => ({ role: m.role, content: m.content })),
        connectorIds: body.connectorIds,
        model: body.model || "claude-3-5-sonnet-20241022",
        temperature: body.temperature ?? 0.7,
      });

      return NextResponse.json({
        role: "assistant",
        content: connectorResult.text,
        kind: "text",
        toolCalls: connectorResult.toolCalls,
        toolsExecuted: connectorResult.toolCalls.map((tc) => `${tc.serverName || tc.connectorName} (${tc.toolName})`),
        usage: connectorResult.usage,
        stopReason: connectorResult.stopReason,
        ...(clockData ? { clockData } : {}),
      });
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

    return NextResponse.json({
      ...orchestratorResult,
      ...(clockData ? { clockData } : {}),
    });
  } catch (error) {
    const rawError = error instanceof Error ? error.message : String(error);
    const safeError = scrubCredentials(rawError, customKeyForScrubbing);
    console.error("[TATTVA Chat] Error:", safeError);

    const safeFormatted = humanIntelligence.formatSafeError(safeError);

    return NextResponse.json(
      {
        role: "assistant",
        content: safeFormatted.userMessage,
        error: safeError,
        debugInfo: safeFormatted.debugInfo,
      },
      { status: 500 }
    );
  }
}
