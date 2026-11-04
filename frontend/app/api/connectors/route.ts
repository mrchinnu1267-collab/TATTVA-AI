import { NextResponse } from "next/server";
import { verifyUserSession, checkRateLimit, logSecurityEvent } from "@/app/lib/security";
import { mcpConnectorStore } from "@/app/lib/mcp/storage";
import { validateMcpServerUrl } from "@/app/lib/mcp/ssrf-guard";
import { claudeConnectors } from "@/app/lib/mcp/claude-connectors";
import type { McpConnector } from "@/app/lib/mcp/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/connectors
 * Returns all configured Claude MCP connectors for the authenticated user (with secrets scrubbed).
 */
export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rate = checkRateLimit(`mcp_get_${session.userId}_${clientIp}`, 60, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
    }

    const connectors = await mcpConnectorStore.getConnectors(session.userId);
    const sanitized = connectors.map((c) => mcpConnectorStore.sanitizeConnector(c));

    return NextResponse.json({
      success: true,
      connectors: sanitized,
      count: sanitized.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/connectors
 * Adds a new Claude MCP connector with SSRF validation, consent requirement, and AES-256-GCM token encryption.
 */
export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rate = checkRateLimit(`mcp_post_${session.userId}_${clientIp}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait a minute." }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { name, url, authToken, authType = "none", consentGiven, readOnly = false, allowedTools = [], deniedTools = [] } = body;

    // 1. Name validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Connector name is required." }, { status: 400 });
    }
    const cleanName = name.trim().slice(0, 60);

    // 2. SSRF Guard & HTTPS URL validation
    const urlValidation = validateMcpServerUrl(url);
    if (!urlValidation.valid) {
      logSecurityEvent("MCP_SECURITY_BLOCKED", {
        userId: session.userId,
        ip: clientIp,
        endpoint: "/api/connectors",
        details: { url, error: urlValidation.error },
      });
      return NextResponse.json({ error: urlValidation.error }, { status: 400 });
    }

    // 3. Consent check
    if (!consentGiven) {
      return NextResponse.json(
        {
          error:
            "User consent is required before connecting: Claude can access and modify data in this service based on your permissions.",
        },
        { status: 400 }
      );
    }

    // 4. Token encryption at rest
    let encryptedToken;
    let hasToken = false;
    if (authToken && typeof authToken === "string" && authToken.trim().length > 0) {
      const enc = mcpConnectorStore.encryptToken(authToken);
      encryptedToken = enc.encryptedToken;
      hasToken = true;
    }

    // 5. Connectivity verification
    const connCheck = await claudeConnectors.testServerConnection(
      urlValidation.normalizedUrl!,
      authToken
    );

    const status: McpConnector["status"] = connCheck.ok
      ? "connected"
      : connCheck.status === 401 || connCheck.status === 403
      ? "needs_auth"
      : "error";

    const connectorId = `conn_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const newConnector: McpConnector = {
      id: connectorId,
      userId: session.userId,
      name: cleanName,
      url: urlValidation.normalizedUrl!,
      authType: hasToken ? "bearer" : authType,
      hasToken,
      encryptedToken,
      enabled: true,
      readOnly: Boolean(readOnly),
      allowedTools: Array.isArray(allowedTools) ? allowedTools.map(String) : [],
      deniedTools: Array.isArray(deniedTools) ? deniedTools.map(String) : [],
      status,
      lastError: connCheck.error,
      consentGiven: true,
      createdAt: now,
      updatedAt: now,
    };

    await mcpConnectorStore.saveConnector(newConnector);

    logSecurityEvent("MCP_CONNECTOR_EVENT", {
      userId: session.userId,
      ip: clientIp,
      endpoint: "/api/connectors",
      details: { action: "create", id: connectorId, name: cleanName, url: urlValidation.normalizedUrl, status },
    });

    return NextResponse.json({
      success: true,
      connector: mcpConnectorStore.sanitizeConnector(newConnector),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
