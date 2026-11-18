/**
 * TATTVA AI - Google Gemini API Adapter (Gateway)
 * Implements AIProvider for official Google AI Studio developer API credentials.
 */

import { GoogleGenAI } from "@google/genai";
import {
  AIProvider,
  ConnectionStatus,
  GenerationOptions,
  TextResult,
  ImageOptions,
  ImageResult,
  UsageStatus,
} from "../types";

export class GeminiApiGatewayAdapter implements AIProvider {
  private client: GoogleGenAI | null = null;
  private apiKey: string | null = null;
  private isConnected: boolean = false;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private readonly RATE_LIMIT_RPM = 15;

  constructor(customKey?: string) {
    this.apiKey = customKey || null;
  }

  private getEffectiveApiKey(): string | null {
    if (this.apiKey) return this.apiKey;
    const envKey = process.env.GEMINI_API_KEY?.replace(/^["']|["']$/g, "").trim();
    if (envKey) {
      this.apiKey = envKey;
      return envKey;
    }
    return null;
  }

  public async connect(): Promise<ConnectionStatus> {
    const key = this.getEffectiveApiKey();
    if (!key) {
      this.isConnected = false;
      return {
        isConnected: false,
        providerType: "gemini_api",
        providerId: "gemini_api",
        name: "Google Gemini Developer API",
        accountLabel: "Google AI Studio",
        errorMessage: "GEMINI_API_KEY not configured.",
        limitationReason: "MISSING_CREDENTIALS",
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

    try {
      this.client = new GoogleGenAI({ apiKey: key });

      // Lightweight probe
      const res = await this.client.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: "PING",
        config: { maxOutputTokens: 5, temperature: 0 },
      });

      if (!res || !res.text) {
        throw new Error("No response received from Google Gemini API probe.");
      }

      this.isConnected = true;
      return {
        isConnected: true,
        providerType: "gemini_api",
        providerId: "gemini_api",
        name: "Google Gemini Developer API (Verified Live)",
        accountLabel: "Google AI Studio",
        policyNotice: "Connected via official Google Generative Language API credentials.",
        capabilities: {
          text: true,
          reasoning: true,
          coding: true,
          image: false, // Standard Flash models do not generate images directly
          document: true,
          summarization: true,
          dataAnalysis: true,
          knowledgeRetrieval: true,
          multimodal: true,
        },
      };
    } catch (err: any) {
      this.isConnected = false;
      return {
        isConnected: false,
        providerType: "gemini_api",
        providerId: "gemini_api",
        name: "Google Gemini Developer API",
        errorMessage: err.message || "Failed to authenticate with Google Gemini API.",
        limitationReason: "AUTHENTICATION_FAILED",
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
  }

  public async generateText(
    prompt: string,
    options?: GenerationOptions
  ): Promise<TextResult> {
    if (!this.isConnected || !this.client) {
      const conn = await this.connect();
      if (!conn.isConnected || !this.client) {
        throw new Error(`Gemini Developer API is not connected: ${conn.errorMessage}`);
      }
    }

    const now = Date.now();
    if (now - this.lastResetTime > 60_000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    if (this.requestCount >= this.RATE_LIMIT_RPM) {
      throw new Error(`Gemini rate limit exceeded (${this.RATE_LIMIT_RPM} RPM). Please wait before retrying.`);
    }

    const modelName = options?.model || "gemini-3.5-flash-lite";
    const startTime = performance.now();

    try {
      this.requestCount++;
      const config: any = {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 2048,
      };

      if (options?.systemInstruction) config.systemInstruction = options.systemInstruction;
      if (options?.responseMimeType) config.responseMimeType = options.responseMimeType;

      const response = await this.client.models.generateContent({
        model: modelName,
        contents: prompt,
        config,
      });

      const latencyMs = Math.round(performance.now() - startTime);
      const text = response.text || "";

      return {
        text,
        modelUsed: modelName,
        latencyMs,
        usage: {
          promptTokens: Math.ceil(prompt.length / 4),
          completionTokens: Math.ceil(text.length / 4),
          totalTokens: Math.ceil((prompt.length + text.length) / 4),
        },
      };
    } catch (err: any) {
      throw new Error(`Google Gemini execution error (${modelName}): ${err.message}`);
    }
  }

  public async generateImage?(
    prompt: string,
    options?: ImageOptions
  ): Promise<ImageResult> {
    throw new Error(
      "Image generation capabilities have been permanently retired from TATTVA AI."
    );
  }

  public async getUsage?(): Promise<UsageStatus> {
    return {
      planType: "Google AI Studio Developer API (Free Tier)",
      requestsUsed: this.requestCount,
      quotaLimit: this.RATE_LIMIT_RPM,
      isQuotaExhausted: this.requestCount >= this.RATE_LIMIT_RPM,
      rateLimitPerMinute: this.RATE_LIMIT_RPM,
      authoritativeSource: "Google AI Studio API Quota Monitor",
    };
  }

  public async disconnect(): Promise<void> {
    this.client = null;
    this.isConnected = false;
  }
}
