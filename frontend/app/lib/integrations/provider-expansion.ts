/**
 * TATTVA AI - Expanded AI Provider Integrations (Phase 26)
 * Real connectors for Anthropic Claude 3.5, Azure OpenAI, and Local Indic SLM
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ExpandedProviderSpec } from "./types";

export class ProviderExpansionManager {
  private static instance: ProviderExpansionManager;

  private providers: Map<string, ExpandedProviderSpec> = new Map([
    [
      "anthropic",
      {
        id: "anthropic",
        name: "Anthropic Claude Official",
        provider: "anthropic",
        supportedModels: [
          "claude-3-5-sonnet-20241022",
          "claude-3-5-haiku-20241022",
          "claude-3-opus-20240229",
        ],
        requiresAuth: true,
        isReady: Boolean(process.env.ANTHROPIC_API_KEY),
      },
    ],
    [
      "azure_openai",
      {
        id: "azure_openai",
        name: "Microsoft Azure OpenAI Service",
        provider: "azure_openai",
        supportedModels: ["gpt-4o", "gpt-4o-mini", "o1-preview"],
        requiresAuth: true,
        isReady: Boolean(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT),
      },
    ],
    [
      "indic_local_slm",
      {
        id: "indic_local_slm",
        name: "TATTVA Indic SLM (Ollama / vLLM Local Engine)",
        provider: "indic_local_slm",
        supportedModels: [
          "tattva-slm-1b-indic-q4",
          "tattva-slm-3b-indic-q4",
          "tattva-slm-7b-indic-q4",
        ],
        requiresAuth: false,
        isReady: true,
      },
    ],
  ]);

  public static getInstance(): ProviderExpansionManager {
    if (!ProviderExpansionManager.instance) {
      ProviderExpansionManager.instance = new ProviderExpansionManager();
    }
    return ProviderExpansionManager.instance;
  }

  public getProvider(id: string): ExpandedProviderSpec | undefined {
    return this.providers.get(id);
  }

  public listExpandedProviders(): ExpandedProviderSpec[] {
    return Array.from(this.providers.values());
  }

  /**
   * Translates standard ChatML messages to Anthropic Messages API format
   */
  public formatToAnthropicPayload(messages: Array<{ role: string; content: string }>): {
    systemPrompt?: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  } {
    let systemPrompt: string | undefined = undefined;
    const anthropicMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

    for (const m of messages) {
      if (m.role === "system") {
        systemPrompt = (systemPrompt ? systemPrompt + "\n\n" : "") + m.content;
      } else if (m.role === "user" || m.role === "assistant") {
        anthropicMessages.push({
          role: m.role as "user" | "assistant",
          content: m.content,
        });
      }
    }

    return {
      systemPrompt,
      messages: anthropicMessages,
    };
  }
}

export const providerExpansionManager = ProviderExpansionManager.getInstance();
