/**
 * TATTVA AI - Google Gemini AI Pro Consumer Subscription Gateway Adapter
 * Enforces Phase 58.2 & Phase 10 Failure Conditions.
 */

import {
  AIProvider,
  ConnectionStatus,
  GenerationOptions,
  TextResult,
  ImageOptions,
  ImageResult,
  UsageStatus,
} from "../types";

export class GeminiConsumerGatewayAdapter implements AIProvider {
  public async connect(): Promise<ConnectionStatus> {
    return {
      isConnected: false,
      providerType: "gemini_consumer",
      providerId: "gemini_consumer",
      name: "Google Gemini AI Pro (Consumer Subscription)",
      accountLabel: "Google One AI Premium",
      errorMessage: "Third-party backend integration is not officially supported by Google for consumer subscriptions.",
      limitationReason: "OFFICIALLY_UNSUPPORTED_CONSUMER_SUBSCRIPTION",
      policyNotice:
        "Google does not provide an official API, OAuth scope, or MCP interface allowing consumer " +
        "Google AI Pro (Google One AI Premium / Gemini Advanced) subscriptions to be utilized by third-party " +
        "server backends. Bypassing this via session extraction or web scraping violates Google Terms of Service " +
        "and is strictly prohibited.",
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
  }

  public async generateText(
    prompt: string,
    options?: GenerationOptions
  ): Promise<TextResult> {
    throw new Error(
      "Consumer Google AI Pro subscription cannot be invoked directly via third-party backend API. " +
      "Google restricts consumer subscriptions to first-party interfaces (gemini.google.com). " +
      "Per TATTVA AI Phase 10 / 58.2 policy, paid API fallback is disabled."
    );
  }

  public async generateImage?(
    prompt: string,
    options?: ImageOptions
  ): Promise<ImageResult> {
    throw new Error(
      "Consumer Google AI Pro subscription image generation is unavailable via backend API."
    );
  }

  public async getUsage?(): Promise<UsageStatus> {
    return {
      planType: "Google One AI Premium (Consumer Subscription)",
      requestsUsed: 0,
      quotaLimit: "unsupported_consumer_quota",
      isQuotaExhausted: true,
      rateLimitPerMinute: 0,
      authoritativeSource: "Google Account & Terms of Service (gemini.google.com)",
    };
  }

  public async disconnect(): Promise<void> {
    // No-op
  }
}
