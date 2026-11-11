/**
 * TATTVA AI - Scalable Background Image Job Queue (Phase K)
 * Manages asynchronous image generation workflows, concurrency limits,
 * progress updates, job cancellation, and automatic cleanup.
 */

import { ImageJob, JobStatus, JobStage } from "./types";
import { ImageQuality, AspectRatio, ImageProviderId } from "../types";
import { hashPrompt } from "./prompt-cache";
import { generateAccurateImage } from "../accuracy/accuracy-pipeline";

const MAX_CONCURRENT_JOBS = 3;
const MAX_JOB_RETRIES = 2;
const JOB_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const jobStore = new Map<string, ImageJob>();
let activeRunningCount = 0;

/**
 * Creates a new asynchronous background image generation job.
 */
export function createImageJob(params: {
  prompt: string;
  referenceImage?: string;
  quality?: ImageQuality;
  aspectRatio?: AspectRatio;
  userId?: string;
  workspaceId?: string;
}): ImageJob {
  const now = new Date().toISOString();
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const promptHash = hashPrompt(params.prompt, params.referenceImage);

  const job: ImageJob = {
    id,
    userId: params.userId,
    workspaceId: params.workspaceId || "default",
    prompt: params.prompt.trim(),
    promptHash,
    referenceImage: params.referenceImage,
    quality: params.quality || "balanced",
    aspectRatio: params.aspectRatio || "1:1",
    status: "queued",
    progressPercent: 5,
    currentStage: "queued",
    attempts: 0,
    maxRetries: MAX_JOB_RETRIES,
    totalCostUsd: 0.0,
    startedAt: now,
    updatedAt: now,
  };

  jobStore.set(id, job);

  // Trigger processing asynchronously in the background
  processNextJobs();

  return job;
}

/**
 * Retrieves an image job by its unique identifier.
 */
export function getJob(jobId: string): ImageJob | null {
  return jobStore.get(jobId) || null;
}

/**
 * Cancels a running or queued image job.
 */
export function cancelJob(jobId: string): boolean {
  const job = jobStore.get(jobId);
  if (!job) return false;

  if (job.status === "completed" || job.status === "cancelled") {
    return false;
  }

  job.status = "cancelled";
  job.currentStage = "completed";
  job.progressPercent = 100;
  job.updatedAt = new Date().toISOString();
  job.completedAt = new Date().toISOString();

  return true;
}

/**
 * Returns a list of recent jobs, sorted newest first.
 */
export function listRecentJobs(limit: number = 20): ImageJob[] {
  cleanExpiredJobs();
  return Array.from(jobStore.values())
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, limit);
}

/**
 * Updates stage and progress of an active job.
 */
function updateJobStage(job: ImageJob, stage: JobStage, progressPercent: number): void {
  job.currentStage = stage;
  job.progressPercent = progressPercent;
  job.updatedAt = new Date().toISOString();
}

/**
 * Queue processor: processes queued jobs up to the concurrency ceiling.
 */
async function processNextJobs(): Promise<void> {
  if (activeRunningCount >= MAX_CONCURRENT_JOBS) {
    return;
  }

  const queuedJobs = Array.from(jobStore.values()).filter((j) => j.status === "queued");
  if (queuedJobs.length === 0) {
    return;
  }

  const nextJob = queuedJobs[0];
  nextJob.status = "processing";
  activeRunningCount++;

  runJobExecution(nextJob).finally(() => {
    activeRunningCount--;
    processNextJobs();
  });
}

function isJobCancelled(j: ImageJob): boolean {
  return (j.status as string) === "cancelled";
}

/**
 * Executes a single job through the multi-stage accuracy generation pipeline.
 */
async function runJobExecution(job: ImageJob): Promise<void> {
  const started = Date.now();
  job.attempts++;

  try {
    if (isJobCancelled(job)) return;

    // Stage 1: Prompt Understanding
    updateJobStage(job, "prompt_understanding", 20);

    // Stage 2: Routing
    updateJobStage(job, "routing_and_selection", 40);

    // Stage 3: Generation
    updateJobStage(job, "generating", 65);

    // Run end-to-end accurate generation
    const result = await generateAccurateImage({
      prompt: job.prompt,
      referenceImage: job.referenceImage,
      quality: job.quality,
      accuracyThreshold: 80,
      enableAutoCorrection: true,
    });

    if (isJobCancelled(job)) return;

    // Stage 4: Independent Evaluation
    updateJobStage(job, "independent_evaluation", 85);

    // Stage 5: Targeted Correction (if applied)
    if (result.correctionsApplied.length > 0) {
      updateJobStage(job, "targeted_correction", 95);
    }

    // Finalize
    job.status = "completed";
    job.currentStage = "completed";
    job.progressPercent = 100;
    job.resultImage = result.finalImage;
    job.providerUsed = result.providerUsed;
    job.modelUsed = result.modelUsed;
    job.totalCostUsd = result.estimatedCostUsd;
    job.latencyMs = Date.now() - started;
    job.completedAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();
  } catch (err: any) {
    if (isJobCancelled(job)) return;

    if (job.attempts < job.maxRetries) {
      // Re-queue for retry
      job.status = "queued";
      job.progressPercent = 10;
      job.currentStage = "queued";
      job.updatedAt = new Date().toISOString();
    } else {
      job.status = "failed";
      job.error = err.message || "Image generation pipeline failed";
      job.progressPercent = 100;
      job.completedAt = new Date().toISOString();
      job.updatedAt = new Date().toISOString();
      job.latencyMs = Date.now() - started;
    }
  }
}

/**
 * Purges expired jobs older than 24 hours to conserve memory.
 */
function cleanExpiredJobs(): void {
  const now = Date.now();
  for (const [id, job] of jobStore.entries()) {
    const age = now - new Date(job.startedAt).getTime();
    if (age > JOB_EXPIRATION_MS && (job.status === "completed" || job.status === "failed" || job.status === "cancelled")) {
      jobStore.delete(id);
    }
  }
}

/**
 * Resets job store (for unit tests).
 */
export function resetJobQueue(): void {
  jobStore.clear();
  activeRunningCount = 0;
}

