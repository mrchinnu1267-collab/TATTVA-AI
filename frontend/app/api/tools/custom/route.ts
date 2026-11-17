/**
 * TATTVA AI - Custom AI Tools API Route Handler
 * POST   /api/tools/custom -> Create a custom tool
 * GET    /api/tools/custom -> List user's custom tools
 * DELETE /api/tools/custom -> Delete custom tool
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { CustomToolManager } from "../../../lib/ecosystem/custom-tool-manager";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const tool = CustomToolManager.registerCustomTool(
      session.userId,
      body.workspaceId || "default",
      {
        name: body.name,
        displayName: body.displayName || body.name,
        description: body.description || "Custom AI tool",
        endpointUrl: body.endpointUrl,
        httpMethod: body.httpMethod || "POST",
        authConfig: body.authConfig || { type: "none" },
        inputSchema: body.inputSchema || {},
        outputSchema: body.outputSchema || {},
        permission: body.permission || "safe",
        timeoutMs: body.timeoutMs || 10000,
        rateLimitPerMinute: body.rateLimitPerMinute || 60,
      }
    );

    return NextResponse.json({
      success: true,
      tool,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") || undefined;

    const tools = CustomToolManager.listCustomTools(session.userId, workspaceId);
    return NextResponse.json({
      success: true,
      total: tools.length,
      tools,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const toolId = searchParams.get("toolId");

    if (!toolId) {
      return NextResponse.json({ error: "Missing required parameter: toolId" }, { status: 400 });
    }

    const success = CustomToolManager.deleteCustomTool(session.userId, toolId);
    return NextResponse.json({ success, toolId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
