import { encryptAES256GCM, decryptAES256GCM } from "../security";
import type { McpConnector, PublicMcpConnector } from "./types";

/**
 * In-memory / persistent isolated storage for Claude MCP Connectors
 * Stores connectors partitioned per authenticated userId.
 * Tokens are encrypted at rest using authenticated AES-256-GCM.
 */
class McpConnectorStore {
  private static instance: McpConnectorStore;
  // Map of userId -> Map of connectorId -> McpConnector
  private userStore = new Map<string, Map<string, McpConnector>>();

  private constructor() {}

  public static getInstance(): McpConnectorStore {
    if (!McpConnectorStore.instance) {
      McpConnectorStore.instance = new McpConnectorStore();
    }
    return McpConnectorStore.instance;
  }

  private getUserMap(userId: string): Map<string, McpConnector> {
    const normUser = (userId || "default_user").toLowerCase().trim();
    let map = this.userStore.get(normUser);
    if (!map) {
      map = new Map<string, McpConnector>();
      this.userStore.set(normUser, map);
    }
    return map;
  }

  public async getConnectors(userId: string): Promise<McpConnector[]> {
    const map = this.getUserMap(userId);
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async getConnectorById(userId: string, id: string): Promise<McpConnector | null> {
    const map = this.getUserMap(userId);
    return map.get(id) || null;
  }

  public async getConnector(userId: string, id: string): Promise<McpConnector | null> {
    return this.getConnectorById(userId, id);
  }

  public async addConnector(
    userId: string,
    params: {
      name: string;
      url: string;
      authToken?: string;
      authType?: "none" | "bearer" | "oauth";
      readOnly?: boolean;
      consentAcknowledged?: boolean;
      allowedTools?: string[];
      deniedTools?: string[];
      oauth?: McpConnector["oauth"];
    }
  ): Promise<McpConnector> {
    const id = "conn_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const now = new Date().toISOString();
    let encryptedToken: any = undefined;
    if (params.authToken && params.authToken.trim()) {
      encryptedToken = encryptAES256GCM(params.authToken.trim());
    }

    const connector: McpConnector = {
      id,
      userId,
      name: params.name.trim(),
      url: params.url.trim(),
      authType: params.authType || (params.authToken ? "bearer" : "none"),
      hasToken: Boolean(encryptedToken),
      encryptedToken,
      enabled: true,
      readOnly: Boolean(params.readOnly),
      allowedTools: params.allowedTools || [],
      deniedTools: params.deniedTools || [],
      status: "connected",
      consentGiven: Boolean(params.consentAcknowledged),
      consentAcknowledged: Boolean(params.consentAcknowledged),
      oauth: params.oauth,
      createdAt: now,
      updatedAt: now,
    };

    const map = this.getUserMap(userId);
    map.set(id, connector);
    return connector;
  }

  public async saveConnector(connector: McpConnector): Promise<McpConnector> {
    const map = this.getUserMap(connector.userId);
    map.set(connector.id, connector);
    return connector;
  }

  public async updateConnector(
    userId: string,
    id: string,
    updates: Partial<McpConnector>
  ): Promise<McpConnector | null> {
    const map = this.getUserMap(userId);
    const existing = map.get(id);
    if (!existing) return null;

    const updated: McpConnector = {
      ...existing,
      ...updates,
      id: existing.id,
      userId: existing.userId,
      updatedAt: new Date().toISOString(),
    };

    map.set(id, updated);
    return updated;
  }

  public async deleteConnector(userId: string, id: string): Promise<boolean> {
    const map = this.getUserMap(userId);
    return map.delete(id);
  }

  /**
   * Sanitizes connector for public frontend serialization.
   * Strips all encrypted tokens, client secrets, and sensitive internals.
   */
  public sanitizeConnector(connector: McpConnector): PublicMcpConnector {
    const { encryptedToken, oauth, ...rest } = connector;
    return {
      ...rest,
      hasToken: Boolean(connector.hasToken || connector.encryptedToken),
      oauthConfigured: Boolean(oauth?.tokenEndpoint),
    };
  }

  /**
   * Safely decrypts an auth token server-side for an Anthropic API call.
   */
  public decryptToken(connector: McpConnector): string | undefined {
    if (!connector.encryptedToken) return undefined;
    try {
      return decryptAES256GCM(connector.encryptedToken);
    } catch (e) {
      console.error("[MCP Storage] Failed to decrypt connector token for", connector.id, e);
      return undefined;
    }
  }

  /**
   * Encrypts and attaches an auth token.
   */
  public encryptToken(token: string): { encryptedToken: ReturnType<typeof encryptAES256GCM>; hasToken: boolean } {
    const encryptedToken = encryptAES256GCM(token.trim());
    return {
      encryptedToken,
      hasToken: true,
    };
  }
}

export const mcpConnectorStore = McpConnectorStore.getInstance();
