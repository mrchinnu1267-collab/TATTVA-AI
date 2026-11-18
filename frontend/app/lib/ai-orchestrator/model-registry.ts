/**
 * TATTVA AI - Unified Model Registry & Dynamic Capability Scoring Engine
 * Centralized multi-modal model catalog, dynamic intent/latency/cost scoring,
 * circuit breaker health monitoring, and resilient fallback chain resolution.
 * 
 * Conceptualized & Engineered for TATTVA AI General Intelligence Platform
 */

import { TaskIntent, ModelProvider, AIModelSpec } from "./types";

export type ModalityInput = "text" | "image" | "audio" | "video" | "document";
export type ModalityOutput = "text" | "code" | "image" | "audio" | "structured_json";
export type LatencyTier = "ultra_low" | "low" | "medium" | "high";
export type ModelStatus = "verified" | "preview" | "deprecated" | "community";

export interface ModelHealthMetrics {
  isHealthy: boolean;
  consecutiveFailures: number;
  totalCalls: number;
  successfulCalls: number;
  averageLatencyMs: number;
  lastLatencyMs?: number;
  lastCheckedAt: number;
  circuitBreakerTrippedUntil?: number;
  lastError?: string;
}

export interface ModelDescriptor {
  id: string;
  name: string;
  provider: ModelProvider;
  inputModalities: ModalityInput[];
  outputModalities: ModalityOutput[];
  contextWindow: number;
  maxOutputTokens: number;
  latencyTier: LatencyTier;
  pricingPer1MTokens: {
    prompt: number;
    completion: number;
  };
  strengths: TaskIntent[];
  verifiedStatus: ModelStatus;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsReasoning: boolean;
  parameterScale?: string;
  health: ModelHealthMetrics;
}

export interface ModelSelectionCriteria {
  taskIntent: TaskIntent;
  requiredInputModalities?: ModalityInput[];
  requiredOutputModalities?: ModalityOutput[];
  estimatedTokens?: number;
  latencySensitivity?: "low" | "medium" | "high";
  costSensitivity?: "low" | "medium" | "high";
  preferredProvider?: ModelProvider;
  preferredModel?: string;
  requiresStreaming?: boolean;
  requiresTools?: boolean;
  supportsTools?: boolean;
  requiresReasoning?: boolean;
  supportsReasoning?: boolean;
}

export interface ScoredModel {
  model: ModelDescriptor;
  score: number;
  matchReasons: string[];
  disqualified: boolean;
  disqualifyReason?: string;
}

export interface ModelRegistrySnapshot {
  totalModels: number;
  healthyModels: number;
  providers: ModelProvider[];
  modelsByProvider: Record<string, number>;
  models: ModelDescriptor[];
  timestamp: number;
}

export class ModelRegistry {
  private static instance: ModelRegistry;
  private catalog: Map<string, ModelDescriptor> = new Map();
  private circuitBreakerFailureThreshold: number = 3;
  private circuitBreakerCooldownMs: number = 60000; // 60 seconds

