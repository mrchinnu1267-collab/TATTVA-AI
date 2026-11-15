/**
 * TATTVA AI - Platform Expansion & Integrations Types (Phase 26)
 * Real integration schemas with authentication, permissions, and error handling
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type IntegrationCategory =
  | "developer_tools"
  | "collaboration_webhooks"
  | "cloud_storage"
  | "ai_providers"
  | "productivity";

export interface IntegrationAuth {
  type: "bearer_token" | "api_key" | "webhook_url" | "oauth2";
  token?: string;
  apiKey?: string;
  webhookUrl?: string;
  endpoint?: string;
}

export interface WebhookAlertPayload {
  channel: "slack" | "discord" | "teams";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical" | "success";
  metadata?: Record<string, any>;
}

export interface CloudStorageSignedUrlResult {
  provider: "supabase_storage" | "aws_s3" | "gcs";
  bucket: string;
  filePath: string;
  action: "read" | "write";
  signedUrl: string;
  expiresInSeconds: number;
}

export interface ExpandedProviderSpec {
  id: string;
  name: string;
  provider: "anthropic" | "azure_openai" | "indic_local_slm";
  supportedModels: string[];
  requiresAuth: boolean;
  isReady: boolean;
}
