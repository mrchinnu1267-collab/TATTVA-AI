import { mcpConnectorStore } from "./storage";
import { validateMcpServerUrl } from "./ssrf-guard";
import type {
  McpConnector,
  AnthropicMcpServerConfig,
  AnthropicMcpToolsetConfig,
  ConnectorChatRequest,
  ToolCallExecutionRecord,
} from "./types";

const MUTATIVE_TOOL_KEYWORDS = [
  "delete",
  "remove",
  "drop",
  "destroy",
  "write",
  "create",
  "insert",
  "update",
  "patch",
  "execute",
  "exec",
  "post",
  "kill",
  "stop",
];

export interface ClaudeConnectorChatResult {
  text: string;
  toolCalls: ToolCallExecutionRecord[];
  stopReason?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

export class ClaudeConnectorsService {
  private static instance: ClaudeConnectorsService;

  private constructor() {}

  public static getInstance(): ClaudeConnectorsService {
    if (!ClaudeConnectorsService.instance) {
      ClaudeConnectorsService.instance = new ClaudeConnectorsService();
    }
    return ClaudeConnectorsService.instance;
  }

  /**
   * Sanitizes an MCP server name according to Anthropic naming rules:
   * 1-64 characters, alphanumeric and underscore/hyphen.
   */
  public sanitizeServerName(rawName: string): string {
    const cleaned = rawName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .slice(0, 60);
    return cleaned || "mcp_server";
  }

  /**
   * Tests connectivity to an external remote MCP server endpoint.
   */
  public async testServerConnection(
    url: string,
    authToken?: string
  ): Promise<{ ok: boolean; status?: number; error?: string }> {
    const val = validateMcpServerUrl(url);
    if (!val.valid) {
      return { ok: false, error: val.error };
    }

    try {
      const headers: Record<string, string> = {
        Accept: "text/event-stream, application/json, text/plain",
      };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken.trim()}`;
      }

      const res = await fetch(val.normalizedUrl!, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(7000),
      });

      if (res.status === 401 || res.status === 403) {
        return { ok: false, status: res.status, error: "Authentication failed. Token is missing or invalid." };
      }

      // MCP SSE or HTTP endpoints typically respond with 200, 204, or 405 (if POST only)
      if (res.status >= 200 && res.status < 500) {
        return { ok: true, status: res.status };
      }

      return { ok: false, status: res.status, error: `Server returned HTTP ${res.status}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection timeout or host unreachable";
      return { ok: false, error: msg };
    }
  }

  /**
   * Refreshes OAuth token for an MCP connector if expired or expiring soon.
   */
  public async refreshOAuthTokenIfNeeded(userId: string, connector: McpConnector): Promise<string | undefined> {
    const oauth = connector.oauth;
    if (!oauth || !oauth.tokenEndpoint || !oauth.refreshTokenEncrypted) {
      return mcpConnectorStore.decryptToken(connector);
    }

    const now = Date.now();
    // If token exists and hasn't expired within next 60 seconds, use current
    if (oauth.expiresAt && oauth.expiresAt > now + 60_000) {
      return mcpConnectorStore.decryptToken(connector);
    }

    try {
      const { decryptAES256GCM } = await import("../security");
      const refreshToken = decryptAES256GCM(oauth.refreshTokenEncrypted);

      const res = await fetch(oauth.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: oauth.clientId || "",
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const tokenData = await res.json();
        if (tokenData.access_token) {
          const { encryptedToken } = mcpConnectorStore.encryptToken(tokenData.access_token);
          await mcpConnectorStore.updateConnector(userId, connector.id, {
            encryptedToken,
            hasToken: true,
            status: "connected",
            oauth: {
              ...oauth,
              expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
            },
          });
          return tokenData.access_token;
        }
      }
    } catch (e) {
      console.warn(`[MCP OAuth] Failed to refresh token for connector ${connector.id}:`, e);
    }

    return mcpConnectorStore.decryptToken(connector);
  }

