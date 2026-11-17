/**
 * TATTVA AI - Scalable Background Image Job Queue (Phase K & Asynchronous Chat Reliability)
 * Manages asynchronous image generation workflows, concurrency limits,
 * progress updates, job cancellation, duplicate prevention, cross-lambda persistence,
 * and automatic stale job recovery / worker crash transitions.
 */

import fs from "fs";
import path from "path";
import { ImageJob, JobStatus, JobStage, ImageJobTimestamps } from "./types";
import { ImageQuality, AspectRatio, ImageProviderId } from "../types";
import { hashPrompt } from "./prompt-cache";
import { generateImage } from "../engine";
import { StorageService } from "../services/storage.service";
import {
  insertJobDb,
  getJobFromDb,
  claimJobAtomic,
  updateJobProgressDb,
  updateWorkerHeartbeatDb,
  findActiveJobDb,
} from "./db-job-store";

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
  provider?: ImageProviderId;
  forceNew?: boolean;
  userAccessToken?: string;
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
  const deadlineIso = new Date(deadline).toISOString();

  const job: ImageJob = {
    id,
    userId: params.userId,
    workspaceId: params.workspaceId || "default",
    prompt: params.prompt.trim(),
    promptHash,
    referenceImage: params.referenceImage,
    quality: params.quality || "balanced",
    aspectRatio: params.aspectRatio || "1:1",
    providerUsed: params.provider,
    status: "queued",
    progressPercent: 5,
    currentStage: "queued",
    statusMessage: "Job queued for generation...",
    attempts: 0,
    maxRetries: MAX_JOB_RETRIES,
    maxAttempts: 4,
    totalCostUsd: 0.0,
    createdAt: now,
    startedAt: now,
    updatedAt: now,
    workerHeartbeatAt: now,
    deadlineAt: deadlineIso,
    deadline,
    timestamps: {
      dispatchedAt: now,
    },
  };

  jobStore.set(id, job);
  persistJobToFile(job);
  insertJobDb(job, params.userAccessToken)
    .then((persisted) => {
      if (persisted) {
        job.dbPersisted = persisted.dbPersisted;
        job.isDurable = persisted.isDurable;
      }
    })
    .catch((err: any) => {
      console.warn(`[JobQueue] DB persistence error on dispatch: ${err?.message}`);
    });

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
 * Asynchronously retrieves a job from database (authoritative source) or local cache across serverless instances.
 * PostgreSQL is authoritative: never return an outdated local cache entry when a database read is available.
 */
