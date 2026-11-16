/**
 * TATTVA AI - AI Gateway Provider Manager (Phase 59)
 * Central provider lifecycle manager, health auditor, and dispatch coordinator.
 */

import { AIProvider, ConnectionStatus, GatewayRequest, TaskType } from "./types";
import { GeminiApiGatewayAdapter } from "./adapters/gemini-api.adapter";
import { GeminiConsumerGatewayAdapter } from "./adapters/gemini-consumer.adapter";
import { LocalProceduralGatewayAdapter } from "./adapters/local-procedural.adapter";
import { CloudflareImageGatewayAdapter } from "./adapters/cloudflare-image.adapter";

export class ProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  private statuses: Map<string, ConnectionStatus> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.register("gemini_api", new GeminiApiGatewayAdapter());
    this.register("gemini_consumer", new GeminiConsumerGatewayAdapter());
    this.register("local_procedural", new LocalProceduralGatewayAdapter());
    this.register("cloudflare", new CloudflareImageGatewayAdapter());
  }

  public register(id: string, provider: AIProvider) {
    this.providers.set(id, provider);
  }

  public getProvider(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  public async getProviderStatus(id: string): Promise<ConnectionStatus | undefined> {
    const provider = this.providers.get(id);
    if (!provider) return undefined;

    // Refresh connection status
    try {
      const status = await provider.connect();
      this.statuses.set(id, status);
      return status;
    } catch (err: any) {
      const errStatus: ConnectionStatus = {
        isConnected: false,
        providerType: id as any,
        providerId: id,
        name: id,
        errorMessage: err.message,
        capabilities: {
          text: false,
          reasoning: false,
          coding: false,
          image: false,
          document: false,
          summarization: false,
          dataAnalysis: false,
          knowledgeRetrieval: false,
          multimodal: false,
        },
      };
      this.statuses.set(id, errStatus);
      return errStatus;
    }
  }

  public async listProviders(): Promise<ConnectionStatus[]> {
    const results: ConnectionStatus[] = [];
    for (const id of this.providers.keys()) {
      const status = await this.getProviderStatus(id);
      if (status) results.push(status);
    }
    return results;
  }

  /**
   * Selects best available provider for the given task type and request preferences
   */
  public async selectProvider(
    taskType: TaskType,
    request: GatewayRequest
  ): Promise<{ providerId: string; provider: AIProvider; fallback: boolean }> {
    // 1. Explicit preference check
    if (request.preferredProviderId && this.providers.has(request.preferredProviderId)) {
      const prefId = request.preferredProviderId;
      const status = await this.getProviderStatus(prefId);
      
      // If consumer subscription requested, notify why it is disabled
      if (prefId === "gemini_consumer" && !status?.isConnected) {
        throw new Error(
          `Provider '${prefId}' is inactive: ${status?.limitationReason || status?.errorMessage || "Personal consumer AI subscriptions cannot be connected via backend API or OAuth per Google terms of service."}`
        );
      }

      if (status?.isConnected) {
        return {
          providerId: prefId,
          provider: this.providers.get(prefId)!,
          fallback: false,
        };
      }
    }

    // 2. Task-specific dispatching: Cloudflare Workers AI is the exclusive image provider
    if (taskType === "image") {
      const cfProvider = this.providers.get("cloudflare");
      if (cfProvider) {
        return {
          providerId: "cloudflare",
          provider: cfProvider,
          fallback: false,
        };
      }
    }

    // 3. General tasks -> try gemini_api first
    const geminiApiStatus = await this.getProviderStatus("gemini_api");
    if (geminiApiStatus?.isConnected) {
      return {
        providerId: "gemini_api",
        provider: this.providers.get("gemini_api")!,
        fallback: false,
      };
    }

    // 4. Fallback for text/mock tasks if API unavailable
    const fallbackProvider = this.providers.get("local_procedural");
    if (fallbackProvider) {
      return {
        providerId: "local_procedural",
        provider: fallbackProvider,
        fallback: true,
      };
    }

    throw new Error(`No viable provider found for task type: ${taskType}`);
  }
}