  /**
   * Evaluates if a tool invocation is permitted under user connector policies.
   */
  public isToolAllowed(connector: McpConnector, toolName: string): boolean {
    const lower = toolName.toLowerCase();

    // 1. Explicit deny list
    if (connector.deniedTools && connector.deniedTools.some((d) => d.toLowerCase() === lower)) {
      return false;
    }

    // 2. Read-only guard: block mutative actions
    if (connector.readOnly) {
      if (MUTATIVE_TOOL_KEYWORDS.some((kw) => lower.includes(kw))) {
        return false;
      }
    }

    // 3. Explicit allow list: if defined and non-empty, tool must be in list
    if (connector.allowedTools && connector.allowedTools.length > 0) {
      return connector.allowedTools.some((a) => a.toLowerCase() === lower);
    }

    return true;
  }

  /**
   * Executes chat with user's enabled Claude Connectors via Anthropic Messages API.
   */
  public async executeChat(
    userId: string,
    req: ConnectorChatRequest
  ): Promise<ClaudeConnectorChatResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY || "";
    if (!apiKey.trim()) {
      throw new Error(
        "ANTHROPIC_API_KEY is not configured on the server. Please add ANTHROPIC_API_KEY to your environment variables."
      );
    }

    // 1. Retrieve all user connectors
    const allConnectors = await mcpConnectorStore.getConnectors(userId);

    // 2. Filter enabled connectors (or specific IDs if requested in conversation)
    let activeConnectors = allConnectors.filter((c) => c.enabled);
    if (req.connectorIds && req.connectorIds.length > 0) {
      const requestedSet = new Set(req.connectorIds);
      activeConnectors = activeConnectors.filter((c) => requestedSet.has(c.id));
    }

    // 3. Prepare mcp_servers and matching tools arrays
    const mcpServers: AnthropicMcpServerConfig[] = [];
    const tools: AnthropicMcpToolsetConfig[] = [];
    const connectorMap = new Map<string, McpConnector>();

    for (const conn of activeConnectors) {
      const serverName = this.sanitizeServerName(conn.name);
      const token = await this.refreshOAuthTokenIfNeeded(userId, conn);

      mcpServers.push({
        type: "url",
        name: serverName,
        url: conn.url,
        ...(token ? { authorization_token: token } : {}),
      });

      tools.push({
        type: "mcp_toolset",
        mcp_server_name: serverName,
      });

      connectorMap.set(serverName, conn);
    }

    // 4. Beta Header
    const betaHeader = process.env.ANTHROPIC_MCP_BETA_HEADER || "mcp-client-2025-11-20";
    const model = req.model || "claude-3-5-sonnet-20241022";

    // 5. Build Anthropic Messages API Payload
    const payload: Record<string, unknown> = {
      model,
      max_tokens: req.maxTokens || 4096,
      temperature: req.temperature ?? 0.7,
      messages: req.messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    };

    if (mcpServers.length > 0) {
      payload.mcp_servers = mcpServers;
      payload.tools = tools;
    }

    // 6. Execute server-side call
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
        "anthropic-beta": betaHeader,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000), // 60s timeout for remote tool execution
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 401) {
        throw new Error("Anthropic API Authentication Error: Invalid ANTHROPIC_API_KEY.");
      }
      if (res.status === 429) {
        throw new Error("Anthropic API Rate Limit Exceeded. Please retry in a few moments.");
      }
      throw new Error(`Anthropic Messages API Error (${res.status}): ${errText.slice(0, 500)}`);
    }

    const data = await res.json();
    const toolCalls: ToolCallExecutionRecord[] = [];
    let text = "";

    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === "text") {
          text += block.text || "";
        } else if (block.type === "tool_use" || block.type === "mcp_tool_use") {
          const rawServer = block.mcp_server_name || "connector";
          const rawTool = block.name || "tool";
          const conn = connectorMap.get(rawServer);

          // Policy audit
          const isAllowed = conn ? this.isToolAllowed(conn, rawTool) : true;

          toolCalls.push({
            connectorName: conn?.name || rawServer,
            toolName: rawTool,
            input: block.input,
            status: isAllowed ? "completed" : "denied",
          });
        }
      }
    }

    return {
      text,
      toolCalls,
      stopReason: data.stop_reason,
      usage: {
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
      },
    };
  }
}

export const claudeConnectors = ClaudeConnectorsService.getInstance();
