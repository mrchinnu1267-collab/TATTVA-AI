/**
 * TATTVA AI - Scalable Background Image Job Queue (Phase K & Asynchronous Chat Reliability)
 * Manages asynchronous image generation workflows, concurrency limits,
 * progress updates, job cancellation, duplicate prevention, cross-lambda persistence,
 * and automatic stale job recovery / worker crash transitions.
 */

import fs from "fs";
import path from "path";
import { ImageJob, JobStatus, JobStage, ImageJobTimestamps } from "./types";
import { ImageQuality, AspectRatio } from "../types";
import { hashPrompt } from "./prompt-cache";
import { generateImage } from "../engine";

const MAX_CONCURRENT_JOBS = 4;
const MAX_JOB_RETRIES = 2;
const JOB_DEADLINE_MS = 180 * 1000; // 3-minute hard execution ceiling
const STALE_HEARTBEAT_THRESHOLD_MS = 45 * 1000; // 45 seconds without stage update
const JOB_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const JOBS_DIR = path.join("/tmp", ".tattva_jobs");

// Ensure globalThis preservation across hot module reloads in Node.js
declare global {
  var __TATTVA_IMAGE_JOBS__: Map<string, ImageJob> | undefined;
}

const jobStore: Map<string, ImageJob> =
  globalThis.__TATTVA_IMAGE_JOBS__ || (globalThis.__TATTVA_IMAGE_JOBS__ = new Map<string, ImageJob>());

let activeRunningCount = 0;

// In-flight execution promises for active jobs to prevent duplicate runs and await completion
const inFlightPromises = new Map<string, Promise<ImageJob>>();

function ensureJobsDir(): void {
  try {
    if (!fs.existsSync(JOBS_DIR)) {
      fs.mkdirSync(JOBS_DIR, { recursive: true });
    }
  } catch {
    // Non-fatal if filesystem is read-only
  }
}

export function persistJobToFile(job: ImageJob): void {
  try {
    ensureJobsDir();
    const filePath = path.join(JOBS_DIR, `${job.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(job), "utf-8");
  } catch (err) {
    // Non-fatal local cache write error
  }
}

function loadJobFromFile(jobId: string): ImageJob | null {
  try {
    const filePath = path.join(JOBS_DIR, `${jobId}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      const job = JSON.parse(data) as ImageJob;
      jobStore.set(job.id, job);
      return job;
    }
  } catch {
    // Non-fatal
  }
  return null;
}

/**
 * Checks for abandoned, crashed, or deadline-exceeded jobs and transitions them to failed.
 */
export function checkAndRecoverStaleJob(job: ImageJob): ImageJob {
  if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
    return job;
  }

  const now = Date.now();
  const startedMs = new Date(job.startedAt).getTime();
  const updatedMs = new Date(job.updatedAt || job.startedAt).getTime();
  const deadline = job.deadline || (startedMs + JOB_DEADLINE_MS);

  // 1. Hard maximum execution deadline exceeded
  if (now > deadline) {
    const failedAt = new Date().toISOString();
    job.status = "failed";
    job.currentStage = "completed";
    job.progressPercent = 100;
    job.error = `Job exceeded maximum overall execution deadline of ${Math.round(JOB_DEADLINE_MS / 1000)}s.`;
    job.statusMessage = "Image generation timed out: maximum execution deadline exceeded. Please retry.";
    job.completedAt = failedAt;
    job.updatedAt = failedAt;
    if (job.timestamps) {
      job.timestamps.completedAt = failedAt;
    }
    persistJobToFile(job);
    return job;
  }

  // 2. Stale worker heartbeat (worker crashed, container frozen or killed with no active local in-flight promise)
  if (job.status === "processing" && (now - updatedMs > STALE_HEARTBEAT_THRESHOLD_MS) && !inFlightPromises.has(job.id)) {
    const failedAt = new Date().toISOString();
    job.status = "failed";
    job.currentStage = "completed";
    job.progressPercent = 100;
    job.error = "Background worker process terminated unexpectedly or timed out. Please retry.";
    job.statusMessage = "Worker process terminated unexpectedly. Please retry.";
    job.completedAt = failedAt;
    job.updatedAt = failedAt;
    if (job.timestamps) {
      job.timestamps.completedAt = failedAt;
    }
    persistJobToFile(job);
    return job;
  }

  return job;
}

