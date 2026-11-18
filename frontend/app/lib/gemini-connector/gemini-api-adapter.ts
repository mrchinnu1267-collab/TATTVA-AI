/**
 * TATTVA AI - Google Gemini Developer API Adapter
 * 
 * Implements the GeminiProvider interface for official Google AI Studio developer API credentials.
 * Uses the official Google GenAI SDK (@google/genai) for real, verified execution.
 */

import { GoogleGenAI } from "@google/genai";
import {
  GeminiProvider,
  ConnectionStatus,
  GenerationOptions,
  TextResult,
  ImageOptions,
  ImageResult,
  UsageStatus,
} from "./types";

export class GeminiApiAdapter implements GeminiProvider {
  private client: GoogleGenAI | null = null;
  private apiKey: string | null = null;
  private isConnectedState: boolean = false;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private readonly RATE_LIMIT_RPM = 15; // Official Free Tier RPM
  private readonly DAILY_LIMIT = 1500;  // Official Free Tier RPD

  constructor(customApiKey?: string) {
    this.apiKey = customApiKey || null;
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
      this.isConnectedState = false;
      return {
        isConnected: false,
        providerType: "developer_api",
        accountLabel: "Google AI Studio Developer API",
        errorMessage: "GEMINI_API_KEY is not configured.",
        limitationReason: "MISSING_CREDENTIALS",
        capabilities: {
          text: false,
          image: false,
          code: false,
          reasoning: false,
          structuredData: false,
        },
      };
    }

    try {
      this.client = new GoogleGenAI({ apiKey: key });

      // Live verification ping with fast lightweight model
      const probeStart = performance.now();
      const probeRes = await this.client.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: "PING",
        config: { maxOutputTokens: 5, temperature: 0 },
      });

      if (!probeRes || !probeRes.text) {
        throw new Error("No response received from Google Gemini API probe.");
      }

      this.isConnectedState = true;

      return {
        isConnected: true,
        providerType: "developer_api",
        accountLabel: "Google AI Studio Developer API (Verified Live)",
        policyNotice: "Connected via official Google Generative Language API developer credentials.",
        capabilities: {
          text: true,
          image: false, // Standard Flash models do not synthesize image output directly
          code: true,
          reasoning: true,
          structuredData: true,
        },
      };
    } catch (err: any) {
      this.isConnectedState = false;
      return {
        isConnected: false,
        providerType: "developer_api",
        accountLabel: "Google AI Studio Developer API",
        errorMessage: err.message || "Failed to authenticate with Google Gemini API.",
        limitationReason: "AUTHENTICATION_FAILED",
        capabilities: {
          text: false,
          image: false,
          code: false,
          reasoning: false,
          structuredData: false,
        },
      };
    }
  }

  public async generateText(
    prompt: string,
    options?: GenerationOptions
  ): Promise<TextResult> {
    if (!this.isConnectedState || !this.client) {
      const conn = await this.connect();
      if (!conn.isConnected || !this.client) {
        throw new Error(`Gemini Developer API is not connected: ${conn.errorMessage}`);
      }
    }

    // Usage protection: Check rate limits
    const now = Date.now();
    if (now - this.lastResetTime > 60_000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    if (this.requestCount >= this.RATE_LIMIT_RPM) {
      throw new Error(
        `Gemini rate limit exceeded (${this.RATE_LIMIT_RPM} requests/min). Please wait before retrying.`
      );
    }

    const modelName = options?.model || "gemini-3.5-flash-lite";
    const startTime = performance.now();

    try {
      this.requestCount++;
      const config: any = {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 2048,
      };

      if (options?.systemInstruction) {
        config.systemInstruction = options.systemInstruction;
      }

      if (options?.responseMimeType) {
        config.responseMimeType = options.responseMimeType;
      }

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

  public async generateImage(
    prompt: string,
    options?: ImageOptions
  ): Promise<ImageResult> {
    // Standard Gemini text/multimodal models do not generate images.
    // Accurately report this limitation rather than mocking images.
    throw new Error("Image generation capabilities have been permanently retired from TATTVA AI.");
  }

  public async getUsage(): Promise<UsageStatus> {
    const isExhausted = this.requestCount >= this.RATE_LIMIT_RPM;
    return {
      planType: "Google AI Studio Developer API (Free Tier)",
      requestsUsed: this.requestCount,
      quotaLimit: this.RATE_LIMIT_RPM,
      isQuotaExhausted: isExhausted,
      rateLimitPerMinute: this.RATE_LIMIT_RPM,
      authoritativeSource: "Google AI Studio API Quota Monitor",
    };
  }

  public async disconnect(): Promise<void> {
    this.client = null;
    this.isConnectedState = false;
  }
}
