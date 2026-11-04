import { NextResponse } from "next/server";
import { verifyUserSession, checkRateLimit, logSecurityEvent } from "@/app/lib/security";
import { claudeConnectors } from "@/app/lib/mcp/claude-connectors";
import type { ConnectorChatRequest } from "@/app/lib/mcp/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/connectors/chat
 * Sends a chat message to Anthropic Messages API with active Claude MCP connectors attached.
 */
export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    // Rate limiting: 30 connector chat requests per minute per user/ip
    const rate = checkRateLimit(`mcp_chat_${session.userId}_${clientIp}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded for connector chat. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Partial<ConnectorChatRequest>;

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid request: 'messages' array is required." },
        { status: 400 }
      );
    }

    // Sanitize and validate messages
    const validRoles = new Set(["user", "assistant"]);
    for (const msg of body.messages) {
      if (!msg || !validRoles.has(msg.role) || typeof msg.content !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: "Each message must contain a valid 'role' ('user' or 'assistant') and a string 'content'.",
          },
          { status: 400 }
        );
      }
    }

    const chatReq: ConnectorChatRequest = {
      messages: body.messages,
      connectorIds: Array.isArray(body.connectorIds) ? body.connectorIds : undefined,
      model: typeof body.model === "string" ? body.model : "claude-3-5-sonnet-20241022",
      systemPrompt: typeof body.systemPrompt === "string" ? body.systemPrompt : undefined,
      maxTokens: typeof body.maxTokens === "number" ? Math.min(Math.max(body.maxTokens, 1), 8192) : 4096,
      temperature: typeof body.temperature === "number" ? Math.min(Math.max(body.temperature, 0), 1) : 0.7,
    };

    const result = await claudeConnectors.executeChat(session.userId, chatReq);

    logSecurityEvent("MCP_CONNECTOR_EVENT", {
      userId: session.userId,
      ip: clientIp,
      endpoint: "/api/connectors/chat",
      details: {
        action: "chat_execution",
        model: chatReq.model,
        connectorsUsed: chatReq.connectorIds?.length || 0,
        toolCallsCount: result.toolCalls.length,
      },
    });

    return NextResponse.json({
      success: true,
      text: result.text,
      toolCalls: result.toolCalls,
      usage: result.usage,
      stopReason: result.stopReason,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error executing Claude connector chat";
    const statusCode = msg.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return NextResponse.json({ success: false, error: msg }, { status: statusCode });
  }
}