export async function getJobAsync(jobId: string, token?: string): Promise<ImageJob | null> {
  // 1. Authoritative: Fetch latest committed state from PostgreSQL
  try {
    const dbJob = await getJobFromDb(jobId, token);
    if (dbJob) {
      // Invalidate / update local memory cache with latest committed DB state
      jobStore.set(jobId, dbJob);
      persistJobToFile(dbJob);
      return dbJob;
    }
  } catch (err: any) {
    console.warn(`[JobQueue] DB getJobAsync error for ${jobId}: ${err?.message}`);
  }

  // 2. Fallback to local memory cache or disk if DB read returned null (e.g. unconfigured or offline)
  let local: ImageJob | null = null;
  if (jobStore.has(jobId)) {
    local = jobStore.get(jobId)!;
  } else {
    local = loadJobFromFile(jobId);
  }

  if (local) {
    const recovered = checkAndRecoverStaleJob(local);
    recovered.fromCache = true;
    return recovered;
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
  const now = new Date().toISOString();
  job.updatedAt = now;
  job.workerHeartbeatAt = now;
  if (meta) {
    job.timestamps = {
      dispatchedAt: job.timestamps?.dispatchedAt || job.startedAt,
      ...job.timestamps,
      ...meta,
    };
  }
  persistJobToFile(job);
  updateJobProgressDb(job.id, {
    currentStage: stage,
    progressPercent: job.progressPercent,
    statusMessage,
    workerHeartbeatAt: now,
    timestamps: job.timestamps,
  }).catch(() => {});
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
 * Uses atomic claiming to prevent duplicate execution across independent serverless lambdas.
 */
export async function executeJob(jobId: string, jobParams?: any): Promise<ImageJob> {
  let job = getOrCreateJob(jobId, jobParams);
  if (!job) {
    // Attempt rehydration from durable database
    job = await getJobAsync(jobId);
    if (!job) {
      throw new Error(`Job "${jobId}" not found.`);
    }
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

  // Atomically claim the job to prevent dual execution across serverless instances
  const claimed = await claimJobAtomic(jobId, jobParams?.userAccessToken);
  if (!claimed) {
    // If claim was not granted (already held by another active worker or completed), do not execute!
    const latest = await getJobAsync(jobId, jobParams?.userAccessToken);
    return latest || job;
  }
  job = claimed;

  job.status = "processing";
  const now = new Date().toISOString();
  job.updatedAt = now;
  job.workerHeartbeatAt = now;
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
  job.workerHeartbeatAt = workerStartIso;

  if (!job.timestamps) {
    job.timestamps = { dispatchedAt: job.startedAt };
  }
  if (!job.timestamps.workerStartedAt) {
    job.timestamps.workerStartedAt = workerStartIso;
  }

  try {
    if (isJobCancelled(job)) return job;

    const providerLabel =
      job.providerUsed === "gemini"
        ? "Google Gemini (gemini-3.1-flash-image)"
        : job.providerUsed === "cloudflare"
        ? "Cloudflare FLUX.1 Schnell"
        : job.providerUsed === "local"
        ? "TATTVA Local Neural Synthesizer (Offline)"
        : "AI Image Engine";

    // Stage 1: Worker initialized
    updateJobStage(
      job,
      "generating",
      15,
      `Worker initialized. Preparing generation pipeline with ${providerLabel}...`,
      { workerStartedAt: job.timestamps.workerStartedAt }
    );

    // Call generateImage with live stage callbacks and Gemini Vision verification
    const result = await generateImage({
      prompt: job.prompt,
      referenceImage: job.referenceImage,
      quality: job.quality,
      aspectRatio: job.aspectRatio,
      provider: job.providerUsed,
      userId: job.userId,
      maxAttempts: 4,
      targetScore: 95,
      verify: true,
      onStageChange: (stage, attempt, maxAttempts, score, meta) => {
        updateWorkerHeartbeatDb(job.id).catch(() => {});
        if (stage === "generating") {
          const progress = attempt === 1
            ? (meta?.fluxRespondedAt ? 45 : 25)
            : (65 + (attempt - 1) * 10);
          updateJobStage(
            job,
            "generating",
            progress,
            meta?.fluxRespondedAt
              ? "Inference complete. Preparing visual adherence audit..."
              : `Generating image with ${providerLabel} (Attempt ${attempt}/${maxAttempts})...`,
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

    // Stage: Upload to Supabase Storage
    updateJobStage(
      job,
      "storage_upload",
      96,
      "Persisting image asset to Supabase Storage..."
    );

    let storagePath = "";
    let accessUrl = result.image;
    try {
      const storageRecord = await StorageService.persistImage({
        dataUriOrBuffer: result.image,
        prompt: job.prompt,
        provider: result.provider || "gemini",
        model: result.model || "gemini-3.1-flash-image",
        userId: job.userId || "anonymous",
        workspaceId: job.workspaceId || "default",
        parameters: {
          width: result.width || 1024,
          height: result.height || 1024,
          aspectRatio: job.aspectRatio || "1:1",
          seed: result.seed || 0,
          quality: job.quality || "balanced",
        },
        accuracyScorecard: result.verification?.categoryScores as any,
      });

      if (!storageRecord.url || !storageRecord.storagePath) {
        throw new Error("Storage service returned empty URL or path.");
      }

      accessUrl = storageRecord.url;
      storagePath = storageRecord.storagePath;
    } catch (storageErr: any) {
      console.error("[JobQueue] Supabase storage upload failed:", storageErr?.message);
      const failedAt = new Date().toISOString();
      job.status = "failed";
      job.currentStage = "completed";
      job.progressPercent = 100;
      job.error = `Durable storage upload failed: ${storageErr?.message || "Could not upload image to Supabase Storage"}`;
      job.errorMessage = job.error;
      job.statusMessage = "Image generation failed during cloud storage persistence. Please retry.";
      job.completedAt = failedAt;
      job.updatedAt = failedAt;
      if (job.timestamps) {
        job.timestamps.completedAt = failedAt;
      }
      persistJobToFile(job);
      await updateJobProgressDb(job.id, {
        status: "failed",
        currentStage: "completed",
        progressPercent: 100,
        error: job.error,
        errorMessage: job.error,
        completedAt: failedAt,
        timestamps: job.timestamps,
      });
      return job;
    }

    // Honest verification status calculation
    let verificationStatus: "VERIFIED" | "PARTIALLY_VERIFIED" | "UNVERIFIED" = "UNVERIFIED";
    if (result.accuracy >= 95) {
      verificationStatus = "VERIFIED";
    } else if (result.accuracy >= 70) {
      verificationStatus = "PARTIALLY_VERIFIED";
    }

    // Finalize successful completion
    const completedAt = new Date().toISOString();
    job.status = "completed";
    job.currentStage = "completed";
    job.progressPercent = 100;
    job.resultImage = accessUrl;
    job.resultImageUrl = accessUrl;
    job.resultStoragePath = storagePath;
    job.attempts = result.metadata?.attempts || (Array.isArray(result.attempts) ? result.attempts.length : job.attempts);
    job.accuracy = result.accuracy;
    job.verification = result.verification;
    job.verificationStatus = verificationStatus;
    job.verificationResult = result.verification;
    job.modelUsed = result.model;
    job.providerUsed = result.provider;
    job.imageMetadata = result.metadata;
    const successProviderName =
      result.provider === "gemini"
        ? "Google Gemini"
        : result.provider === "local"
        ? "Local Neural Synthesizer"
        : "Cloudflare";
    job.statusMessage = `Image generated with ${successProviderName} and verified against your request. Adherence: ${result.accuracy}%.`;
    job.latencyMs = Date.now() - started;
    job.completedAt = completedAt;
    job.updatedAt = completedAt;
    if (job.timestamps) {
      job.timestamps.completedAt = completedAt;
    }

    persistJobToFile(job);
    const updatedDbJob = await updateJobProgressDb(job.id, {
      status: "completed",
      currentStage: "completed",
      progressPercent: 100,
      attempts: job.attempts,
      resultImageUrl: accessUrl,
      resultStoragePath: storagePath,
      accuracy: result.accuracy,
      verificationStatus,
      verificationResult: result.verification,
      completedAt,
      timestamps: job.timestamps,
    });

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !updatedDbJob) {
      console.error(`[JobQueue] Failed to confirm job ${job.id} completion in PostgreSQL.`);
      job.status = "failed";
      job.error = "Failed to confirm completed job state and storage path in PostgreSQL.";
      job.errorMessage = job.error;
      job.statusMessage = "Image generation succeeded, but database persistence confirmation failed.";
      return job;
    }

    return job;
  } catch (err: any) {
    if (isJobCancelled(job)) return job;

    const errMsg = err?.message || String(err) || "Image generation pipeline failed";
    const failedAt = new Date().toISOString();
    job.status = "failed";
    job.currentStage = "completed";
    job.error = errMsg;
    job.errorMessage = errMsg;
    job.statusMessage = `Generation failed: ${errMsg}`;
    job.progressPercent = 100;
    job.completedAt = failedAt;
    job.updatedAt = failedAt;
    if (job.timestamps) {
      job.timestamps.completedAt = failedAt;
    }
    job.latencyMs = Date.now() - started;

    persistJobToFile(job);
    updateJobProgressDb(job.id, {
      status: "failed",
      currentStage: "completed",
      progressPercent: 100,
      error: errMsg,
      errorMessage: errMsg,
      statusMessage: job.statusMessage,
      completedAt: failedAt,
      timestamps: job.timestamps,
    }).catch(() => {});

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
