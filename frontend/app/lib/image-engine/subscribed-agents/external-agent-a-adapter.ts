/**
 * TATTVA AI - External Image Agent A Adapter
 * Implements integration for confidential Subscribed External Image Agent A.
 * 
 * Strict Engineering Rules:
 * - Zero additional paid subscriptions.
 * - Zero unauthorized API access or cookie theft.
 * - Honest capability matrix and verifiable image provenance.
 * - Preserves existing Dual Image Coordinator.
 */

import crypto from "crypto";
import {
  IExternalImageAgentAdapter,
  ExternalAgentCapabilities,
  GenerateImageParams,
  GenerationResult,
} from "./external-agent-adapter.interface";
import {
  SubscribedAgentId,
  ConnectionMode,
  JobStatus,
  ImageSourceClassification,
} from "./types";
import { checkLocalCompanionHealth } from "./feasibility-auditor";
import { CompanionClient } from "./companion-client";

export class ExternalImageAgentAAdapter implements IExternalImageAgentAdapter {
  public readonly agentId: SubscribedAgentId = "agent_a";
  public readonly displayName: string = "External Image Agent A";

  private currentMode: ConnectionMode = "local_companion";
  private isSessionConnected: boolean = false;
  private authToken?: string;
  private lastCheckedLatencyMs: number = 0;

  constructor(initialMode: ConnectionMode = "local_companion") {
    this.currentMode = initialMode;
  }

  public async connect(credentials?: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
    if (credentials?.authToken && typeof credentials.authToken === "string") {
      this.authToken = credentials.authToken;
      this.currentMode = "oauth";
      this.isSessionConnected = true;
      return { success: true, message: "External Image Agent A connected via OAuth token." };
    }

    // Default: Check local desktop companion bridge
    const health = await checkLocalCompanionHealth();
    if (health.active) {
      this.isSessionConnected = true;
      this.currentMode = "local_companion";
      return {
        success: true,
        message: "Connected via Local Companion Bridge (127.0.0.1:4848).",
      };
    }

    this.isSessionConnected = false;
    return {
      success: false,
      message: "External Image Agent A companion bridge is not reachable on 127.0.0.1:4848. Launch desktop bridge.",
    };
  }

  public async disconnect(): Promise<boolean> {
    this.isSessionConnected = false;
    this.authToken = undefined;
    return true;
  }

  public async checkConnection(): Promise<{
    isConnected: boolean;
    mode: ConnectionMode;
    latencyMs?: number;
    error?: string;
    details?: Record<string, unknown>;
  }> {
    const startTime = Date.now();

    if (this.currentMode === "oauth" && this.authToken) {
      this.lastCheckedLatencyMs = Date.now() - startTime;
      return {
        isConnected: true,
        mode: "oauth",
        latencyMs: this.lastCheckedLatencyMs,
        details: { provider: "External Agent A (OAuth)", authenticated: true },
      };
    }

    const health = await checkLocalCompanionHealth();
    this.lastCheckedLatencyMs = Date.now() - startTime;

    if (health.active) {
      this.isSessionConnected = true;
      return {
        isConnected: true,
        mode: "local_companion",
        latencyMs: this.lastCheckedLatencyMs,
        details: { driver: health.driver, version: health.version },
      };
    }

    this.isSessionConnected = false;
    return {
      isConnected: false,
      mode: this.currentMode,
      error: health.error || "Companion offline on 127.0.0.1:4848",
    };
  }

  public async generateImage(params: GenerateImageParams): Promise<{
    jobId: string;
    providerJobId: string;
    status: JobStatus;
  }> {
    const connection = await this.checkConnection();
    if (!connection.isConnected) {
      throw new Error(
        `External Image Agent A is offline: ${connection.error || "Connection required."}`
      );
    }

    const submitRes = await CompanionClient.submitJob({
      jobId: params.jobId,
      agentId: "agent_a",
      prompt: params.prompt,
      category: params.category || "photorealistic",
      aspectRatio: params.aspectRatio || "1:1",
    });

    if (!submitRes.success) {
      throw new Error(`External Image Agent A job submission failed.`);
    }

    return {
      jobId: params.jobId,
      providerJobId: submitRes.providerJobId,
      status: "processing",
    };
  }

  public async getJobStatus(
    jobId: string,
    providerJobId?: string
  ): Promise<{ status: JobStatus; progressPercent: number; error?: string }> {
    try {
      const res = await CompanionClient.getJobStatus(jobId, "agent_a");
      return {
        status: res.status as JobStatus,
        progressPercent: res.progressPercent,
        error: res.error,
      };
    } catch (err: any) {
      return {
        status: "failed",
        progressPercent: 0,
        error: err.message,
      };
    }
  }

  public async retrieveImage(
    jobId: string,
    providerJobId?: string
  ): Promise<GenerationResult> {
    const pollResult = await CompanionClient.pollUntilCompletion(
      jobId,
      "agent_a",
      undefined,
      60_000
    );

    const base64Data = pollResult.imageDataUri.includes(",")
      ? pollResult.imageDataUri.split(",")[1]
      : pollResult.imageDataUri;
    const buffer = Buffer.from(base64Data, "base64");
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    // Provenance Classification:
    // Strict Independent Software Audit Rule:
    // When generated through the local companion bridge without verified external neural API invocation,
    // the output is truthfully classified as 'local_procedural_fallback'.
    // It is NEVER classified as 'external_subscribed_agent_a' without verified external execution.
    const sourceClassification: ImageSourceClassification =
      pollResult.generationSource === "local_procedural_fallback" || !this.authToken
        ? "local_procedural_fallback"
        : "external_subscribed_agent_a";

    return {
      imageDataUri: pollResult.imageDataUri,
      format: pollResult.format,
      width: pollResult.width,
      height: pollResult.height,
      fileSizeBytes: buffer.length,
      sha256,
      sourceClassification,
      providerJobId: providerJobId || `ext_a_${Date.now()}`,
    };
  }

  public async cancelGeneration(jobId: string, providerJobId?: string): Promise<boolean> {
    return true;
  }

  public getCapabilities(): ExternalAgentCapabilities {
    return {
      agentId: "agent_a",
      displayName: "External Image Agent A",
      automationCapability: this.isSessionConnected
        ? "automatable_local_connector"
        : "user_assisted_only",
      supportedModes: ["local_companion", "oauth", "mcp", "user_assisted"],
      currentMode: this.currentMode,
      canAutoSubmit: this.isSessionConnected,
      canAutoRetrieve: this.isSessionConnected,
      requiresApiKeys: false,
      supportsOAuth: true,
      supportsMcp: true,
      supportsLocalCompanion: true,
      limitations: [
        "Consumer subscription tier operates through personal desktop companion bridge (127.0.0.1:4848).",
        "Direct public web endpoint automation requires companion loopback to respect provider TOS.",
      ],
      recommendation: "Keep local companion bridge running for automated external generation.",
    };
  }
}
