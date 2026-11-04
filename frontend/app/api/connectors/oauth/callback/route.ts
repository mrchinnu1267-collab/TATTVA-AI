import { NextResponse } from "next/server";
import { verifyUserSession, logSecurityEvent, encryptAES256GCM } from "@/app/lib/security";
import { mcpConnectorStore } from "@/app/lib/mcp/storage";

export const dynamic = "force-dynamic";

/**
 * GET & POST /api/connectors/oauth/callback
 * Handles OAuth callback for third-party MCP servers that require OAuth2 authentication.
 */
async function handleOAuthCallback(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    let code: string | null = null;
    let state: string | null = null;
    let error: string | null = null;
    let connectorId: string | null = null;

    if (request.method === "GET") {
      const { searchParams } = new URL(request.url);
      code = searchParams.get("code");
      state = searchParams.get("state");
      error = searchParams.get("error");
      connectorId = searchParams.get("connector_id");
    } else {
      const body = await request.json().catch(() => ({}));
      code = body.code || null;
      state = body.state || null;
      error = body.error || null;
      connectorId = body.connector_id || null;
    }

    if (error) {
      logSecurityEvent("MCP_SECURITY_BLOCKED", {
        userId: session.userId,
        ip: clientIp,
        endpoint: "/api/connectors/oauth/callback",
        details: { action: "oauth_failure", error },
      });
      return NextResponse.redirect(
        new URL(`/chat?mcp_oauth_error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.json({ success: false, error: "Missing authorization code" }, { status: 400 });
    }

    // Identify connector from state or query parameter
    const targetConnectorId = connectorId || (state ? state.split(":")[0] : null);
    if (!targetConnectorId) {
      return NextResponse.json({ success: false, error: "Missing connector target identifier in state" }, { status: 400 });
    }

    const connector = await mcpConnectorStore.getConnector(session.userId, targetConnectorId);
    if (!connector) {
      return NextResponse.json({ success: false, error: "Target connector not found" }, { status: 404 });
    }

    if (!connector.oauth?.tokenEndpoint) {
      return NextResponse.json({ success: false, error: "Connector does not have OAuth configured" }, { status: 400 });
    }

    // Exchange code for access & refresh tokens at provider token endpoint
    const tokenRes = await fetch(connector.oauth.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: connector.oauth.clientId || "",
        redirect_uri: `${new URL(request.url).origin}/api/connectors/oauth/callback`,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => "Unknown error");
      return NextResponse.json(
        { success: false, error: `Token exchange failed: ${errText}` },
        { status: 502 }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    if (!accessToken) {
      return NextResponse.json({ success: false, error: "No access token returned by provider" }, { status: 502 });
    }

    // Encrypt tokens at rest
    const { encryptedToken } = mcpConnectorStore.encryptToken(accessToken);
    const refreshTokenEncrypted = refreshToken ? encryptAES256GCM(refreshToken) : undefined;

    await mcpConnectorStore.updateConnector(session.userId, connector.id, {
      encryptedToken,
      hasToken: true,
      status: "connected",
      errorMessage: undefined,
      oauth: {
        ...connector.oauth,
        refreshTokenEncrypted,
        expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      },
    });

    logSecurityEvent("MCP_CONNECTOR_EVENT", {
      userId: session.userId,
      ip: clientIp,
      endpoint: "/api/connectors/oauth/callback",
      details: { action: "oauth_success", connectorId: connector.id },
    });

    // If browser GET navigation, redirect back to Settings > Connectors in Chat
    if (request.method === "GET") {
      return NextResponse.redirect(
        new URL(`/chat?tab=settings&section=connectors&mcp_connected=${encodeURIComponent(connector.name)}`, request.url)
      );
    }

    return NextResponse.json({
      success: true,
      message: `Connector ${connector.name} authenticated successfully`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error handling OAuth callback";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleOAuthCallback(request);
}

export async function POST(request: Request) {
  return handleOAuthCallback(request);
}
