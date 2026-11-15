/**
 * TATTVA AI - Subscribed Image Agent Local Companion Client
 * Secure loopback connector to the desktop bridge running at 127.0.0.1:4848.
 */

import { ImageIntentCategory, SubscribedAgentId } from "./types";

const COMPANION_BASE_URL = process.env.TATTVA_COMPANION_URL || "http://127.0.0.1:4848";
const COMPANION_SECRET = process.env.TATTVA_COMPANION_SECRET || "tattva_companion_secure_token";

export interface CompanionJobSubmitParams {
  jobId: string;
  agentId: SubscribedAgentId;
  prompt: string;
  category: ImageIntentCategory;
  aspectRatio: string;
}

export interface CompanionJobStatusResponse {
  jobId: string;
  agentId: SubscribedAgentId;
  status: "queued" | "submitting" | "processing" | "completed" | "failed" | "cancelled";
  progressPercent: number;
  providerJobId?: string;
  error?: string;
}

export interface CompanionJobResultResponse {
  jobId: string;
  agentId: SubscribedAgentId;
  format: "png" | "jpeg" | "webp";
  imageDataUri: string;
  width: number;
  height: number;
  fileSizeBytes: number;
}

export class CompanionClient {
  /**
   * Submits a generation task to the local companion connector
   */
  public static async submitJob(params: CompanionJobSubmitParams): Promise<{
    success: boolean;
    providerJobId: string;
    initialStatus: string;
  }> {
    const res = await fetch(`${COMPANION_BASE_URL}/v1/jobs/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tattva-companion-token": COMPANION_SECRET,
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        errData.error || `Companion error: HTTP ${res.status} when submitting job.`
      );
    }

    const data = await res.json();
    return {
      success: true,
      providerJobId: data.providerJobId || `prov_${Date.now()}`,
      initialStatus: data.status || "processing",
    };
  }

  /**
   * Polls job status on the companion daemon
   */
  public static async getJobStatus(
    jobId: string,
    agentId: SubscribedAgentId
  ): Promise<CompanionJobStatusResponse> {
    const res = await fetch(`${COMPANION_BASE_URL}/v1/jobs/${jobId}?agentId=${agentId}`, {
      method: "GET",
      headers: {
        "x-tattva-companion-token": COMPANION_SECRET,
      },
    });

    if (!res.ok) {
      throw new Error(`Companion HTTP ${res.status} when querying status for ${jobId}.`);
    }

    return await res.json();
  }

  /**
   * Retrieves the completed image output from the companion daemon
   */
  public static async getJobResult(
    jobId: string,
    agentId: SubscribedAgentId
  ): Promise<CompanionJobResultResponse> {
    const res = await fetch(
      `${COMPANION_BASE_URL}/v1/jobs/${jobId}/result?agentId=${agentId}`,
      {
        method: "GET",
        headers: {
          "x-tattva-companion-token": COMPANION_SECRET,
        },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to retrieve image result for job ${jobId}`);
    }

    return await res.json();
  }

  /**
   * Cancels a job on the companion daemon
   */
  public static async cancelJob(
    jobId: string,
    agentId: SubscribedAgentId
  ): Promise<boolean> {
    try {
      const res = await fetch(`${COMPANION_BASE_URL}/v1/jobs/${jobId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tattva-companion-token": COMPANION_SECRET,
        },
        body: JSON.stringify({ agentId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Polls companion until the job reaches completion or failure (bounded to timeoutMs)
   */
  public static async pollUntilCompletion(
    jobId: string,
    agentId: SubscribedAgentId,
    onProgress?: (progress: number, status: string) => void,
    timeoutMs: number = 60_000
  ): Promise<CompanionJobResultResponse> {
    const startTime = Date.now();
    const intervalMs = 1000;

    while (Date.now() - startTime < timeoutMs) {
      const statusRes = await this.getJobStatus(jobId, agentId);

      onProgress?.(statusRes.progressPercent || 25, statusRes.status);

      if (statusRes.status === "completed") {
        return await this.getJobResult(jobId, agentId);
      }

      if (statusRes.status === "failed") {
        throw new Error(statusRes.error || `Agent ${agentId} generation failed.`);
      }

      if (statusRes.status === "cancelled") {
        throw new Error(`Agent ${agentId} generation was cancelled.`);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Generation job for ${agentId} timed out after ${timeoutMs / 1000} seconds.`);
  }
}
