/**
 * TATTVA AI - Local Procedural Preview Adapter (Gateway)
 * Implements AIProvider for zero-cost offline procedural previews using Sharp.
 */

import sharp from "sharp";
import crypto from "crypto";
import {
  AIProvider,
  ConnectionStatus,
  GenerationOptions,
  TextResult,
  ImageOptions,
  ImageResult,
  UsageStatus,
} from "../types";

export class LocalProceduralGatewayAdapter implements AIProvider {
  public async connect(): Promise<ConnectionStatus> {
    return {
      isConnected: true,
      providerType: "local_procedural",
      providerId: "local_procedural",
      name: "TATTVA Local Procedural Preview Engine",
      accountLabel: "Local Node.js Sharp Runtime",
      policyNotice: "Generates offline procedural previews with honest local_procedural_fallback provenance.",
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
    prompt: string,
    options?: GenerationOptions
  ): Promise<TextResult> {
    throw new Error("Local procedural engine only supports image generation previews.");
  }

  public async generateImage(
    prompt: string,
    options?: ImageOptions
  ): Promise<ImageResult> {
    const width = options?.width || 512;
    const height = options?.height || 512;

    // Generate procedural SVG canvas
    const safePrompt = prompt.replace(/[<>&'"]/g, "").slice(0, 80);
    const svgOverlay = `
      <svg width="${width}" height="${height}">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="50%" stop-color="#1e1b4b" />
            <stop offset="100%" stop-color="#020617" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#grad)" />
        <circle cx="${width / 2}" cy="${height / 2 - 20}" r="${Math.min(width, height) / 4}" fill="#3b82f6" fill-opacity="0.2" />
        <text x="50%" y="${height / 2 - 20}" font-family="sans-serif" font-size="18" font-weight="bold" fill="#60a5fa" text-anchor="middle" dominant-baseline="middle">TATTVA AI PREVIEW</text>
        <text x="50%" y="${height / 2 + 30}" font-family="sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle" dominant-baseline="middle">${safePrompt}</text>
        <text x="50%" y="${height - 25}" font-family="sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Local Procedural Preview (Sharp)</text>
      </svg>
    `;

    const buffer = await sharp(Buffer.from(svgOverlay)).png().toBuffer();
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    return {
      images: [
        {
          buffer,
          dataUri: `data:image/png;base64,${buffer.toString("base64")}`,
          width,
          height,
          mimeType: "image/png",
          sha256,
          provenance: "local_procedural_fallback",
        },
      ],
    };
  }

  public async getUsage(): Promise<UsageStatus> {
    return {
      planType: "Local Node.js Engine (Zero Cost)",
      requestsUsed: 0,
      quotaLimit: "unlimited",
      isQuotaExhausted: false,
      rateLimitPerMinute: 60,
      authoritativeSource: "Local System Runtime",
    };
  }

  public async disconnect(): Promise<void> {
    // No-op
  }
}
