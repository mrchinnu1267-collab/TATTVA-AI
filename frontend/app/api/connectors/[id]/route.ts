import { NextResponse } from "next/server";
import { verifyUserSession, checkRateLimit, logSecurityEvent } from "@/app/lib/security";
import { mcpConnectorStore } from "@/app/lib/mcp/storage";
import { validateMcpServerUrl } from "@/app/lib/mcp/ssrf-guard";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/connectors/:id
 * Updates connector preferences: enabled/disabled, readOnly mode, allowedTools, deniedTools.
 */
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyUserSession(request);
    const params = await props.params;
    const connectorId = params.id;

    const existing = await mcpConnectorStore.getConnectorById(session.userId, connectorId);
    if (!existing) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (typeof body.enabled === "boolean") {
      updates.enabled = body.enabled;
    }
    if (typeof body.readOnly === "boolean") {
      updates.readOnly = body.readOnly;
    }
    if (Array.isArray(body.allowedTools)) {
      updates.allowedTools = body.allowedTools.map(String);
    }
    if (Array.isArray(body.deniedTools)) {
      updates.deniedTools = body.deniedTools.map(String);
    }
    if (typeof body.name === "string" && body.name.trim().length > 0) {
      updates.name = body.name.trim().slice(0, 60);
    }
    if (typeof body.authToken === "string") {
      if (body.authToken.trim().length > 0) {
        const enc = mcpConnectorStore.encryptToken(body.authToken);
        updates.encryptedToken = enc.encryptedToken;
        updates.hasToken = true;
        updates.status = "connected";
      } else {
        updates.encryptedToken = undefined;
        updates.hasToken = false;
      }
    }
    if (typeof body.url === "string") {
      const val = validateMcpServerUrl(body.url);
      if (!val.valid) {
        return NextResponse.json({ error: val.error }, { status: 400 });
      }
      updates.url = val.normalizedUrl;
    }

    const updated = await mcpConnectorStore.updateConnector(session.userId, connectorId, updates);
    if (!updated) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      connector: mcpConnectorStore.sanitizeConnector(updated),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/connectors/:id
 * Disconnects and deletes a connector for the user.
 */
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyUserSession(request);
    const params = await props.params;
    const connectorId = params.id;
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const deleted = await mcpConnectorStore.deleteConnector(session.userId, connectorId);
    if (!deleted) {
      return NextResponse.json({ error: "Connector not found or already deleted" }, { status: 404 });
    }

    logSecurityEvent("MCP_CONNECTOR_EVENT", {
      userId: session.userId,
      ip: clientIp,
      endpoint: `/api/connectors/${connectorId}`,
      details: { action: "delete", id: connectorId },
    });

    return NextResponse.json({
      success: true,
      message: "Connector removed successfully",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
