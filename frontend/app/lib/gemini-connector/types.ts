/**
 * TATTVA AI - Gemini Connector Interface & Types
 * Defines the contract for official Google Gemini backend integration.
 */

export interface ConnectionStatus {
  isConnected: boolean;
  providerType: "consumer_subscription" | "developer_api" | "disconnected";
  accountLabel?: string;
  errorMessage?: string;
  limitationReason?: string;
  capabilities: {
    text: boolean;
    image: boolean;
    code: boolean;
    reasoning: boolean;
    structuredData: boolean;
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
}

export interface ImageResult {
  images: Array<{
    dataUri?: string;
    buffer?: Buffer;
    width: number;
    height: number;
    mimeType: string;
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

export interface GeminiProvider {
  connect(): Promise<ConnectionStatus>;

  generateText(
    prompt: string,
    options?: GenerationOptions
  ): Promise<TextResult>;

  generateImage(
    prompt: string,
    options?: ImageOptions
  ): Promise<ImageResult>;

  getUsage(): Promise<UsageStatus>;

  disconnect(): Promise<void>;
}
