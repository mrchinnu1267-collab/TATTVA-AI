/**
 * TATTVA AI - Unified Job Management Service (Phase L)
 * Orchestrates asynchronous background image generation jobs, concurrency control,
 * progress updates (0-100%), circuit breakers, and cost limit authorizations.
 */

import {
  createImageJob,
  getJob,
  cancelJob,
  listRecentJobs,
} from "../reliability/job-queue";
import { canExecuteProvider, getProviderHealth } from "../reliability/circuit-breaker";
import {
  estimateGenerationCost,
  verifySpendingAuthorization,
  recordCostEntry,
} from "../reliability/cost-tracker";
import { getReliabilityDashboardMetrics } from "../reliability/performance-monitor";
import { ImageJob, JobStatus } from "../reliability/types";
import { ImageQuality, AspectRatio, ImageProviderId } from "../types";

export interface ImageJobCreationParams {
  prompt: string;
  referenceImage?: string;
  quality?: ImageQuality;
  aspectRatio?: AspectRatio;
  userId?: string;
  workspaceId?: string;
  provider?: ImageProviderId;
}

export class JobManagementService {
  /**
   * Enqueues a new background image generation job with budget check.
   */
  public static enqueueJob(params: ImageJobCreationParams): ImageJob {
    // 1. Budget Authorization Check
    const estimatedCost = estimateGenerationCost({
      provider: params.provider || "pollinations",
      quality: params.quality,
      isMultiStage: true,
    });

    const auth = verifySpendingAuthorization(params.workspaceId || "default", estimatedCost.estimatedCostUsd);
    if (!auth.authorized) {
      throw new Error(`Generation job blocked: ${auth.reason}`);
    }

    // 2. Enqueue Job
    return createImageJob(params);
  }

  /**
   * Retrieves current job status and progress.
   */
  public static getJobStatus(jobId: string): ImageJob | null {
    return getJob(jobId);
  }

  /**
   * Cancels an active or queued job.
   */
  public static cancel(jobId: string): boolean {
    return cancelJob(jobId);
  }

  /**
   * Lists recent jobs.
   */
  public static listJobs(limit: number = 20): ImageJob[] {
    return listRecentJobs(limit);
  }

  /**
   * Returns operational telemetry and circuit breaker metrics.
   */
  public static getTelemetry() {
    return getReliabilityDashboardMetrics();
  }
}