/**
 * Finds an active existing job by prompt hash and user to prevent duplicate job creation.
 */
export function findActiveJob(promptHash: string, userId?: string): ImageJob | null {
  cleanExpiredJobs();
  const cutoff = Date.now() - 3 * 60 * 1000; // within last 3 minutes
  for (const rawJob of jobStore.values()) {
    const job = checkAndRecoverStaleJob(rawJob);
    if (
      job.promptHash === promptHash &&
      (!userId || job.userId === userId) &&
      (job.status === "queued" || job.status === "processing") &&
      new Date(job.startedAt).getTime() > cutoff
    ) {
      return job;
    }
  }
  return null;
}

/**
 * Rehydrates or retrieves a job across independent serverless Lambda instances.
 */
export function getOrCreateJob(
  jobId: string,
  params?: {
    prompt?: string;
    referenceImage?: string;
    quality?: ImageQuality;
    aspectRatio?: AspectRatio;
    userId?: string;
    workspaceId?: string;
    startedAt?: string;
    deadline?: number;
    timestamps?: ImageJobTimestamps;
  }
): ImageJob | null {
  let existing = getJob(jobId);
  if (existing) {
    return existing;
  }

  if (params && params.prompt) {
    const now = new Date().toISOString();
    const promptHash = hashPrompt(params.prompt, params.referenceImage);
    const deadline = params.deadline || (Date.now() + JOB_DEADLINE_MS);

    const rehydratedJob: ImageJob = {
      id: jobId,
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
      statusMessage: "Job queued for generation...",
      attempts: 0,
      maxRetries: MAX_JOB_RETRIES,
      maxAttempts: 4,
      totalCostUsd: 0.0,
      startedAt: params.startedAt || now,
      updatedAt: now,
      deadline,
      timestamps: params.timestamps || {
        dispatchedAt: params.startedAt || now,
      },
    };

    jobStore.set(jobId, rehydratedJob);
    persistJobToFile(rehydratedJob);
    return rehydratedJob;
  }

  return null;
}

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
  forceNew?: boolean;
}): ImageJob {
  const promptHash = hashPrompt(params.prompt, params.referenceImage);

  // Prevent duplicate concurrent requests for identical prompt
  if (!params.forceNew) {
    const existing = findActiveJob(promptHash, params.userId);
    if (existing) {
      return existing;
    }
  }

  const now = new Date().toISOString();
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const deadline = Date.now() + JOB_DEADLINE_MS;

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
    statusMessage: "Job queued for generation...",
    attempts: 0,
    maxRetries: MAX_JOB_RETRIES,
    maxAttempts: 4,
    totalCostUsd: 0.0,
    startedAt: now,
    updatedAt: now,
    deadline,
    timestamps: {
      dispatchedAt: now,
    },
  };

  jobStore.set(id, job);
  persistJobToFile(job);

  return job;
}

/**
 * Retrieves an image job by its unique identifier (with cross-lambda disk fallback and stale checking).
 */
export function getJob(jobId: string): ImageJob | null {
  let job: ImageJob | null = null;
  if (jobStore.has(jobId)) {
    job = jobStore.get(jobId)!;
  } else {
    job = loadJobFromFile(jobId);
  }

  if (job) {
    return checkAndRecoverStaleJob(job);
  }
  return null;
}

/**
 * Cancels a running or queued image job.
 */
export function cancelJob(jobId: string): boolean {
  const job = getJob(jobId);
  if (!job) return false;

  if (job.status === "completed" || job.status === "cancelled") {
    return false;
  }

  const now = new Date().toISOString();
  job.status = "cancelled";
  job.currentStage = "completed";
  job.progressPercent = 100;
  job.statusMessage = "Job cancelled by user.";
  job.updatedAt = now;
  job.completedAt = now;
  if (job.timestamps) {
    job.timestamps.completedAt = now;
  }

  persistJobToFile(job);
  return true;
}

