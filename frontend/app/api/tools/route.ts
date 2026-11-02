import { NextResponse } from "next/server";
import { toolRegistry } from "../../lib/ai-orchestrator/tools/tool-registry";
import { verifyUserSession, checkRateLimit } from "../../lib/security";

export const runtime = "nodejs";

export async function GET() {
  const tools = toolRegistry.getToolManifest();
  return NextResponse.json({
    success: true,
    totalTools: tools.length,
    tools,
  });
}

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => null);

    if (!body || !body.toolName) {
      return NextResponse.json({ error: "toolName is required." }, { status: 400 });
    }

    const rateCheck = checkRateLimit(`tool_${session.userId}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Tool execution rate limit exceeded." }, { status: 429 });
    }

    const result = await toolRegistry.executeTool(
      body.toolName,
      body.parameters || {},
      {
        userId: session.userId,
        userEmail: session.email || "guest_user",
        conversationHistory: body.history,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
