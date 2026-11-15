/**
 * TATTVA AI - AI Gateway Result Manager (Phase 59)
 * Output normalization, data sanitization, image verification, and provenance auditing.
 */

import crypto from "crypto";
import sharp from "sharp";
import { redactSensitiveInfo } from "../security";
import { GatewayResult, ImageResult, TaskType, TextResult } from "./types";

export class ResultManager {
  /**
   * Normalize and sanitize text result
   */
  public sanitizeText(result: TextResult): TextResult {
    let { text: sanitized } = redactSensitiveInfo(result.text);

    // Broad safeguard regexes for credentials and tokens
    sanitized = sanitized
      .replace(/AIza[0-9A-Za-z-_]{30,45}/g, "[REDACTED_GOOGLE_KEY]")
      .replace(/eyJ[a-zA-Z0-9-_=]+\.[a-zA-Z0-9-_=]+\.[a-zA-Z0-9-_.+/=]+/g, "[REDACTED_JWT]");

    return {
      ...result,
      text: sanitized.trim(),
    };
  }

  /**
   * Verify and audit image output using Sharp
   */
  public async verifyImage(imageResult: ImageResult): Promise<ImageResult> {
    const verifiedImages: ImageResult["images"] = [];

    for (const img of imageResult.images) {
      let buffer: Buffer;

      if (img.buffer) {
        buffer = img.buffer;
      } else if (img.dataUri) {
        const base64Data = img.dataUri.replace(/^data:image\/\w+;base64,/, "");
        buffer = Buffer.from(base64Data, "base64");
      } else {
        // Just URL or missing buffer
        verifiedImages.push(img);
        continue;
      }

      // Compute SHA-256
      const hash = crypto.createHash("sha256").update(buffer).digest("hex");

      // Verify with Sharp
      const metadata = await sharp(buffer).metadata();

      verifiedImages.push({
        ...img,
        buffer,
        dataUri: img.dataUri || `data:image/${metadata.format || "png"};base64,${buffer.toString("base64")}`,
        width: metadata.width || img.width,
        height: metadata.height || img.height,
        mimeType: `image/${metadata.format || "png"}`,
        sha256: hash,
        provenance: img.provenance,
      });
    }

    return {
      images: verifiedImages,
    };
  }

  /**
   * Assemble standard GatewayResult
   */
  public buildSuccessResult(params: {
    taskType: TaskType;
    providerId: string;
    providerName: string;
    textResult?: TextResult;
    imageResult?: ImageResult;
    provenance?: string;
    latencyMs: number;
    cached?: boolean;
  }): GatewayResult {
    return {
      success: true,
      taskType: params.taskType,
      providerId: params.providerId,
      providerName: params.providerName,
      textResult: params.textResult,
      imageResult: params.imageResult,
      provenance: params.provenance,
      latencyMs: params.latencyMs,
      cached: Boolean(params.cached),
    };
  }

  public buildErrorResult(params: {
    taskType: TaskType;
    providerId: string;
    providerName: string;
    error: string;
    latencyMs: number;
  }): GatewayResult {
    return {
      success: false,
      taskType: params.taskType,
      providerId: params.providerId,
      providerName: params.providerName,
      error: params.error,
      latencyMs: params.latencyMs,
      cached: false,
    };
  }
}
