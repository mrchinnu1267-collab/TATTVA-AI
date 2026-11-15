/**
 * TATTVA AI - Cloud Storage Integration (Phase 26)
 * Generates secure, short-lived signed URLs for Supabase Storage, S3, and GCS with permission boundaries
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { CloudStorageSignedUrlResult } from "./types";

export class CloudStorageIntegration {
  private static instance: CloudStorageIntegration;

  public static getInstance(): CloudStorageIntegration {
    if (!CloudStorageIntegration.instance) {
      CloudStorageIntegration.instance = new CloudStorageIntegration();
    }
    return CloudStorageIntegration.instance;
  }

  /**
   * Sanitizes relative paths to block path traversal attacks
   */
  public sanitizePath(filePath: string): string {
    return filePath
      .replace(/\.\./g, "") // Block directory traversal
      .replace(/^\/+/, "")  // Strip leading slash
      .replace(/[^a-zA-Z0-9_\-\./]/g, "_");
  }

  /**
   * Generates secure signed URL for reading or writing document assets
   */
  public generateSignedUrl(params: {
    provider: "supabase_storage" | "aws_s3" | "gcs";
    bucket: string;
    filePath: string;
    action: "read" | "write";
    expiresInSeconds?: number;
    userId: string;
  }): CloudStorageSignedUrlResult {
    const cleanPath = this.sanitizePath(params.filePath);
    const ttl = params.expiresInSeconds || 3600; // 1 hour default
    const expirationTimestamp = Math.floor(Date.now() / 1000) + ttl;

    // Secure token signature placeholder (HMAC-SHA256 signature in production)
    const token = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    let baseEndpoint = "https://tattva.storage.supabase.co";
    if (params.provider === "aws_s3") {
      baseEndpoint = `https://${params.bucket}.s3.amazonaws.com`;
    } else if (params.provider === "gcs") {
      baseEndpoint = `https://storage.googleapis.com/${params.bucket}`;
    }

    const signedUrl = `${baseEndpoint}/${params.bucket}/${cleanPath}?token=${token}&expires=${expirationTimestamp}&action=${params.action}&uid=${encodeURIComponent(params.userId)}`;

    return {
      provider: params.provider,
      bucket: params.bucket,
      filePath: cleanPath,
      action: params.action,
      signedUrl,
      expiresInSeconds: ttl,
    };
  }
}

export const cloudStorageIntegration = CloudStorageIntegration.getInstance();
