/**
 * TATTVA AI - Developer API v1: Chat Completion Endpoint
 * POST /api/v1/chat
 * Header: Authorization: Bearer tattva_live_...
 * Scope: chat:write
 */

import { NextResponse } from "next/server";
import { ApiKeyManager } from "../../../lib/ecosystem/api-key-manager";
import { aiOrchestrator } from "../../../lib/ai-orchestrator";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const rawKey = authHeader.replace(/^Bearer\s+/i, "").trim();

    const auth = ApiKeyManager.authenticateApiKey(rawKey, "chat:write");
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      return NextResponse.json({ error: "Missing required field: messages array." }, { status: 400 });
    }

    const startTime = Date.now();

    const formattedMessages = messages.map((m: any) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: String(m.content || ""),
    }));

    const result = await aiOrchestrator.processRequest({
      messages: formattedMessages,
      context: {
        userId: auth.apiKey!.userId,
        userEmail: `${auth.apiKey!.userId}@developer.api.tattva.ai`,
        sessionId: `session_api_${auth.apiKey!.id}`,
        workspaceId: auth.apiKey!.workspaceId,
        isAuthenticated: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        reply: result.content,
        model: result.modelUsed || "tattva-gemini-orchestrator",
        durationMs: Date.now() - startTime,
        citations: result.citations || [],
      },
      usage: {
        currentMonthUsage: auth.apiKey!.currentMonthUsage,
        monthlyQuota: auth.apiKey!.monthlyQuota,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
