/**
 * TATTVA AI - Unified Gemini Connector Service
 * Coordinates provider adapters, enforces usage protection, detects tasks,
 * and maintains transparent connection health metrics.
 */

import { GeminiProvider, ConnectionStatus, GenerationOptions, TextResult, ImageOptions, ImageResult, UsageStatus } from "./types";
import { GeminiProConsumerAdapter } from "./gemini-pro-consumer-adapter";
import { GeminiApiAdapter } from "./gemini-api-adapter";

export type TaskType =
  | "text"
  | "coding"
  | "reasoning"
  | "summarization"
  | "image"
  | "document"
  | "structured_data";

export class GeminiConnectorService {
  private static instance: GeminiConnectorService;
  private consumerAdapter: GeminiProConsumerAdapter;
  private apiAdapter: GeminiApiAdapter;
  private activeProviderType: "consumer_subscription" | "developer_api" = "consumer_subscription";
  private activeProvider: GeminiProvider;
  private requestHistory: Map<string, { timestamp: number; result: TextResult }> = new Map();

  private constructor() {
    this.consumerAdapter = new GeminiProConsumerAdapter();
    this.apiAdapter = new GeminiApiAdapter();
    this.activeProvider = this.consumerAdapter;
  }

  public static getInstance(): GeminiConnectorService {
    if (!GeminiConnectorService.instance) {
      GeminiConnectorService.instance = new GeminiConnectorService();
    }
    return GeminiConnectorService.instance;
  }

  /**
   * Set the target provider mode.
   * "consumer_subscription" targets the user's Google AI Pro subscription.
   * "developer_api" targets the official Google AI Studio developer API.
   */
  public setProviderMode(mode: "consumer_subscription" | "developer_api") {
    this.activeProviderType = mode;
    this.activeProvider = mode === "consumer_subscription" ? this.consumerAdapter : this.apiAdapter;
  }

  public getProviderMode(): "consumer_subscription" | "developer_api" {
    return this.activeProviderType;
  }

  public async getStatus(): Promise<ConnectionStatus> {
    return this.activeProvider.connect();
  }

  public async getUsage(): Promise<UsageStatus> {
    return this.activeProvider.getUsage();
  }

  /**
   * Detects the task domain from user prompt and instructions.
   */
  public detectTask(prompt: string): TaskType {
    const clean = prompt.toLowerCase();
    if (/\b(draw|paint|illustrate|generate an image|photo of|picture of)\b/i.test(clean)) {
      return "image";
    }
    if (/\b(write code|function|typescript|python|javascript|class|algorithm|sql|bug)\b/i.test(clean)) {
      return "coding";
    }
    if (/\b(calculate|math|solve|equation|proof|step-by-step|logic|reasoning)\b/i.test(clean)) {
      return "reasoning";
    }
    if (/\b(summarize|summary|tldr|key takeaways|bullet points|brief)\b/i.test(clean)) {
      return "summarization";
    }
    if (/\b(json|schema|csv|table|structured|extract entities)\b/i.test(clean)) {
      return "structured_data";
    }
    if (/\b(document|report|dossier|whitepaper|draft)\b/i.test(clean)) {
      return "document";
    }
    return "text";
  }

  /**
   * Routes and executes an AI request with strict usage protection and idempotency caching.
   */
  public async executeTask(
    prompt: string,
    options?: GenerationOptions
  ): Promise<TextResult> {
    // 1. Task detection
    const task = this.detectTask(prompt);

    if (task === "image") {
      throw new Error(
        "Image generation capabilities have been permanently retired from TATTVA AI."
      );
    }

    // 2. Idempotency Check (prevent duplicate rapid-fire requests)
    const idempotencyKey = `${prompt.trim()}_${options?.model || "default"}`;
    const cached = this.requestHistory.get(idempotencyKey);
    if (cached && Date.now() - cached.timestamp < 10_000) {
      return {
        ...cached.result,
        latencyMs: 1, // Served from instant cache
      };
    }

    // 3. Usage protection check
    const usage = await this.activeProvider.getUsage();
    if (usage.isQuotaExhausted) {
      throw new Error(
        `Gemini execution halted: Quota exhausted or provider restricted (${usage.planType}). ` +
        "Automatic fallback to paid API is strictly disabled."
      );
    }

    // 4. Execute via active provider
    const result = await this.activeProvider.generateText(prompt, options);

    // Cache successful execution
    this.requestHistory.set(idempotencyKey, {
      timestamp: Date.now(),
      result,
    });

    return result;
  }

  public async disconnect(): Promise<void> {
    await this.activeProvider.disconnect();
  }
}
