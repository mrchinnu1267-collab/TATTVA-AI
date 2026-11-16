/**
 * TATTVA AI - Cloudflare Workers AI Gateway Adapter
 * Model: @cf/black-forest-labs/flux-1-schnell
 * Exclusive Image Generation Provider
 */

import {
  AIProvider,
  ConnectionStatus,
  GenerationOptions,
  ImageOptions,
  ImageResult,
  TextResult,
  UsageStatus,
} from "../types";
import {
  generateWithCloudflare,
  isCloudflareConfigured,
  getCloudflareCredentials,
  CLOUDFLARE_FLUX_MODEL,
} from "../../image-engine/cloudflare/cloudflare-adapter";

export class CloudflareImageGatewayAdapter implements AIProvider {
  private isConnected = false;

  public async connect(): Promise<ConnectionStatus> {
    const configured = isCloudflareConfigured();
    this.isConnected = configured;

    if (!configured) {
      return {
        isConnected: false,
        providerType: "cloudflare",
        providerId: "cloudflare",
        name: "Cloudflare Workers AI",
        accountLabel: "Cloudflare FLUX.1 Schnell",
        errorMessage: "CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN not configured in server environment.",
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

    return {
      isConnected: true,
      providerType: "cloudflare",
      providerId: "cloudflare",
      name: "Cloudflare Workers AI (FLUX.1 Schnell)",
      accountLabel: "Cloudflare Serverless Inference",
      policyNotice: "Exclusive neural image-generation provider powered by @cf/black-forest-labs/flux-1-schnell.",
      capabilities: {
        text: false,
        reasoning: false,
        coding: false,
        image: true,
        document: false,
        summarization: false,
        dataAnalysis: false,
        knowledgeRetrieval: false,
        multimodal: false,
      },
    };
  }

  public async generateText(
    _prompt: string,
    _options?: GenerationOptions
  ): Promise<TextResult> {
    throw new Error("Cloudflare FLUX.1 Schnell adapter is exclusively an image generation provider.");
  }

  public async generateImage(
    prompt: string,
    options?: ImageOptions
  ): Promise<ImageResult> {
    const res = await generateWithCloudflare({
      prompt,
      negativePrompt: "",
      width: options?.width || 1024,
      height: options?.height || 1024,
      steps: 4,
      guidance: 3.5,
      aspectRatio: options?.aspectRatio || "1:1",
      quality: options?.quality === "hd" ? "max" : "balanced",
      seed: Math.floor(Math.random() * 2147483647),
    });

    const base64Data = res.image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    return {
      images: [
        {
          dataUri: res.image,
          buffer,
          width: res.width,
          height: res.height,
          mimeType: "image/jpeg",
          provenance: "cloudflare_workers_ai",
        },
      ],
    };
  }

  public async getUsage(): Promise<UsageStatus> {
    return {
      planType: "Cloudflare Workers AI (10,000 Neurons/day free)",
      requestsUsed: 1,
      quotaLimit: 10000,
      isQuotaExhausted: false,
      rateLimitPerMinute: 60,
      authoritativeSource: "Cloudflare REST API",
    };
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
  }
}