  private constructor() {
    this.seedDefaultCatalog();
  }

  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  /**
   * Universal Model Catalog initialization across all supported providers
   */
  private seedDefaultCatalog(): void {
    const models: Omit<ModelDescriptor, "health">[] = [
      // ------------------------------------------------------------------------
      // 1. Google Gemini Fleet
      // ------------------------------------------------------------------------
      {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        provider: "gemini",
        inputModalities: ["text", "image", "audio", "video", "document"],
        outputModalities: ["text", "code", "structured_json"],
        contextWindow: 1048576,
        maxOutputTokens: 8192,
        latencyTier: "ultra_low",
        pricingPer1MTokens: { prompt: 0.15, completion: 0.60 },
        strengths: ["coding", "reasoning", "mathematics", "document_analysis", "agent_task", "general_chat"],
        verifiedStatus: "verified",
        supportsStreaming: true,
        supportsTools: true,
        supportsReasoning: true,
        parameterScale: "Undisclosed",
      },
      {
        id: "gemini-3.5-flash-lite",
        name: "Gemini 3.5 Flash Lite",
        provider: "gemini",
        inputModalities: ["text", "image", "document"],
        outputModalities: ["text", "code", "structured_json"],
        contextWindow: 1048576,
        maxOutputTokens: 8192,
        latencyTier: "ultra_low",
        pricingPer1MTokens: { prompt: 0.075, completion: 0.30 },
        strengths: ["general_chat", "conversational", "translation", "summarization", "agent_task"],
        verifiedStatus: "verified",
        supportsStreaming: true,
        supportsTools: true,
        supportsReasoning: false,
        parameterScale: "Undisclosed",
      },
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        provider: "gemini",
        inputModalities: ["text", "image", "audio", "video", "document"],
        outputModalities: ["text", "code", "structured_json"],
        contextWindow: 2097152,
        maxOutputTokens: 8192,
        latencyTier: "medium",
        pricingPer1MTokens: { prompt: 1.25, completion: 5.00 },
        strengths: ["reasoning", "coding", "data_analysis", "document_analysis", "creative_writing"],
        verifiedStatus: "verified",
        supportsStreaming: true,
        supportsTools: true,
        supportsReasoning: true,
        parameterScale: "Undisclosed",
      },
      {
        id: "gemini-2.0-flash-thinking-exp",
        name: "Gemini 2.0 Flash Thinking",
        provider: "gemini",
        inputModalities: ["text", "image", "document"],
        outputModalities: ["text", "code", "structured_json"],
        contextWindow: 1048576,
        maxOutputTokens: 8192,
        latencyTier: "medium",
        pricingPer1MTokens: { prompt: 0.20, completion: 0.80 },
        strengths: ["reasoning", "mathematics", "math", "troubleshooting", "coding"],
        verifiedStatus: "preview",
        supportsStreaming: true,
        supportsTools: true,
        supportsReasoning: true,
        parameterScale: "Undisclosed",
      },

      // ------------------------------------------------------------------------
      // 2. Anthropic Claude Fleet
      // ------------------------------------------------------------------------
      {
        id: "claude-3-7-sonnet",
        name: "Claude 3.7 Sonnet (Hybrid Reasoning)",
        provider: "anthropic",
        inputModalities: ["text", "image", "document"],
        outputModalities: ["text", "code", "structured_json"],
        contextWindow: 200000,
        maxOutputTokens: 8192,
        latencyTier: "medium",
        pricingPer1MTokens: { prompt: 3.00, completion: 15.00 },
        strengths: ["reasoning", "coding", "agent_task", "data_analysis", "troubleshooting"],
        verifiedStatus: "verified",
        supportsStreaming: true,
        supportsTools: true,
        supportsReasoning: true,
        parameterScale: "Undisclosed",
      },
      {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        provider: "anthropic",
        inputModalities: ["text", "image", "document"],
        outputModalities: ["text", "code", "structured_json"],
        contextWindow: 200000,
        maxOutputTokens: 8192,
        latencyTier: "medium",
        pricingPer1MTokens: { prompt: 3.00, completion: 15.00 },
        strengths: ["coding", "reasoning", "creative_writing", "document_analysis", "agent_task"],
        verifiedStatus: "verified",
        supportsStreaming: true,
        supportsTools: true,
        supportsReasoning: true,
        parameterScale: "Undisclosed",
      },
      {
        id: "claude-3-5-haiku-20241022",
        name: "Claude 3.5 Haiku",
        provider: "anthropic",
        inputModalities: ["text", "document"],
        outputModalities: ["text", "code", "structured_json"],
        contextWindow: 200000,
        maxOutputTokens: 8192,
        latencyTier: "low",
        pricingPer1MTokens: { prompt: 0.80, completion: 4.00 },
        strengths: ["general_chat", "coding", "agent_task", "translation"],
        verifiedStatus: "verified",
        supportsStreaming: true,
        supportsTools: true,
        supportsReasoning: false,
        parameterScale: "Undisclosed",
      },

      // ------------------------------------------------------------------------
      // 3. OpenAI Fleet
      // ------------------------------------------------------------------------
      {
        id: "gpt-4o",
        name: "GPT-4o Omnimodal",
        provider: "openai",
        inputModalities: ["text", "image", "audio", "document"],
        outputModalities: ["text", "code", "structured_json"],
        contextWindow: 128000,
        maxOutputTokens: 4096,
        latencyTier: "low",
        pricingPer1MTokens: { prompt: 2.50, completion: 10.00 },
        strengths: ["general_chat", "coding", "agent_task", "data_analysis", "creative_writing"],
        verifiedStatus: "verified",
        supportsStreaming: true,
        supportsTools: true,
        supportsReasoning: false,
        parameterScale: "Undisclosed",
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        provider: "openai",
        inputModalities: ["text", "image", "document"],
        outputModalities: ["text", "code", "structured_json"],
        contextWindow: 128000,
        maxOutputTokens: 4096,
        latencyTier: "ultra_low",
        pricingPer1MTokens: { prompt: 0.15, completion: 0.60 },
        strengths: ["general_chat", "conversational", "translation", "summarization"],
        verifiedStatus: "verified",
        supportsStreaming: true,
        supportsTools: true,
        supportsReasoning: false,
        parameterScale: "Undisclosed",
      },
      {
        id: "o3-mini",
        name: "OpenAI o3-mini (High Reasoning)",
        provider: "openai",
        inputModalities: ["text", "document"],
        outputModalities: ["text", "code", "structured_json"],
        contextWindow: 200000,
        maxOutputTokens: 65536,
        latencyTier: "high",
        pricingPer1MTokens: { prompt: 1.10, completion: 4.40 },
        strengths: ["reasoning", "coding", "mathematics", "math", "troubleshooting"],
        verifiedStatus: "verified",
        supportsStreaming: true,
        supportsTools: true,
        supportsReasoning: true,
        parameterScale: "Undisclosed",
      },

      // ------------------------------------------------------------------------
      // 4. OpenRouter & DeepSeek Fleet
      // ------------------------------------------------------------------------
      {
        id: "deepseek/deepseek-r1",
        name: "DeepSeek R1 (Open Reasoner)",
        provider: "openrouter",
        inputModalities: ["text", "document"],
        outputModalities: ["text", "code", "structured_json"],
        contextWindow: 65536,
        maxOutputTokens: 8192,
        latencyTier: "medium",
        pricingPer1MTokens: { prompt: 0.55, completion: 2.19 },
        strengths: ["reasoning", "mathematics", "math", "coding", "troubleshooting"],
        verifiedStatus: "verified",
        supportsStreaming: true,
        supportsTools: true,
        supportsReasoning: true,
        parameterScale: "671B MoE",
      },
      {
        id: "deepseek/deepseek-chat-v3",
        name: "DeepSeek V3",
        provider: "openrouter",
        inputModalities: ["text", "document"],
        outputModalities: ["text", "code", "structured_json"],
        contextWindow: 65536,
        maxOutputTokens: 8192,
        latencyTier: "low",
        pricingPer1MTokens: { prompt: 0.14, completion: 0.28 },
        strengths: ["general_chat", "coding", "translation", "agent_task"],
        verifiedStatus: "verified",
        supportsStreaming: true,
        supportsTools: true,
        supportsReasoning: false,
        parameterScale: "671B MoE",
      },
      {
        id: "meta-llama/llama-3.3-70b-instruct",
        name: "Llama 3.3 70B Instruct",
        provider: "openrouter",
        inputModalities: ["text", "document"],
        outputModalities: ["text", "code", "structured_json"],
        contextWindow: 131072,
        maxOutputTokens: 8192,
        latencyTier: "low",
        pricingPer1MTokens: { prompt: 0.12, completion: 0.30 },
        strengths: ["general_chat", "coding", "agent_task", "translation", "summarization"],
        verifiedStatus: "verified",
        supportsStreaming: true,
        supportsTools: true,
        supportsReasoning: false,
        parameterScale: "70B Dense",
      },

      // ------------------------------------------------------------------------
      // 5. Nvidia NIM Enterprise Fleet
      // ------------------------------------------------------------------------
      {
        id: "meta/llama-3.1-70b-instruct",
        name: "Nvidia NIM Llama 3.1 70B",
        provider: "nvidia",
        inputModalities: ["text", "document"],
        outputModalities: ["text", "code", "structured_json"],
        contextWindow: 131072,
        maxOutputTokens: 4096,
        latencyTier: "ultra_low",
        pricingPer1MTokens: { prompt: 0.20, completion: 0.40 },
        strengths: ["general_chat", "coding", "reasoning", "troubleshooting"],
        verifiedStatus: "verified",
        supportsStreaming: true,
        supportsTools: true,
        supportsReasoning: false,
        parameterScale: "70B",
      },

      // ------------------------------------------------------------------------
      // 6. Image & Creative Media Models (HuggingFace / Pollinations)
      // ------------------------------------------------------------------------
      {
        id: "black-forest-labs/flux-1-schnell",
        name: "FLUX.1 Schnell",
        provider: "huggingface",
        inputModalities: ["text"],
        outputModalities: ["image"],
        contextWindow: 1024,
        maxOutputTokens: 1024,
        latencyTier: "medium",
        pricingPer1MTokens: { prompt: 0.05, completion: 0.05 },
        strengths: ["image_generation"],
        verifiedStatus: "verified",
        supportsStreaming: false,
        supportsTools: false,
        supportsReasoning: false,
        parameterScale: "12B",
      },
      {
        id: "pollinations-flux",
        name: "Pollinations FLUX",
        provider: "pollinations",
        inputModalities: ["text"],
        outputModalities: ["image"],
        contextWindow: 2048,
        maxOutputTokens: 1024,
        latencyTier: "low",
        pricingPer1MTokens: { prompt: 0.0, completion: 0.0 },
        strengths: ["image_generation"],
        verifiedStatus: "community",
        supportsStreaming: false,
        supportsTools: false,
        supportsReasoning: false,
        parameterScale: "12B",
      },

      // ------------------------------------------------------------------------
      // 7. TATTVA Local & Resilient Models
      // ------------------------------------------------------------------------
      {
        id: "tattva-general-v1",
        name: "TATTVA Native General Intelligence",
        provider: "tattva",
        inputModalities: ["text", "document"],
        outputModalities: ["text", "code", "structured_json"],
        contextWindow: 32768,
        maxOutputTokens: 4096,
        latencyTier: "ultra_low",
        pricingPer1MTokens: { prompt: 0.0, completion: 0.0 },
        strengths: ["general_chat", "conversational", "summarization", "translation"],
        verifiedStatus: "verified",
        supportsStreaming: true,
        supportsTools: true,
        supportsReasoning: false,
        parameterScale: "Embedded Engine",
      },
      {
        id: "tattva-code-v1",
        name: "TATTVA Native Code Specialist",
        provider: "tattva",
        inputModalities: ["text", "document"],
        outputModalities: ["code", "structured_json"],
        contextWindow: 32768,
        maxOutputTokens: 4096,
        latencyTier: "ultra_low",
        pricingPer1MTokens: { prompt: 0.0, completion: 0.0 },
        strengths: ["coding", "troubleshooting", "mathematics"],
        verifiedStatus: "verified",
        supportsStreaming: true,
        supportsTools: true,
        supportsReasoning: false,
        parameterScale: "Embedded Engine",
      },
    ];

