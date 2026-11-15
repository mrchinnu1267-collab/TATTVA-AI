/**
 * TATTVA AI - Universal AI Gateway Type Definitions (Phases 58 & 59)
 * Defines the contract for all providers, task routers, and result managers.
 */

export interface ConnectionStatus {
  isConnected: boolean;
  providerType: "gemini_api" | "gemini_consumer" | "anthropic" | "azure_openai" | "cloudflare" | "local_procedural" | "custom";
  providerId: string;
  name: string;
  accountLabel?: string;
  errorMessage?: string;
  limitationReason?: string;
  capabilities: {
    text: boolean;
    reasoning: boolean;
    coding: boolean;
    image: boolean;
    document: boolean;
    summarization: boolean;
    dataAnalysis: boolean;
    knowledgeRetrieval: boolean;
    multimodal: boolean;
  };
  policyNotice?: string;
}

export interface GenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  stopSequences?: string[];
  responseMimeType?: string;
  stream?: boolean;
}

export interface TextResult {
  text: string;
  modelUsed: string;
  latencyMs: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ImageOptions {
  width?: number;
  height?: number;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  numberOfImages?: number;
  quality?: "standard" | "hd";
  style?: "photorealistic" | "cinematic" | "digital_art" | "anime" | "illustration";
}

export interface ImageResult {
  images: Array<{
    dataUri?: string;
    buffer?: Buffer;
    url?: string;
    width: number;
    height: number;
    mimeType: string;
    sha256?: string;
    provenance: "local_procedural_fallback" | "user_uploaded_image" | "external_subscribed_agent_a" | "external_subscribed_agent_b";
  }>;
}

export interface UsageStatus {
  planType: string;
  requestsUsed: number;
  quotaLimit: number | "unlimited" | "unsupported_consumer_quota";
  isQuotaExhausted: boolean;
  rateLimitPerMinute: number;
  resetsAt?: string;
  authoritativeSource: string;
}

/**
 * Universal Provider Contract (Phase 58.3)
 */
export interface AIProvider {
  connect(): Promise<ConnectionStatus>;

  generateText(
    prompt: string,
    options?: GenerationOptions
  ): Promise<TextResult>;

  generateImage?(
    prompt: string,
    options?: ImageOptions
  ): Promise<ImageResult>;

  getUsage?(): Promise<UsageStatus>;

  disconnect(): Promise<void>;
}

export type TaskType =
  | "text"
  | "reasoning"
  | "coding"
  | "image"
  | "document"
  | "summarization"
  | "data_analysis"
  | "knowledge_retrieval"
  | "multimodal";

export interface GatewayRequest {
  prompt: string;
  taskType?: TaskType;
  options?: GenerationOptions;
  imageOptions?: ImageOptions;
  preferredProviderId?: string;
  userId?: string;
  workspaceId?: string;
  context?: {
    attachments?: Array<{ name: string; type: string; data: string }>;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };
}

export interface GatewayResult {
  success: boolean;
  taskType: TaskType;
  providerId: string;
  providerName: string;
  textResult?: TextResult;
  imageResult?: ImageResult;
  provenance?: string;
  latencyMs: number;
  cached: boolean;
  error?: string;
}