/**
 * Returns a list of recent jobs, sorted newest first.
 */
export function listRecentJobs(limit: number = 20): ImageJob[] {
  cleanExpiredJobs();
  return Array.from(jobStore.values())
    .map((j) => checkAndRecoverStaleJob(j))
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, limit);
}

/**
 * Updates stage, progress, user-facing status message, and timestamps of an active job.
 */
export function updateJobStage(
  job: ImageJob,
  stage: JobStage,
  progressPercent: number,
  statusMessage?: string,
  meta?: Partial<ImageJobTimestamps>
): void {
  job.currentStage = stage;
  job.progressPercent = Math.min(100, Math.max(0, Math.round(progressPercent)));
  if (statusMessage) {
    job.statusMessage = statusMessage;
  }
  job.updatedAt = new Date().toISOString();
  if (meta) {
    job.timestamps = {
      dispatchedAt: job.timestamps?.dispatchedAt || job.startedAt,
      ...job.timestamps,
      ...meta,
    };
  }
  persistJobToFile(job);
}

/**
 * Queue processor: processes queued jobs up to the concurrency ceiling.
 */
export async function processNextJobs(): Promise<void> {
  if (activeRunningCount >= MAX_CONCURRENT_JOBS) {
    return;
  }

  const queuedJobs = Array.from(jobStore.values()).filter((j) => j.status === "queued");
  if (queuedJobs.length === 0) {
    return;
  }

  const nextJob = queuedJobs[0];
  nextJob.status = "processing";
  nextJob.statusMessage = "Starting image generation pipeline...";
  persistJobToFile(nextJob);
  activeRunningCount++;

  const promise = runJobExecution(nextJob).finally(() => {
    inFlightPromises.delete(nextJob.id);
    activeRunningCount--;
    processNextJobs();
  });
  inFlightPromises.set(nextJob.id, promise);
}

function isJobCancelled(j: ImageJob): boolean {
  return (j.status as string) === "cancelled";
}

/**
 * Explicitly triggers job execution if not already actively running.
 * Used by dedicated process endpoints to drive completion on serverless environments.
 */
export async function executeJob(jobId: string, jobParams?: any): Promise<ImageJob> {
  let job = getOrCreateJob(jobId, jobParams);
  if (!job) {
    throw new Error(`Job "${jobId}" not found.`);
  }

  if (job.status === "completed" || job.status === "cancelled") {
    return job;
  }

  job = checkAndRecoverStaleJob(job);
  if (job.status === "failed") {
    return job;
  }

  if (inFlightPromises.has(jobId)) {
    return inFlightPromises.get(jobId)!;
  }

  job.status = "processing";
  const now = new Date().toISOString();
  job.updatedAt = now;
  if (!job.timestamps) {
    job.timestamps = { dispatchedAt: job.startedAt };
  }
  job.timestamps.workerStartedAt = now;

  const promise = runJobExecution(job).finally(() => {
    inFlightPromises.delete(jobId);
  });
  inFlightPromises.set(jobId, promise);
  return promise;
}

/**
 * Executes a single job through Cloudflare FLUX.1 Schnell + Gemini Vision verification loop.
 */
