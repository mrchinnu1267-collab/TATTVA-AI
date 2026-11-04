import type { EncryptedPayload } from "../security";

export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpConnector {
  id: string;
  userId: string;
  name: string;
  url: string;
  authType: "none" | "bearer" | "oauth";
  hasToken: boolean;
  encryptedToken?: EncryptedPayload;
  enabled: boolean;
  readOnly: boolean;
  allowedTools: string[];
  deniedTools: string[];
  status: "connected" | "needs_auth" | "error";
  lastError?: string;
  errorMessage?: string;
  discoveredTools?: McpToolDefinition[];
  oauth?: {
    clientId?: string;
    tokenEndpoint?: string;
    expiresAt?: number;
    refreshTokenEncrypted?: EncryptedPayload;
  };
  consentGiven: boolean;
  consentAcknowledged?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PublicMcpConnector = Omit<McpConnector, "encryptedToken" | "oauth"> & {
  hasToken: boolean;
  oauthConfigured: boolean;
  errorMessage?: string;
};

export interface AnthropicMcpServerConfig {
  type: "url";
  name: string;
  url: string;
  authorization_token?: string;
}

export interface AnthropicMcpToolsetConfig {
  type: "mcp_toolset";
  mcp_server_name: string;
}

export interface ConnectorChatRequest {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  connectorIds?: string[];
  model?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ToolCallExecutionRecord {
  connectorName: string;
  serverName?: string;
  toolName: string;
  input?: Record<string, unknown>;
  output?: unknown;
  status: "started" | "completed" | "denied" | "error";
  durationMs?: number;
  error?: string;
}