    for (const model of models) {
      this.registerModel({
        ...model,
        health: {
          isHealthy: true,
          consecutiveFailures: 0,
          totalCalls: 0,
          successfulCalls: 0,
          averageLatencyMs: 0,
          lastCheckedAt: Date.now(),
        },
      });
    }
  }

  /**
   * Registers or updates a model descriptor
   */
  public registerModel(descriptor: ModelDescriptor): void {
    this.catalog.set(descriptor.id, descriptor);
  }

  /**
   * Retrieves a model descriptor by ID
   */
  public getModel(id: string): ModelDescriptor | undefined {
    return this.catalog.get(id);
  }

  /**
   * Lists all models with optional filtering
   */
  public listModels(filters?: {
    provider?: ModelProvider;
    inputModality?: ModalityInput;
    outputModality?: ModalityOutput;
    healthyOnly?: boolean;
    supportsTools?: boolean;
    supportsReasoning?: boolean;
  }): ModelDescriptor[] {
    let list = Array.from(this.catalog.values());

    if (!filters) return list;

    if (filters.provider) {
      list = list.filter((m) => m.provider === filters.provider);
    }
    if (filters.inputModality) {
      list = list.filter((m) => m.inputModalities.includes(filters.inputModality!));
    }
    if (filters.outputModality) {
      list = list.filter((m) => m.outputModalities.includes(filters.outputModality!));
    }
    if (filters.healthyOnly) {
      list = list.filter((m) => this.isModelHealthy(m.id));
    }
    if (filters.supportsTools !== undefined) {
      list = list.filter((m) => m.supportsTools === filters.supportsTools);
    }
    if (filters.supportsReasoning !== undefined) {
      list = list.filter((m) => m.supportsReasoning === filters.supportsReasoning);
    }

    return list;
  }

  /**
   * Checks whether a model is currently healthy and not in circuit breaker cooldown
   */
  public isModelHealthy(modelId: string): boolean {
    const model = this.catalog.get(modelId);
    if (!model) return false;

    // Check circuit breaker status
    if (model.health.circuitBreakerTrippedUntil) {
      if (Date.now() < model.health.circuitBreakerTrippedUntil) {
        return false;
      }
      // Cooldown expired; half-open recovery state
      model.health.circuitBreakerTrippedUntil = undefined;
      model.health.isHealthy = true;
    }

    return model.health.isHealthy;
  }

  /**
   * Scores all models against a set of task criteria and returns ranked candidates
   */
  public scoreModels(criteria: ModelSelectionCriteria): ScoredModel[] {
    const scoredList: ScoredModel[] = [];

    for (const model of this.catalog.values()) {
      let score = 50; // Base score
      const matchReasons: string[] = [];
      let disqualified = false;
      let disqualifyReason: string | undefined;

      // 1. Modality Compatibility Checks (Strict Gate)
      if (criteria.requiredInputModalities && criteria.requiredInputModalities.length > 0) {
        const hasAllInputs = criteria.requiredInputModalities.every((mod) =>
          model.inputModalities.includes(mod)
        );
        if (!hasAllInputs) {
          disqualified = true;
          disqualifyReason = `Lacks required input modalities: ${criteria.requiredInputModalities.join(", ")}`;
        }
      }

      if (criteria.requiredOutputModalities && criteria.requiredOutputModalities.length > 0) {
        const hasAllOutputs = criteria.requiredOutputModalities.every((mod) =>
          model.outputModalities.includes(mod)
        );
        if (!hasAllOutputs) {
          disqualified = true;
          disqualifyReason = `Lacks required output modalities: ${criteria.requiredOutputModalities.join(", ")}`;
        }
      }

      // 2. Token Context Limit Check
      if (criteria.estimatedTokens && criteria.estimatedTokens > model.contextWindow * 0.95) {
        disqualified = true;
        disqualifyReason = `Estimated tokens (${criteria.estimatedTokens}) exceed 95% of context window (${model.contextWindow})`;
      }

      // 3. Circuit Breaker / Health Check
      if (!this.isModelHealthy(model.id)) {
        score -= 200;
        matchReasons.push("Circuit breaker active / unhealthy state penalty");
      }

      // 4. Intent & Strengths Alignment
      if (model.strengths.includes(criteria.taskIntent)) {
        score += 35;
        matchReasons.push(`Strong alignment with intent: ${criteria.taskIntent}`);
      }

      // 5. Preferred Model / Provider Bonus
      if (criteria.preferredModel && model.id === criteria.preferredModel) {
        score += 50;
        matchReasons.push("Matches user preferred model explicitly");
      } else if (criteria.preferredProvider && model.provider === criteria.preferredProvider) {
        score += 20;
        matchReasons.push(`Matches user preferred provider: ${criteria.preferredProvider}`);
      }

      // 6. Latency Tier Scoring
      if (criteria.latencySensitivity === "high") {
        if (model.latencyTier === "ultra_low") score += 25;
        else if (model.latencyTier === "low") score += 15;
        else if (model.latencyTier === "high") score -= 20;
      } else if (criteria.latencySensitivity === "low") {
        // Tolerates higher latency for deeper quality
        if (model.latencyTier === "medium" || model.latencyTier === "high") score += 10;
      }

      // 7. Cost Sensitivity Scoring
      if (criteria.costSensitivity === "high") {
        const promptCost = model.pricingPer1MTokens.prompt;
        if (promptCost === 0) score += 30; // Free / local
        else if (promptCost < 0.20) score += 20;
        else if (promptCost > 2.00) score -= 30;
      }

      // 8. Tool Execution & Reasoning Requirements
      if (criteria.requiresTools || criteria.supportsTools) {
        if (model.supportsTools) score += 15;
        else {
          score -= 40;
          matchReasons.push("Does not natively support tool calling");
        }
      }

      if (criteria.requiresReasoning || criteria.supportsReasoning) {
        if (model.supportsReasoning) {
          score += 30;
          matchReasons.push("Specialized deep reasoning architecture");
        } else {
          score -= 20;
        }
      }

      // 9. Verified Tier Status
      if (model.verifiedStatus === "verified") score += 10;
      else if (model.verifiedStatus === "community") score -= 5;
      else if (model.verifiedStatus === "deprecated") score -= 80;

      // 10. Consecutive Failure Penalty
      if (model.health.consecutiveFailures > 0) {
        score -= model.health.consecutiveFailures * 15;
      }

      scoredList.push({
        model,
        score,
        matchReasons,
        disqualified,
        disqualifyReason,
      });
    }

    // Sort descending by score, prioritizing non-disqualified models
    return scoredList.sort((a, b) => {
      if (a.disqualified && !b.disqualified) return 1;
      if (!a.disqualified && b.disqualified) return -1;
      return b.score - a.score;
    });
  }

  /**
   * Selects the single best candidate model for a given task
   */
  public selectBestModel(criteria: ModelSelectionCriteria): ModelDescriptor {
    const scored = this.scoreModels(criteria);
    const validCandidates = scored.filter((s) => !s.disqualified);

    if (validCandidates.length > 0) {
      return validCandidates[0].model;
    }

    // Fallback: Return primary general model or top registered
    return this.catalog.get("gemini-2.5-flash") || Array.from(this.catalog.values())[0];
  }

  /**
   * Resolves an ordered fallback chain for resilient multi-provider recovery
   */
  public resolveFallbackChain(criteria: ModelSelectionCriteria, maxChainLength: number = 4): ModelDescriptor[] {
    const scored = this.scoreModels(criteria);
    const valid = scored.filter((s) => !s.disqualified);

    const chain: ModelDescriptor[] = [];
    const seenProviders = new Set<ModelProvider>();

    for (const candidate of valid) {
      // Prioritize provider diversity across the fallback chain
      if (!seenProviders.has(candidate.model.provider) || chain.length >= maxChainLength - 1) {
        chain.push(candidate.model);
        seenProviders.add(candidate.model.provider);
      }
      if (chain.length >= maxChainLength) break;
    }

    // Ensure fallback chain has at least one resilient model
    if (chain.length === 0) {
      const fallback = this.catalog.get("tattva-general-v1") || this.catalog.get("gemini-3.5-flash-lite");
      if (fallback) chain.push(fallback);
    }

    return chain;
  }

  /**
   * Records execution outcome, updating latency metrics and trip circuit breakers if failing
   */
  public recordExecution(
    modelId: string,
    latencyMs: number,
    success: boolean,
    errorMessage?: string
  ): void {
    const model = this.catalog.get(modelId);
    if (!model) return;

    model.health.totalCalls++;
    model.health.lastLatencyMs = latencyMs;
    model.health.lastCheckedAt = Date.now();

    if (success) {
      model.health.successfulCalls++;
      model.health.consecutiveFailures = 0;
      model.health.isHealthy = true;
      model.health.circuitBreakerTrippedUntil = undefined;
      // Rolling average latency
      model.health.averageLatencyMs =
        model.health.averageLatencyMs === 0
          ? latencyMs
          : Math.round(model.health.averageLatencyMs * 0.8 + latencyMs * 0.2);
    } else {
      model.health.consecutiveFailures++;
      model.health.lastError = errorMessage || "Execution error";

      // Trip circuit breaker if consecutive failure threshold is breached
      if (model.health.consecutiveFailures >= this.circuitBreakerFailureThreshold) {
        model.health.isHealthy = false;
        model.health.circuitBreakerTrippedUntil = Date.now() + this.circuitBreakerCooldownMs;
      }
    }
  }

  /**
   * Manually resets circuit breakers for all models
   */
  public resetCircuitBreakers(): void {
    for (const model of this.catalog.values()) {
      model.health.consecutiveFailures = 0;
      model.health.isHealthy = true;
      model.health.circuitBreakerTrippedUntil = undefined;
    }
  }

  /**
   * Provides a comprehensive snapshot of the registry for administration and telemetry
   */
  public getSnapshot(): ModelRegistrySnapshot {
    const models = Array.from(this.catalog.values());
    const healthyModels = models.filter((m) => this.isModelHealthy(m.id)).length;
    const providers = Array.from(new Set(models.map((m) => m.provider)));
    const modelsByProvider: Record<string, number> = {};

    for (const m of models) {
      modelsByProvider[m.provider] = (modelsByProvider[m.provider] || 0) + 1;
    }

    return {
      totalModels: models.length,
      healthyModels,
      providers,
      modelsByProvider,
      models,
      timestamp: Date.now(),
    };
  }
}

export const modelRegistry = ModelRegistry.getInstance();
