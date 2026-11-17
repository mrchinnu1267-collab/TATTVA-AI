/**
 * TATTVA AI - Ecosystem & Developer Platform Types
 * Phase 24 Specification: External integrations, plugin system, custom tools,
 * developer API keys, workflow automation, and SDK interfaces.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type ExternalServiceType =
  | "github"
  | "google_drive"
  | "google_calendar"
  | "gmail"
  | "slack"
  | "discord"
  | "notion"
  | "supabase"
  | "firebase"
  | "onedrive";

export interface IntegrationConnection {
  id: string;
  userId: string;
  workspaceId: string;
  service: ExternalServiceType;
  displayName: string;
  accountIdentifier: string; // e.g. "octocat", "user@gmail.com"
  scopes: string[];
  encryptedToken: string; // AES-256-GCM ciphertext
  tokenIv: string;
  tokenTag: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  status: "connected" | "expired" | "revoked" | "error";
  lastError?: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: "productivity" | "engineering" | "collaboration" | "data" | "security";
  requiredServices: ExternalServiceType[];
  requiredPermissions: string[];
  supportedTools: string[];
  isOfficial: boolean;
  enabled?: boolean;
}

export interface CustomToolDefinition {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  displayName: string;
  description: string;
  endpointUrl: string;
  httpMethod: "GET" | "POST" | "PUT";
  authConfig: {
    type: "none" | "bearer" | "api_key" | "custom_header";
    headerName?: string;
    encryptedSecret?: string;
  };
  inputSchema: Record<string, { type: string; description: string; required?: boolean }>;
  outputSchema: Record<string, string>;
  permission: "safe" | "approval_required";
  timeoutMs: number;
  rateLimitPerMinute: number;
  createdAt: string;
}

export type ApiKeyScope = "chat:write" | "research:read" | "documents:write" | "tasks:write" | "admin";

export interface DeveloperApiKey {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  keyPrefix: string; // e.g. "tattva_live_a1b2"
  hashedKey: string; // SHA-256
  scopes: ApiKeyScope[];
  rateLimitPerMinute: number;
  monthlyQuota: number;
  currentMonthUsage: number;
  createdAt: string;
  lastUsedAt?: string;
  status: "active" | "revoked";
}

export interface WorkflowStep {
  id: string;
  name: string;
  toolName: string;
  parameters: Record<string, any>;
  dependsOn?: string[]; // IDs of predecessor steps
  continueOnError?: boolean;
  retryCount?: number;
}

export interface WorkflowDefinition {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  description: string;
  trigger: {
    type: "manual" | "webhook" | "schedule";
    config?: Record<string, any>;
  };
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecutionRun {
  runId: string;
  workflowId: string;
  userId: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  startedAt: string;
  completedAt?: string;
  stepResults: Record<string, {
    status: "SUCCESS" | "FAILED" | "SKIPPED";
    output?: any;
    error?: string;
    durationMs: number;
  }>;
  totalDurationMs: number;
  error?: string;
}
