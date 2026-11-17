/**
 * TATTVA AI - Plugin System API Route Handler
 * GET  /api/plugins -> List available catalog plugins and activation state
 * POST /api/plugins -> Enable/disable plugin or execute plugin tool
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../lib/security";
import { PluginSystem } from "../../lib/ecosystem/plugin-system";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const plugins = PluginSystem.listPlugins(session.userId);

    return NextResponse.json({
      success: true,
      total: plugins.length,
      plugins,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));
    const action = body.action || "enable";

    if (action === "enable") {
      const pluginId = String(body.pluginId || "");
      const res = PluginSystem.enablePlugin(session.userId, pluginId);
      return NextResponse.json(res);
    }

    if (action === "disable") {
      const pluginId = String(body.pluginId || "");
      const res = PluginSystem.disablePlugin(session.userId, pluginId);
      return NextResponse.json({ success: res, pluginId });
    }

    if (action === "execute") {
      const { pluginId, toolName, parameters = {}, workspaceId = "default" } = body;
      const res = await PluginSystem.executePluginTool(
        session.userId,
        workspaceId,
        pluginId,
        toolName,
        parameters
      );
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
