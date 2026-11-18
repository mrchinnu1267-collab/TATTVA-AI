/**
 * TATTVA AI - Universal AI Gateway (Phases 58 & 59)
 * Central orchestrator connecting frontend and internal services to all AI models.
 */

import { TaskRouter } from "./task-router";
import { ProviderManager } from "./provider-manager";
import { ResultManager } from "./result-manager";
import { ConnectionStatus, GatewayRequest, GatewayResult } from "./types";

export class AIGateway {
  private taskRouter: TaskRouter;
  private providerManager: ProviderManager;
  private resultManager: ResultManager;

  constructor() {
    this.taskRouter = new TaskRouter();
    this.providerManager = new ProviderManager();
    this.resultManager = new ResultManager();
  }

  /**
   * Main dispatch method
   */
  public async executeTask(request: GatewayRequest): Promise<GatewayResult> {
    const startTime = Date.now();

    // 1. Task Classification
    const classification = this.taskRouter.classify(request);
    const taskType = classification.taskType;

    let selectedProviderId = "unknown";
    let selectedProviderName = "Unknown Provider";

    try {
      // 2. Provider Selection
      const { providerId, provider } = await this.providerManager.selectProvider(taskType, request);
      selectedProviderId = providerId;
      selectedProviderName = providerId;

      // 3. Execution based on TaskType
      if (taskType === "image") {
        throw new Error("Image generation has been permanently retired from TATTVA AI.");
      } else {
        // Text / Reasoning / Coding / Multimodal / Analysis
        let effectivePrompt = request.prompt;
        if (request.context?.history && request.context.history.length > 0) {
          const historyText = request.context.history
            .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
            .join("\n");
          effectivePrompt = `Conversation History:\n${historyText}\n\nCurrent Request:\n${request.prompt}`;
        }

        const rawTextResult = await provider.generateText(effectivePrompt, request.options);
        const sanitizedTextResult = this.resultManager.sanitizeText(rawTextResult);

        return this.resultManager.buildSuccessResult({
          taskType,
          providerId,
          providerName: selectedProviderName,
          textResult: sanitizedTextResult,
          provenance: `gateway_${providerId}`,
          latencyMs: Date.now() - startTime,
        });
      }
    } catch (err: any) {
      return this.resultManager.buildErrorResult({
        taskType,
        providerId: selectedProviderId,
        providerName: selectedProviderName,
        error: err.message || "Unknown error executing task",
        latencyMs: Date.now() - startTime,
      });
    }
  }

  public async listProviders(): Promise<ConnectionStatus[]> {
    return this.providerManager.listProviders();
  }

  public async healthCheck(): Promise<{ healthy: boolean; providers: ConnectionStatus[] }> {
    const providers = await this.listProviders();
    const activeProviders = providers.filter(p => p.isConnected);
    return {
      healthy: activeProviders.length > 0,
      providers,
    };
  }
}

// Global Singleton
export const aiGateway = new AIGateway();