async function runJobExecution(job: ImageJob): Promise<ImageJob> {
  const started = Date.now();
  job.attempts++;
  job.status = "processing";
  const workerStartIso = new Date().toISOString();
  job.updatedAt = workerStartIso;

  if (!job.timestamps) {
    job.timestamps = { dispatchedAt: job.startedAt };
  }
  if (!job.timestamps.workerStartedAt) {
    job.timestamps.workerStartedAt = workerStartIso;
  }

  try {
    if (isJobCancelled(job)) return job;

    // Stage 1: Worker initialized
    updateJobStage(
      job,
      "generating",
      15,
      "Worker initialized. Preparing generation pipeline with FLUX.1 Schnell...",
      { workerStartedAt: job.timestamps.workerStartedAt }
    );

    // Call generateImage with live stage callbacks and Gemini Vision verification
    const result = await generateImage({
      prompt: job.prompt,
      referenceImage: job.referenceImage,
      quality: job.quality,
      aspectRatio: job.aspectRatio,
      userId: job.userId,
      maxAttempts: 4,
      targetScore: 95,
      verify: true,
      onStageChange: (stage, attempt, maxAttempts, score, meta) => {
        if (stage === "generating") {
          const progress = attempt === 1
            ? (meta?.fluxRespondedAt ? 45 : 25)
            : (65 + (attempt - 1) * 10);
          updateJobStage(
            job,
            "generating",
            progress,
            meta?.fluxRespondedAt
              ? "FLUX.1 inference complete. Preparing visual adherence audit..."
              : `Generating image with Cloudflare Workers AI FLUX.1 Schnell (Attempt ${attempt}/${maxAttempts})...`,
            meta
          );
        } else if (stage === "verifying") {
          const progress = attempt === 1 ? 60 : (80 + (attempt - 1) * 5);
          updateJobStage(
            job,
            "independent_evaluation",
            Math.min(92, progress),
            `Auditing visual details with Gemini Vision (Attempt ${attempt}/${maxAttempts})...`,
            meta
          );
        } else if (stage === "refining") {
          updateJobStage(
            job,
            "targeted_correction",
            Math.min(95, 68 + (attempt - 1) * 8),
            `Refining prompt adherence (Score: ${score || 0}% < 95%, Attempt ${attempt}/${maxAttempts})...`,
            meta
          );
        }
      },
    });

    if (isJobCancelled(job)) return job;

    // Validate that result contains a genuine, accessible image
    if (!result?.image || typeof result.image !== "string" || !result.image.trim()) {
      throw new Error("Pipeline completed but no accessible image payload was produced.");
    }

    // Finalize successful completion
    const completedAt = new Date().toISOString();
    job.status = "completed";
    job.currentStage = "completed";
    job.progressPercent = 100;
    job.resultImage = result.image;
    job.accuracy = result.accuracy;
    job.verification = result.verification;
    job.modelUsed = result.model;
    job.providerUsed = result.provider;
    job.imageMetadata = result.metadata;
    job.statusMessage = `Image generated and verified against your request. Adherence: ${result.accuracy}%.`;
    job.latencyMs = Date.now() - started;
    job.completedAt = completedAt;
    job.updatedAt = completedAt;
    if (job.timestamps) {
      job.timestamps.completedAt = completedAt;
    }

    persistJobToFile(job);
    return job;
  } catch (err: any) {
    if (isJobCancelled(job)) return job;

    const errMsg = err?.message || String(err) || "Image generation pipeline failed";
    const failedAt = new Date().toISOString();
    job.status = "failed";
    job.currentStage = "completed";
    job.error = errMsg;
    job.statusMessage = `Generation failed: ${errMsg}`;
    job.progressPercent = 100;
    job.completedAt = failedAt;
    job.updatedAt = failedAt;
    if (job.timestamps) {
      job.timestamps.completedAt = failedAt;
    }
    job.latencyMs = Date.now() - started;

    persistJobToFile(job);
    return job;
  }
}

/**
 * Purges expired jobs older than 24 hours to conserve memory.
 */
function cleanExpiredJobs(): void {
  const now = Date.now();
  for (const [id, job] of jobStore.entries()) {
    const age = now - new Date(job.startedAt).getTime();
    if (
      age > JOB_EXPIRATION_MS &&
      (job.status === "completed" || job.status === "failed" || job.status === "cancelled")
    ) {
      jobStore.delete(id);
    }
  }
}

/**
 * Resets job store (for unit tests).
 */
export function resetJobQueue(): void {
  jobStore.clear();
  inFlightPromises.clear();
  activeRunningCount = 0;
  try {
    if (fs.existsSync(JOBS_DIR)) {
      const files = fs.readdirSync(JOBS_DIR);
      for (const f of files) {
        fs.unlinkSync(path.join(JOBS_DIR, f));
      }
    }
  } catch {
    // Non-fatal
  }
}
