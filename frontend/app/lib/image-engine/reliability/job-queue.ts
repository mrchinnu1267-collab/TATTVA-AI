/**
 * TATTVA AI - Scalable Background Image Job Queue (Phase K & Asynchronous Chat Reliability)
 * Manages asynchronous image generation workflows, concurrency limits,
 * progress updates, job cancellation, duplicate prevention, and cross-lambda persistence.
 */

import fs from "fs";
import path from "path";
import { ImageJob, JobStatus, JobStage } from "./types";
import { ImageQuality, AspectRatio } from "../types";
import { hashPrompt } from "./prompt-cache";
import { generateImage } from "../engine";

const MAX_CONCURRENT_JOBS = 4;
const MAX_JOB_RETRIES = 2;
const JOB_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const JOBS_DIR = path.join("/tmp", ".tattva_jobs");

// Ensure globalThis preservation across hot module reloads in Node.js
declare global {
  var __TATTVA_IMAGE_JOBS__: Map<string, ImageJob> | undefined;
}

const jobStore: Map<string, ImageJob> =
  globalThis.__TATTVA_IMAGE_JOBS__ || (globalThis.__TATTVA_IMAGE_JOBS__ = new Map<string, ImageJob>());

let activeRunningCount = 0;

function ensureJobsDir(): void {
  try {
    if (!fs.existsSync(JOBS_DIR)) {
      fs.mkdirSync(JOBS_DIR, { recursive: true });
    }
  } catch {
    // Non-fatal if filesystem is read-only
  }
}

function persistJobToFile(job: ImageJob): void {
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
 * Finds an active existing job by prompt hash and user to prevent duplicate job creation.
 */
export function findActiveJob(promptHash: string, userId?: string): ImageJob | null {
  cleanExpiredJobs();
  const cutoff = Date.now() - 3 * 60 * 1000; // within last 3 minutes
  for (const job of jobStore.values()) {
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
  };

  jobStore.set(id, job);
  persistJobToFile(job);

  // Trigger processing asynchronously in background
  processNextJobs();

  return job;
}

/**
 * Retrieves an image job by its unique identifier (with cross-lambda disk fallback).
 */
export function getJob(jobId: string): ImageJob | null {
  if (jobStore.has(jobId)) {
    return jobStore.get(jobId)!;
  }
  return loadJobFromFile(jobId);
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

  job.status = "cancelled";
  job.currentStage = "completed";
  job.progressPercent = 100;
  job.statusMessage = "Job cancelled by user.";
  job.updatedAt = new Date().toISOString();
  job.completedAt = new Date().toISOString();

  persistJobToFile(job);
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
 * Updates stage, progress, and user-facing status message of an active job.
 */
export function updateJobStage(
  job: ImageJob,
  stage: JobStage,
  progressPercent: number,
  statusMessage?: string
): void {
  job.currentStage = stage;
  job.progressPercent = progressPercent;
  if (statusMessage) {
    job.statusMessage = statusMessage;
  }
  job.updatedAt = new Date().toISOString();
  persistJobToFile(job);
}

// In-flight execution promises for active jobs to prevent duplicate runs and await completion
const inFlightPromises = new Map<string, Promise<ImageJob>>();

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
export async function executeJob(jobId: string): Promise<ImageJob> {
  const job = getJob(jobId);
  if (!job) {
    throw new Error(`Job "${jobId}" not found.`);
  }

  if (job.status === "completed" || job.status === "cancelled") {
    return job;
  }

  if (inFlightPromises.has(jobId)) {
    return inFlightPromises.get(jobId)!;
  }

  job.status = "processing";
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

  try {
    if (isJobCancelled(job)) return job;

    // Stage 1: Initializing
    updateJobStage(
      job,
      "generating",
      20,
      "Generating image with Cloudflare Workers AI FLUX.1 Schnell..."
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
      onStageChange: (stage, attempt, maxAttempts, score) => {
        if (stage === "generating") {
          updateJobStage(
            job,
            "generating",
            Math.min(45, 15 + attempt * 10),
            "Generating image with Cloudflare Workers AI FLUX.1 Schnell..."
          );
        } else if (stage === "verifying") {
          updateJobStage(
            job,
            "independent_evaluation",
            Math.min(75, 40 + attempt * 15),
            `Auditing visual details with Gemini Vision (Attempt ${attempt}/${maxAttempts})...`
          );
        } else if (stage === "refining") {
          updateJobStage(
            job,
            "targeted_correction",
            Math.min(95, 60 + attempt * 10),
            `Refining prompt adherence (Attempt ${attempt}/${maxAttempts}, score: ${score || 0}%)...`
          );
        }
      },
    });

    if (isJobCancelled(job)) return job;

    // Finalize successful completion
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
    job.completedAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();

    persistJobToFile(job);
    return job;
  } catch (err: any) {
    if (isJobCancelled(job)) return job;

    const errMsg = err?.message || String(err) || "Image generation pipeline failed";
    job.status = "failed";
    job.error = errMsg;
    job.statusMessage = `Generation failed: ${errMsg}`;
    job.progressPercent = 100;
    job.completedAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();
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
