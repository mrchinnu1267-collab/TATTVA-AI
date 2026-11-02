/**
 * TATTVA AI - Multi-Provider Model Orchestration & Intelligent Fallback Engine
 * Routes requests across Gemini, OpenRouter, Nvidia NIM, and HuggingFace
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { GoogleGenAI } from "@google/genai";
import { AIModelSpec, ModelProvider, TaskIntent } from "./types";

export interface ModelCallOptions {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    image?: string;
    attachments?: Array<{ type: string; data: string }>;
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
}

export class ModelRouter {
  private static instance: ModelRouter;

  private availableModels: AIModelSpec[] = [
    // Gemini Fleet
    {
      id: "gemini-3.5-flash-lite",
      name: "Gemini 3.5 Flash Lite",
      provider: "gemini",
      contextWindow: 1048576,
      maxOutputTokens: 8192,
      latencyTier: "ultra_low",
      strengths: ["general_chat", "translation", "summarization", "voice_chat"],
      isAvailable: Boolean(process.env.GEMINI_API_KEY),
    },
    {
      id: "gemini-3.6-flash",
      name: "Gemini 3.6 Flash",
      provider: "gemini",
      contextWindow: 1048576,
      maxOutputTokens: 8192,
      latencyTier: "low",
      strengths: ["coding", "reasoning", "mathematics", "document_analysis", "agent_task"],
      isAvailable: Boolean(process.env.GEMINI_API_KEY),
    },
    // OpenRouter Fleet
    {
      id: "meta-llama/llama-3.3-70b-instruct:free",
      name: "Llama 3.3 70B Instruct",
      provider: "openrouter",
      contextWindow: 131072,
      maxOutputTokens: 4096,
      latencyTier: "medium",
      strengths: ["coding", "reasoning", "general_chat"],
      isAvailable: Boolean(process.env.OPENROUTER_API_KEY),
    },
    {
      id: "deepseek/deepseek-r1:free",
      name: "DeepSeek R1 Reasoning",
      provider: "openrouter",
      contextWindow: 65536,
      maxOutputTokens: 4096,
      latencyTier: "medium",
      strengths: ["reasoning", "mathematics", "coding"],
      isAvailable: Boolean(process.env.OPENROUTER_API_KEY),
    },
    // Nvidia NIM Fleet
    {
      id: "meta/llama-3.1-70b-instruct",
      name: "Nvidia NIM Llama 3.1 70B",
      provider: "nvidia",
      contextWindow: 128000,
      maxOutputTokens: 4096,
      latencyTier: "low",
      strengths: ["coding", "reasoning", "mathematics"],
      isAvailable: Boolean(process.env.NVIDIA_API_KEY),
    },
  ];

  public static getInstance(): ModelRouter {
    if (!ModelRouter.instance) {
      ModelRouter.instance = new ModelRouter();
    }
    return ModelRouter.instance;
  }

  /**
   * Selects an ordered list of candidate models optimized for the specific task intent and complexity
   */
  public selectCandidateModels(
    intent: TaskIntent,
    complexity: number,
    preferredProvider?: ModelProvider,
    preferredModel?: string
  ): AIModelSpec[] {
    const candidates: AIModelSpec[] = [];

    // If explicit model requested and matches
    if (preferredModel) {
      const explicit = this.availableModels.find((m) => m.id === preferredModel);
      if (explicit && explicit.isAvailable) candidates.push(explicit);
    }

    // High complexity tasks: prioritize high-capacity reasoning models
    if (complexity >= 7 || intent === "coding" || intent === "mathematics" || intent === "agent_task") {
      const geminiHeavy = this.availableModels.find((m) => m.id === "gemini-3.6-flash" && m.isAvailable);
      if (geminiHeavy && !candidates.includes(geminiHeavy)) candidates.push(geminiHeavy);

      const openrouterReasoning = this.availableModels.find(
        (m) => m.provider === "openrouter" && m.isAvailable && m.strengths.includes(intent)
      );
      if (openrouterReasoning && !candidates.includes(openrouterReasoning)) candidates.push(openrouterReasoning);

      const nvidiaHeavy = this.availableModels.find((m) => m.provider === "nvidia" && m.isAvailable);
      if (nvidiaHeavy && !candidates.includes(nvidiaHeavy)) candidates.push(nvidiaHeavy);
    }

    // Fast conversational models
    const geminiFast = this.availableModels.find((m) => m.id === "gemini-3.5-flash-lite" && m.isAvailable);
    if (geminiFast && !candidates.includes(geminiFast)) candidates.push(geminiFast);

    // Remaining available providers
    for (const m of this.availableModels) {
      if (m.isAvailable && !candidates.includes(m)) {
        candidates.push(m);
      }
    }

    return candidates;
  }

  /**
   * Dispatches generation to the best available candidate with seamless failover
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
      options.preferredModel
    );

    if (candidates.length === 0) {
      throw new Error("No configured AI model providers are available. Please configure GEMINI_API_KEY, OPENROUTER_API_KEY, or NVIDIA_API_KEY.");
    }

    let fallbackOccurred = false;
    const warnings: string[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const model = candidates[i];
      const startTime = Date.now();
      try {
        let textResult = "";

        if (model.provider === "gemini") {
          textResult = await this.callGemini(model.id, options);
        } else if (model.provider === "openrouter") {
          textResult = await this.callOpenRouter(model.id, options);
        } else if (model.provider === "nvidia") {
          textResult = await this.callNvidia(model.id, options);
        }

        if (textResult && textResult.trim().length > 0) {
          return {
            text: textResult.trim(),
            modelUsed: model.name,
            provider: model.provider,
            latencyMs: Date.now() - startTime,
            fallbackOccurred: i > 0,
            warnings: warnings.length > 0 ? warnings : undefined,
          };
        }
      } catch (err) {
        fallbackOccurred = true;
        const errMsg = err instanceof Error ? err.message : String(err);
        warnings.push(`Model ${model.name} (${model.provider}) failed: ${errMsg}`);
        console.warn(`[ModelRouter] Failover trigger: ${model.name} failed -> Trying next candidate...`);
      }
    }

    throw new Error(`All candidate AI models failed: ${warnings.join("; ")}`);
  }

  /**
   * Gemini execution via @google/genai
   */
  private async callGemini(modelId: string, options: ModelCallOptions): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const ai = new GoogleGenAI({ apiKey });
    const contents: any[] = [];

    for (const msg of options.messages) {
      if (msg.role === "system") continue;
      const parts: any[] = [];

      // Multimodal attachments
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.data && att.data.includes(";base64,")) {
            const [hdr, b64] = att.data.split(";base64,");
            const mimeType = hdr.replace("data:", "") || "image/png";
            parts.push({ inlineData: { mimeType, data: b64 } });
          }
        }
      }

      parts.push({ text: msg.content });
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts,
      });
    }

    const res = await ai.models.generateContent({
      model: modelId,
      contents,
      config: {
        systemInstruction: options.systemInstruction,
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens,
      },
    });

    return res.text || "";
  }

  /**
   * OpenRouter execution (OpenAI Compatible)
   */
  private async callOpenRouter(modelId: string, options: ModelCallOptions): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

    const openRouterMessages = options.messages.map((m) => ({
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
        "HTTP-Referer": "https://tattva-ai.org",
        "X-Title": "TATTVA AI",
      },
      body: JSON.stringify({
        model: modelId,
        messages: openRouterMessages,
        temperature: options.temperature ?? 0.7,
      }),
      signal: AbortSignal.timeout(options.timeoutMs || 25000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`OpenRouter HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  /**
   * Nvidia NIM execution
   */
  private async callNvidia(modelId: string, options: ModelCallOptions): Promise<string> {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) throw new Error("Missing NVIDIA_API_KEY");

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
      signal: AbortSignal.timeout(options.timeoutMs || 25000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Nvidia NIM HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }
}

export const modelRouter = ModelRouter.getInstance();
