/**
 * TATTVA AI - Centralized Multi-Provider Model Router & Orchestration Engine
 * Part 3 Architecture: Provider-independent routing across Gemini, Claude, OpenAI, OpenRouter, Nvidia NIM & TATTVA Models
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { GoogleGenAI } from "@google/genai";
import { AIModelSpec, ModelProvider, TaskIntent, TokenUsageMetrics, StreamChunkEvent } from "./types";
import { inspectAndReadDocument } from "../document-engine";
import { modelRegistry, ModelRegistry } from "./model-registry";

export interface ModelCallOptions {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    image?: string;
    attachments?: Array<{ name?: string; type: string; data: string }>;
  }>;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  preferredProvider?: ModelProvider;
  preferredModel?: string;
  timeoutMs?: number;
}

export interface ModelCallResult {
  text: string;
  modelUsed: string;
  provider: ModelProvider;
  latencyMs: number;
  fallbackOccurred: boolean;
  warnings?: string[];
  usage?: TokenUsageMetrics;
}

export class ModelRouter {
  private static instance: ModelRouter;
  private providerCooldowns: Map<string, { until: number; reason: string }> = new Map();
  private modelCooldowns: Map<string, { until: number; reason: string }> = new Map();

  /**
   * Universal Model Catalog
   * Each provider strictly decoupled with its own credentials and capabilities
   */
  private availableModels: AIModelSpec[] = [
    // ------------------------------------------------------------------------
    // 1. Google Gemini Fleet (Required: GEMINI_API_KEY)
    // ------------------------------------------------------------------------
    {
      id: "gemini-3.8-flash",
      name: "Gemini 3.8 Flash",
      provider: "gemini",
      contextWindow: 1048576,
      maxOutputTokens: 8192,
      latencyTier: "ultra_low",
      strengths: ["coding", "reasoning", "mathematics", "document_analysis", "agent_task"],
      isAvailable: false, // Retired / high latency on standard tier
      parameterScale: "Undisclosed",
      supportsStreaming: true,
      supportsVision: true,
      pricingPer1MTokens: { prompt: 0.15, completion: 0.60 },
    },
    {
      id: "gemini-3.5-flash-lite",
      name: "Gemini 3.5 Flash Lite",
      provider: "gemini",
      contextWindow: 1048576,
      maxOutputTokens: 8192,
      latencyTier: "ultra_low",
      strengths: ["general_chat", "translation", "summarization", "agent_task"],
      isAvailable: Boolean(process.env.GEMINI_API_KEY),
      parameterScale: "Undisclosed",
      supportsStreaming: true,
      supportsVision: true,
      pricingPer1MTokens: { prompt: 0.075, completion: 0.30 },
    },
    {
      id: "gemini-3.5-flash",
      name: "Gemini 3.5 Flash",
      provider: "gemini",
      contextWindow: 1048576,
      maxOutputTokens: 8192,
      latencyTier: "low",
      strengths: ["coding", "reasoning", "mathematics", "document_analysis", "agent_task"],
      isAvailable: false, // 20 req/day free tier quota exhausted. Primary routed to gemini-3.5-flash-lite.
      parameterScale: "Undisclosed",
      supportsStreaming: true,
      supportsVision: true,
      pricingPer1MTokens: { prompt: 0.15, completion: 0.60 },
    },
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      provider: "gemini",
      contextWindow: 2097152,
      maxOutputTokens: 8192,
      latencyTier: "medium",
      strengths: ["reasoning", "document_analysis", "web_research"],
      isAvailable: false, // 404 deprecated on AI Studio endpoint
      parameterScale: "Undisclosed",
      supportsStreaming: true,
      supportsVision: true,
      pricingPer1MTokens: { prompt: 1.25, completion: 5.00 },
    },

    // ------------------------------------------------------------------------
    // 2. Anthropic Claude Fleet (Required: ANTHROPIC_API_KEY)
    // ------------------------------------------------------------------------
    {
      id: "claude-3-5-haiku-20241022",
      name: "Claude 3.5 Haiku",
      provider: "anthropic",
      contextWindow: 200000,
      maxOutputTokens: 8192,
      latencyTier: "low",
      strengths: ["coding", "general_chat", "agent_task", "translation"],
      isAvailable: false, // Credit balance depleted (HTTP 400)
      parameterScale: "Undisclosed",
      supportsStreaming: true,
      supportsVision: true,
      pricingPer1MTokens: { prompt: 0.80, completion: 4.00 },
    },
    {
      id: "claude-3-5-sonnet-20241022",
      name: "Claude 3.5 Sonnet",
      provider: "anthropic",
      contextWindow: 200000,
      maxOutputTokens: 8192,
      latencyTier: "medium",
      strengths: ["coding", "reasoning", "mathematics", "document_analysis"],
      isAvailable: false, // Credit balance depleted (HTTP 400)
      parameterScale: "Undisclosed",
      supportsStreaming: true,
      supportsVision: true,
      pricingPer1MTokens: { prompt: 3.00, completion: 15.00 },
    },

    // ------------------------------------------------------------------------
    // 3. OpenAI Fleet (Required: OPENAI_API_KEY)
    // ------------------------------------------------------------------------
    {
      id: "gpt-4o-mini",
      name: "OpenAI GPT-4o Mini",
      provider: "openai",
      contextWindow: 128000,
      maxOutputTokens: 16384,
      latencyTier: "low",
      strengths: ["general_chat", "summarization", "translation", "agent_task"],
      isAvailable: Boolean(process.env.OPENAI_API_KEY),
      parameterScale: "Undisclosed",
      supportsStreaming: true,
      supportsVision: true,
      pricingPer1MTokens: { prompt: 0.15, completion: 0.60 },
    },
    {
      id: "gpt-4o",
      name: "OpenAI GPT-4o",
      provider: "openai",
      contextWindow: 128000,
      maxOutputTokens: 16384,
      latencyTier: "medium",
      strengths: ["coding", "reasoning", "mathematics", "document_analysis"],
      isAvailable: Boolean(process.env.OPENAI_API_KEY),
      parameterScale: "Undisclosed",
      supportsStreaming: true,
      supportsVision: true,
      pricingPer1MTokens: { prompt: 2.50, completion: 10.00 },
    },
    {
      id: "o1-mini",
      name: "OpenAI o1-mini",
      provider: "openai",
      contextWindow: 128000,
      maxOutputTokens: 65536,
      latencyTier: "high",
      strengths: ["mathematics", "reasoning", "coding"],
      isAvailable: Boolean(process.env.OPENAI_API_KEY),
      parameterScale: "Undisclosed",
      supportsStreaming: false,
      supportsVision: false,
      pricingPer1MTokens: { prompt: 1.10, completion: 4.40 },
    },

    // ------------------------------------------------------------------------
    // 4. OpenRouter Fleet (Required: OPENROUTER_API_KEY)
    // ------------------------------------------------------------------------
    {
      id: "meta-llama/llama-3.3-70b-instruct",
      name: "Llama 3.3 70B Instruct",
      provider: "openrouter",
      contextWindow: 131072,
      maxOutputTokens: 4096,
      latencyTier: "medium",
      strengths: ["coding", "reasoning", "general_chat"],
      isAvailable: Boolean(process.env.OPENROUTER_API_KEY),
      parameterScale: "70B",
      supportsStreaming: true,
      supportsVision: false,
      pricingPer1MTokens: { prompt: 0.12, completion: 0.30 },
    },
    {
      id: "deepseek/deepseek-chat",
      name: "DeepSeek V3 Chat",
      provider: "openrouter",
      contextWindow: 65536,
      maxOutputTokens: 4096,
      latencyTier: "medium",
      strengths: ["reasoning", "mathematics", "coding", "general_chat"],
      isAvailable: Boolean(process.env.OPENROUTER_API_KEY),
      parameterScale: "671B MoE",
      supportsStreaming: true,
      supportsVision: false,
      pricingPer1MTokens: { prompt: 0.14, completion: 0.28 },
    },

    // ------------------------------------------------------------------------
    // 5. Nvidia NIM Fleet (Required: NVIDIA_API_KEY)
    // ------------------------------------------------------------------------
    {
      id: "meta/llama-3.1-70b-instruct",
      name: "Nvidia NIM Llama 3.1 70B",
      provider: "nvidia",
      contextWindow: 128000,
      maxOutputTokens: 4096,
      latencyTier: "low",
      strengths: ["coding", "reasoning", "mathematics"],
      isAvailable: false, // EOL 410 from Nvidia NIM API
      parameterScale: "70B",
      supportsStreaming: true,
      supportsVision: false,
      pricingPer1MTokens: { prompt: 0.15, completion: 0.40 },
    },

    // ------------------------------------------------------------------------
    // 6. TATTVA Proprietary Models (Target Architecture / Local Serving)
    // ------------------------------------------------------------------------
    {
      id: "tattva-qwen-1.5b-math",
      name: "TATTVA Math 1.5B (Specialized Qwen SFT)",
      provider: "tattva",
      contextWindow: 32768,
      maxOutputTokens: 4096,
      latencyTier: "ultra_low",
      strengths: ["mathematics", "reasoning", "coding"],
      isAvailable: true,
      parameterScale: "1.54B",
      supportsStreaming: true,
      supportsVision: false,
      pricingPer1MTokens: { prompt: 0.0, completion: 0.0 },
    },
    {
      id: "tattva-llama-1b-chat",
      name: "TATTVA Edge Chat 1B (Llama 3.2 SLM)",
      provider: "tattva",
      contextWindow: 131072,
      maxOutputTokens: 4096,
      latencyTier: "ultra_low",
      strengths: ["general_chat", "agent_task", "summarization"],
      isAvailable: true,
      parameterScale: "1.23B",
      supportsStreaming: true,
      supportsVision: false,
      pricingPer1MTokens: { prompt: 0.0, completion: 0.0 },
    },
    {
      id: "tattva-indic-1.5b",
      name: "TATTVA Indic Telugu 1.5B (Aya Multilingual SLM)",
      provider: "tattva",
      contextWindow: 32768,
      maxOutputTokens: 4096,
      latencyTier: "ultra_low",
      strengths: ["multilingual", "translation", "reasoning"],
      isAvailable: true,
      parameterScale: "1.54B",
      supportsStreaming: true,
      supportsVision: false,
      pricingPer1MTokens: { prompt: 0.0, completion: 0.0 },
    },
  ];

  public static getInstance(): ModelRouter {
    if (!ModelRouter.instance) {
      ModelRouter.instance = new ModelRouter();
    }
    return ModelRouter.instance;
  }

  /**
   * Access the Unified Multi-Modal Model Registry & Scorer
   */
  public getRegistry(): ModelRegistry {
    return modelRegistry;
  }

  /**
   * Dynamically checks if a model provider's credential is configured and active
   * Checks circuit-breaker cooldowns to prevent repetitive timeouts on exhausted providers
   */
  public isModelAvailable(spec: AIModelSpec): boolean {
    if (spec.id === "meta/llama-3.1-70b-instruct") {
      return false;
    }
    const modelCool = this.modelCooldowns.get(spec.id);
    if (modelCool && Date.now() < modelCool.until) {
      return false;
    }
    const cooldown = this.providerCooldowns.get(spec.provider);
    if (cooldown && Date.now() < cooldown.until) {
      return false;
    }
    const cleanKey = (key?: string) => Boolean(key?.replace(/^["']|["']$/g, "").trim());
    if (spec.provider === "gemini") return cleanKey(process.env.GEMINI_API_KEY);
    if (spec.provider === "anthropic") return cleanKey(process.env.ANTHROPIC_API_KEY);
    if (spec.provider === "openai") return cleanKey(process.env.OPENAI_API_KEY);
    if (spec.provider === "openrouter") return cleanKey(process.env.OPENROUTER_API_KEY);
    if (spec.provider === "nvidia") return cleanKey(process.env.NVIDIA_API_KEY);
    if (spec.provider === "tattva" || spec.provider === "local") return Boolean(process.env.TATTVA_LOCAL_ENDPOINT);
    return false;
  }

  /**
   * Temporarily suppresses a specific exhausted or rate-limited model (circuit-breaker)
   */
  public recordModelExhaustion(modelId: string, reason: string, cooldownMs: number = 1800000): void {
    this.modelCooldowns.set(modelId, {
      until: Date.now() + cooldownMs,
      reason,
    });
    console.warn(`[ModelRouter CircuitBreaker] Model '${modelId}' cooling down for ${cooldownMs / 1000}s. Reason: ${reason}`);
  }

  /**
   * Temporarily suppresses an exhausted or unconfigured provider (circuit-breaker)
   */
  public recordProviderExhaustion(provider: string, reason: string, cooldownMs: number = 900000): void {
    this.providerCooldowns.set(provider, {
      until: Date.now() + cooldownMs,
      reason,
    });
    console.warn(`[ModelRouter CircuitBreaker] Provider '${provider}' cooling down for ${cooldownMs / 1000}s. Reason: ${reason}`);
  }

  /**
   * Returns complete catalog of registered models with live dynamic availability status
   */
  public getModelCatalog(): AIModelSpec[] {
    return this.availableModels.map((m) => ({
      ...m,
      isAvailable: this.isModelAvailable(m),
    }));
  }

  /**
   * Selects an ordered list of candidate models optimized for the specific task intent and complexity,
   * grounded in empirical Phase 33 benchmark performance.
   */
  public selectCandidateModels(
    intent: TaskIntent,
    complexity: number,
    preferredProvider?: ModelProvider,
    preferredModel?: string,
    options?: ModelCallOptions
  ): AIModelSpec[] {
    const activeModels = this.getModelCatalog();
    const candidates: AIModelSpec[] = [];

    const hasVisionAttachment = options?.messages?.some(
      (m) => Boolean(m.image) || m.attachments?.some((a) => a.type.startsWith("image/") || a.data?.includes(";base64,"))
    );

    // 1. Explicit model preference
    if (preferredModel) {
      const explicit = activeModels.find((m) => m.id === preferredModel);
      if (explicit && explicit.isAvailable) candidates.push(explicit);
    }

    // 2. Multimodal Vision Guardrail: NEVER route vision queries to text-only models
    if (hasVisionAttachment) {
      const visionModels = activeModels.filter((m) => m.supportsVision && m.isAvailable && !candidates.includes(m));
      candidates.push(...visionModels);
    }

    // 3. Preferred provider preference
    if (preferredProvider) {
      const providerModels = activeModels.filter(
        (m) => m.provider === preferredProvider && m.isAvailable && !candidates.includes(m)
      );
      candidates.push(...providerModels);
    }

    // 4. Empirical Benchmark-Weighted Candidate Routing:
    // A. Mathematics & Quantitative Reasoning -> Prioritize DeepSeek V3 (100% empirical benchmark score)
    if (intent === "mathematics" || intent === "reasoning") {
      const deepseekChat = activeModels.find((m) => m.id === "deepseek/deepseek-chat" && m.isAvailable);
      if (deepseekChat && !candidates.includes(deepseekChat)) candidates.push(deepseekChat);

      const geminiFast = activeModels.find((m) => m.id === "gemini-3.5-flash-lite" && m.isAvailable);
      if (geminiFast && !candidates.includes(geminiFast)) candidates.push(geminiFast);

      const llama70b = activeModels.find((m) => m.id === "meta-llama/llama-3.3-70b-instruct" && m.isAvailable);
      if (llama70b && !candidates.includes(llama70b)) candidates.push(llama70b);
    }

    // B. Interactive Coding, Application Generation & Low-Latency -> Prioritize Gemini 3.5 Flash Lite
    if (intent === "coding" || intent === "agent_task" || intent === "troubleshooting") {
      const geminiFast = activeModels.find((m) => m.id === "gemini-3.5-flash-lite" && m.isAvailable);
      if (geminiFast && !candidates.includes(geminiFast)) candidates.push(geminiFast);

      const llama70b = activeModels.find((m) => m.id === "meta-llama/llama-3.3-70b-instruct" && m.isAvailable);
      if (llama70b && !candidates.includes(llama70b)) candidates.push(llama70b);

      const deepseekChat = activeModels.find((m) => m.id === "deepseek/deepseek-chat" && m.isAvailable);
      if (deepseekChat && !candidates.includes(deepseekChat)) candidates.push(deepseekChat);
    }

    // C. Document Analysis & Multimodal Understanding
    if (intent === "document_analysis" || intent === "data_analysis") {
      const geminiFast = activeModels.find((m) => m.id === "gemini-3.5-flash-lite" && m.isAvailable);
      if (geminiFast && !candidates.includes(geminiFast)) candidates.push(geminiFast);

      const deepseekChat = activeModels.find((m) => m.id === "deepseek/deepseek-chat" && m.isAvailable);
      if (deepseekChat && !candidates.includes(deepseekChat)) candidates.push(deepseekChat);
    }

    // D. General Chat, QA, Multilingual, Creative & Translation
    if (
      intent === "general_chat" ||
      intent === "general_qa" ||
      intent === "conversational" ||
      intent === "translation" ||
      intent === "multilingual" ||
      intent === "creative_writing" ||
      intent === "summarization"
    ) {
      const geminiFast = activeModels.find((m) => m.id === "gemini-3.5-flash-lite" && m.isAvailable);
      if (geminiFast && !candidates.includes(geminiFast)) candidates.push(geminiFast);

      const llama70b = activeModels.find((m) => m.id === "meta-llama/llama-3.3-70b-instruct" && m.isAvailable);
      if (llama70b && !candidates.includes(llama70b)) candidates.push(llama70b);
    }

    // D. Remaining available models
    for (const m of activeModels) {
      if (m.isAvailable && !candidates.includes(m)) {
        candidates.push(m);
      }
    }

    // Safety guarantee: If all candidates were temporarily cooled down, revive primary models
    if (candidates.length === 0) {
      const primaryGemini = this.availableModels.find((m) => m.id === "gemini-3.5-flash-lite");
      if (primaryGemini && process.env.GEMINI_API_KEY) {
        candidates.push(primaryGemini);
      }
      const llamaFallback = this.availableModels.find((m) => m.id === "meta-llama/llama-3.3-70b-instruct");
      if (llamaFallback && process.env.OPENROUTER_API_KEY) {
        candidates.push(llamaFallback);
      }
    }

    return candidates;
  }

  /**
   * Dispatches generation to the best available candidate with seamless failover,
   * token tracking, and cost accounting
   */
  public async executeWithFallback(
    intent: TaskIntent,
    complexity: number,
    options: ModelCallOptions
  ): Promise<ModelCallResult> {
    const candidates = this.selectCandidateModels(
      intent,
      complexity,
      options.preferredProvider,
      options.preferredModel,
      options
    );

    let fallbackOccurred = false;
    const warnings: string[] = [];
    const overallTimeoutMs = options.timeoutMs || 35000;
    const globalDeadline = Date.now() + overallTimeoutMs;

    for (let i = 0; i < candidates.length; i++) {
      const remainingMs = globalDeadline - Date.now();
      if (remainingMs < 4000) {
        warnings.push(`Model failover loop reached deadline (${overallTimeoutMs}ms); activating fast intelligence fallback.`);
        console.warn(`[ModelRouter] Remaining time budget ${remainingMs}ms is below minimum threshold (4000ms). Activating fast fallback.`);
        break;
      }

      const model = candidates[i];
      const startTime = Date.now();
      const perModelTimeout = Math.min(15000, remainingMs - 1000);
      const modelOptions: ModelCallOptions = {
        ...options,
        timeoutMs: perModelTimeout,
      };

      try {
        let textResult = "";

        if (model.provider === "gemini") {
          textResult = await this.callGemini(model.id, modelOptions);
        } else if (model.provider === "anthropic") {
          textResult = await this.callAnthropic(model.id, modelOptions);
        } else if (model.provider === "openai") {
          textResult = await this.callOpenAI(model.id, modelOptions);
        } else if (model.provider === "openrouter") {
          textResult = await this.callOpenRouter(model.id, modelOptions);
        } else if (model.provider === "nvidia") {
          textResult = await this.callNvidia(model.id, modelOptions);
        } else if (model.provider === "tattva" || model.provider === "local") {
          textResult = await this.callTattvaLocal(model.id, modelOptions);
        }

        if (textResult && textResult.trim().length > 0) {
          const usage = this.calculateUsage(options, textResult, model);
          return {
            text: textResult.trim(),
            modelUsed: model.name,
            provider: model.provider,
            latencyMs: Date.now() - startTime,
            fallbackOccurred: i > 0,
            warnings: warnings.length > 0 ? warnings : undefined,
            usage,
          };
        }
      } catch (err) {
        fallbackOccurred = true;
        const errMsg = err instanceof Error ? err.message : String(err);
        warnings.push(`Model ${model.name} (${model.provider}) failed: ${errMsg}`);
        console.warn(`[ModelRouter] Failover trigger: ${model.name} failed (${errMsg.slice(0, 120)}) -> Trying next candidate...`);
        // Fast circuit-breaker: if rate-limited (429), overloaded (503), or timed out, cool down with adaptive intervals
        if (errMsg.includes("429")) {
          this.recordModelExhaustion(model.id, errMsg.slice(0, 80), 8000);
        } else if (errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("overloaded")) {
          this.recordModelExhaustion(model.id, errMsg.slice(0, 80), 2500);
        } else if (errMsg.includes("timeout") || errMsg.includes("aborted")) {
          this.recordModelExhaustion(model.id, errMsg.slice(0, 80), 4000);
        }
      }
    }

    // Fast Intelligent Fallback Engine for instant response if external providers are unavailable
    console.log("[ModelRouter] Activating TATTVA Provider Status Fallback");
    const latestUserMsg = [...options.messages].reverse().find((m) => m.role === "user")?.content || "";
    const synthesizedAnswer = this.synthesizeFastResponse(latestUserMsg, intent, warnings);

    return {
      text: synthesizedAnswer,
      modelUsed: "TATTVA-System-Fallback",
      provider: "gemini",
      latencyMs: 120,
      fallbackOccurred: true,
      warnings,
      usage: {
        promptTokens: Math.ceil(latestUserMsg.length / 4),
        completionTokens: Math.ceil(synthesizedAnswer.length / 4),
        totalTokens: Math.ceil((latestUserMsg.length + synthesizedAnswer.length) / 4),
        estimatedCostUsd: 0.0,
      },
    };
  }

  // ==========================================================================
  // PROVIDER ADAPTERS (Each with dedicated isolated credentials)
  // ==========================================================================

  /**
   * 1. Google Gemini Adapter
   */
  private async callGemini(modelId: string, options: ModelCallOptions): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY?.replace(/^["']|["']$/g, "").trim();
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY environment credential");

    const ai = new GoogleGenAI({ apiKey });
    const contents: any[] = [];

    for (const msg of options.messages) {
      if (msg.role === "system") continue;
      const parts: any[] = [];

      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.data && att.data.includes(";base64,")) {
            const [hdr, b64] = att.data.split(";base64,");
            const claimedMime = (hdr.replace("data:", "") || "application/octet-stream").toLowerCase();
            try {
              const buf = Buffer.from(b64, "base64");
              const doc = await inspectAndReadDocument(buf, att.name || "document", claimedMime);

              if (claimedMime.startsWith("image/") || doc.detectedMime.startsWith("image/")) {
                parts.push({ inlineData: { mimeType: doc.detectedMime || claimedMime, data: b64 } });
              } else if (claimedMime === "application/pdf" || doc.detectedMime === "application/pdf") {
                parts.push({ inlineData: { mimeType: "application/pdf", data: b64 } });
                if (doc.extractedText && doc.extractedText.trim().length > 0) {
                  parts.push({
                    text: `\n\n[EXTRACTED TEXT FROM PDF: ${att.name || "document"}]:\n${doc.extractedText}\n`,
                  });
                }
              } else {
                parts.push({
                  text: `\n\n[ATTACHED FILE: ${att.name || "document"} (${doc.detectedMime || claimedMime})]:\n\`\`\`\n${doc.extractedText || "No readable text content."}\n\`\`\`\n`,
                });
              }
            } catch {
              if (claimedMime.startsWith("image/") || claimedMime === "application/pdf") {
                parts.push({ inlineData: { mimeType: claimedMime, data: b64 } });
              }
            }
          }
        }
      }

      parts.push({ text: msg.content });
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts,
      });
    }

    const runWithTimeout = async (targetModel: string) => {
      const callPromise = ai.models.generateContent({
        model: targetModel,
        contents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens,
        },
      });
      const timeoutMs = options.timeoutMs || 15000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Gemini request to ${targetModel} timed out after ${timeoutMs}ms`)), timeoutMs)
      );
      return Promise.race([callPromise, timeoutPromise]);
    };

    try {
      const res = await runWithTimeout(modelId);
      return res.text || "";
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      // Fast retry on transient 503 / high-demand spike
      if (errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("spikes in demand")) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          const retryRes = await runWithTimeout(modelId);
          return retryRes.text || "";
        } catch {
          // If retry fails, continue to fallback below
        }
      }
      // Auto-fallback to gemini-3.5-flash-lite if requested model is deprecated / not found or quota exhausted
      if (
        (errMsg.includes("no longer available") ||
          errMsg.includes("404") ||
          errMsg.includes("NOT_FOUND") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("quota exceeded")) &&
        modelId !== "gemini-3.5-flash-lite"
      ) {
        if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota exceeded")) {
          this.recordModelExhaustion(modelId, "Daily quota limit reached (HTTP 429)", 1800000);
        }
        try {
          const fallbackRes = await runWithTimeout("gemini-3.5-flash-lite");
          return fallbackRes.text || "";
        } catch {
          // If fallback also fails, continue to standard error handling
        }
      }
      throw err;
    }
  }

  /**
   * 2. Anthropic Claude Adapter
   */
  private async callAnthropic(modelId: string, options: ModelCallOptions): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY?.replace(/^["']|["']$/g, "").trim();
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY environment credential");

    const claudeMessages: any[] = options.messages
      .filter((m) => m.role !== "system")
      .map((m) => {
        const contentBlocks: any[] = [];
        if (m.attachments && m.attachments.length > 0) {
          for (const att of m.attachments) {
            if (att.data && att.data.includes(";base64,")) {
              const [hdr, b64] = att.data.split(";base64,");
              const mime = hdr.replace("data:", "").toLowerCase();
              if (mime.startsWith("image/")) {
                contentBlocks.push({
                  type: "image",
                  source: { type: "base64", media_type: mime, data: b64 },
                });
              }
            }
          }
        }
        contentBlocks.push({ type: "text", text: m.content });
        return {
          role: m.role === "assistant" ? "assistant" : "user",
          content: contentBlocks,
        };
      });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: options.maxTokens || 4096,
        system: options.systemInstruction,
        messages: claudeMessages,
        temperature: options.temperature ?? 0.7,
      }),
      signal: AbortSignal.timeout(options.timeoutMs || 15000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      let parsedMsg = errBody;
      try {
        const parsed = JSON.parse(errBody);
        parsedMsg = parsed.error?.message || errBody;
      } catch {}
      if (parsedMsg.includes("credit balance is too low")) {
        this.recordProviderExhaustion("anthropic", "Anthropic credit balance is depleted (HTTP 400)", 1800000);
      }
      throw new Error(`Anthropic Claude HTTP ${res.status}: ${parsedMsg}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || "";
  }

  /**
   * 3. OpenAI Adapter
   */
  private async callOpenAI(modelId: string, options: ModelCallOptions): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY?.replace(/^["']|["']$/g, "").trim();
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY environment credential");

    const openAiMessages: any[] = options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (options.systemInstruction) {
      openAiMessages.unshift({ role: "system", content: options.systemInstruction });
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages: openAiMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 4096,
      }),
      signal: AbortSignal.timeout(options.timeoutMs || 15000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      let parsedMsg = errBody;
      try {
        const parsed = JSON.parse(errBody);
        parsedMsg = parsed.error?.message || errBody;
      } catch {}
      throw new Error(`OpenAI HTTP ${res.status}: ${parsedMsg}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  /**
   * 4. OpenRouter Adapter
   */
  private async callOpenRouter(modelId: string, options: ModelCallOptions): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY?.replace(/^["']|["']$/g, "").trim();
    if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY environment credential");

    const openRouterMessages: any[] = options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (options.systemInstruction) {
      openRouterMessages.unshift({ role: "system", content: options.systemInstruction });
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://tattva-ai-phi.vercel.app",
        "X-Title": "TATTVA AI",
      },
      body: JSON.stringify({
        model: modelId,
        messages: openRouterMessages,
        temperature: options.temperature ?? 0.7,
      }),
      signal: AbortSignal.timeout(options.timeoutMs || 20000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`OpenRouter HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  /**
   * 5. Nvidia NIM Adapter
   */
  private async callNvidia(modelId: string, options: ModelCallOptions): Promise<string> {
    const apiKey = process.env.NVIDIA_API_KEY?.replace(/^["']|["']$/g, "").trim();
    if (!apiKey) throw new Error("Missing NVIDIA_API_KEY environment credential");

    const nvidiaMessages = options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (options.systemInstruction) {
      nvidiaMessages.unshift({ role: "system", content: options.systemInstruction });
    }

    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages: nvidiaMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 4096,
      }),
      signal: AbortSignal.timeout(options.timeoutMs || 20000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Nvidia NIM HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  /**
   * 6. TATTVA Local Serving Adapter
   */
  private async callTattvaLocal(modelId: string, options: ModelCallOptions): Promise<string> {
    const localEndpoint = process.env.TATTVA_LOCAL_ENDPOINT || "http://127.0.0.1:8000/v1/chat/completions";

    const localMessages = options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (options.systemInstruction) {
      localMessages.unshift({ role: "system", content: options.systemInstruction });
    }

    const res = await fetch(localEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelId,
        messages: localMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 2048,
      }),
      signal: AbortSignal.timeout(options.timeoutMs || 5000),
    });

    if (!res.ok) {
      throw new Error(`TATTVA Local Engine HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  // ==========================================================================
  // TOKEN & COST ACCOUNTING
  // ==========================================================================

  private calculateUsage(options: ModelCallOptions, completionText: string, model: AIModelSpec): TokenUsageMetrics {
    const promptChars = options.messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
    const completionChars = completionText.length;

    // Approximate token count (1 token ~= 4 chars)
    const promptTokens = Math.max(1, Math.ceil(promptChars / 4));
    const completionTokens = Math.max(1, Math.ceil(completionChars / 4));
    const totalTokens = promptTokens + completionTokens;

    let estimatedCostUsd = 0.0;
    if (model.pricingPer1MTokens) {
      const promptCost = (promptTokens / 1000000) * model.pricingPer1MTokens.prompt;
      const completionCost = (completionTokens / 1000000) * model.pricingPer1MTokens.completion;
      estimatedCostUsd = Number((promptCost + completionCost).toFixed(6));
    }

    return {
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd,
    };
  }

  // ==========================================================================
  // FAST SYNTHESIS FALLBACK (Honest provider status reporting)
  // ==========================================================================

  private synthesizeFastResponse(prompt: string, intent: TaskIntent, warnings: string[] = []): string {
    const cleanPrompt = prompt.slice(0, 150).trim();
    const promptSnippet = cleanPrompt ? `> "${cleanPrompt}${prompt.length > 150 ? "..." : ""}"\n` : "";

    const diagnosticBullets =
      warnings.length > 0
        ? warnings.map((w) => `- ${w}`).join("\n")
        : "- All configured upstream providers timed out or were temporarily unreachable within the allotted deadline budget.";

    return `### ⚠️ Service Notice: AI Providers Temporarily Unavailable

I was unable to complete the generation for your request:
${promptSnippet}
#### Incident Diagnostics
${diagnosticBullets}

#### Recommended Actions
1. **Retry in a few moments**: The upstream AI provider may be recovering from a brief network disruption, rate-limiting spike, or cold start.
2. **Select an alternate model**: Switch to an alternate AI model (e.g., DeepSeek V3 or Gemini 3.5 Flash) in your session preferences.
3. **Check configuration**: If running locally, verify that \`GEMINI_API_KEY\` or \`OPENROUTER_API_KEY\` are populated and have available usage quota.

*TATTVA AI does not generate fictitious or ungrounded template responses when live models fail.*`;
  }
}

export const modelRouter = ModelRouter.getInstance();
