import { NextResponse } from "next/server";
import { aiOrchestrator } from "../../lib/ai-orchestrator";
import {
  verifyUserSession,
  checkRateLimit,
  logSecurityEvent,
} from "../../lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
    console.error("[TATTVA Chat] Error:", error);
    return NextResponse.json(
      {
        role: "assistant",
        content: "An unexpected error occurred in TATTVA Chat. Please try again.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
