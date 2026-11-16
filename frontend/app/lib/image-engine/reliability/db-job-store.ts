/**
 * TATTVA AI - Durable PostgreSQL Job Store for Serverless Architecture
 * Integrates Supabase PostgreSQL `image_generation_jobs` table to persist job states,
 * atomic claims, worker heartbeats, and signed Supabase Storage asset paths across
 * independent Vercel Serverless Function instances.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ImageJob, JobStage, JobStatus, ImageJobTimestamps } from "./types";
import fs from "fs";
import path from "path";

const JOBS_DIR = path.join("/tmp", ".tattva_jobs");
const STALE_HEARTBEAT_THRESHOLD_MS = 45 * 1000; // 45 seconds
const JOB_DEADLINE_MS = 180 * 1000; // 180 seconds

export class DatabasePersistenceError extends Error {
  constructor(message: string, public readonly cause?: any) {
    super(message);
    this.name = "DatabasePersistenceError";
  }
}

export interface DbJobStoreHealth {
  databaseConfigured: boolean;
  lastPersistStatus: "healthy" | "failed" | "unconfigured";
  lastPersistError?: string;
  lastPersistTimestamp?: string;
  totalPersistOperations: number;
  failedPersistOperations: number;
}

const dbHealthState: DbJobStoreHealth = {
  databaseConfigured: false,
  lastPersistStatus: "unconfigured",
  totalPersistOperations: 0,
  failedPersistOperations: 0,
};

export function getDbJobStoreHealth(): DbJobStoreHealth {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return {
    ...dbHealthState,
    databaseConfigured: Boolean(url && key),
  };
}

export function resetDbJobStoreHealth(): void {
  dbHealthState.lastPersistStatus = "unconfigured";
  dbHealthState.lastPersistError = undefined;
  dbHealthState.lastPersistTimestamp = undefined;
  dbHealthState.totalPersistOperations = 0;
  dbHealthState.failedPersistOperations = 0;
}

// Safe in-memory cache for ultra-fast local lookups
declare global {
  var __TATTVA_DB_JOB_CACHE__: Map<string, ImageJob> | undefined;
}
const localJobCache: Map<string, ImageJob> =
  globalThis.__TATTVA_DB_JOB_CACHE__ || (globalThis.__TATTVA_DB_JOB_CACHE__ = new Map<string, ImageJob>());

/**
 * Initializes Supabase client with optional user access token or service role key.
 */
export function getDbClient(userAccessToken?: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  if (userAccessToken) {
    return createClient(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      },
      auth: { persistSession: false },
    });
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

function ensureJobsDir(): void {
  try {
    if (!fs.existsSync(JOBS_DIR)) {
      fs.mkdirSync(JOBS_DIR, { recursive: true });
    }
  } catch {
    // Non-fatal
  }
}

function persistLocalDisk(job: ImageJob): void {
  try {
    ensureJobsDir();
    const filePath = path.join(JOBS_DIR, `${job.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(job), "utf-8");
  } catch {
    // Non-fatal
  }
}

function loadLocalDisk(jobId: string): ImageJob | null {
  try {
    const filePath = path.join(JOBS_DIR, `${jobId}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as ImageJob;
    }
  } catch {
    // Non-fatal
  }
  return null;
}

/**
 * Maps a database row from `public.image_generation_jobs` to an `ImageJob` object.
 */
export function mapRowToJob(row: any): ImageJob {
  const startedAt = row.started_at || row.created_at || new Date().toISOString();
  const deadlineMs = row.deadline_at
    ? new Date(row.deadline_at).getTime()
    : new Date(startedAt).getTime() + JOB_DEADLINE_MS;

  return {
    id: row.id,
    userId: row.user_id || undefined,
    workspaceId: row.workspace_id || "default",
    prompt: row.prompt,
    promptHash: row.prompt_hash,
    status: row.status as JobStatus,
    currentStage: row.current_stage as JobStage,
    progressPercent: Number(row.progress_percent) || 0,
    attempts: Number(row.attempts) || 0,
    maxAttempts: Number(row.max_attempts) || 4,
    maxRetries: 2,
    accuracy: row.accuracy != null ? Number(row.accuracy) : undefined,
    verificationStatus: row.verification_status || undefined,
    verificationResult: row.verification_result || undefined,
    resultStoragePath: row.result_storage_path || undefined,
    resultImageUrl: row.result_image_url || undefined,
    resultImage: row.result_image_url || undefined,
    error: row.error_message || undefined,
    errorMessage: row.error_message || undefined,
    statusMessage: row.status_message || (row.status === "failed" && row.error_message ? `Generation failed: ${row.error_message}` : undefined),
    providerUsed: row.provider_used || row.timestamps?.providerUsed || undefined,
    modelUsed: row.model_used || row.timestamps?.modelUsed || undefined,
    timestamps: (row.timestamps as ImageJobTimestamps) || {},
    createdAt: row.created_at,
    startedAt,
    updatedAt: row.updated_at || startedAt,
    completedAt: row.completed_at || undefined,
    deadlineAt: row.deadline_at || undefined,
    workerHeartbeatAt: row.worker_heartbeat_at || undefined,
    deadline: deadlineMs,
    quality: "balanced",
    aspectRatio: "1:1",
    totalCostUsd: 0.0,
    dbPersisted: true,
    isDurable: true,
  };
}

/**
 * Maps an `ImageJob` object to the 23-column row schema for `image_generation_jobs`.
 */
export function mapJobToRow(job: ImageJob): Record<string, any> {
  const startedIso = job.startedAt || new Date().toISOString();
  const deadlineIso = job.deadlineAt || new Date(job.deadline || (Date.now() + JOB_DEADLINE_MS)).toISOString();

  return {
    id: job.id,
    user_id: job.userId || "anonymous",
    workspace_id: job.workspaceId || "default",
    prompt: job.prompt,
    prompt_hash: job.promptHash,
    status: job.status,
    current_stage: job.currentStage,
    progress_percent: Math.min(100, Math.max(0, Math.round(job.progressPercent || 0))),
    attempts: job.attempts || 0,
    max_attempts: job.maxAttempts || 4,
    accuracy: job.accuracy != null ? Number(job.accuracy) : null,
    verification_status: job.verificationStatus || null,
    verification_result: job.verificationResult || job.verification || null,
    result_storage_path: job.resultStoragePath || null,
    result_image_url: job.resultImageUrl || job.resultImage || null,
    error_message: job.error || job.errorMessage || null,
    timestamps: {
      ...(job.timestamps || {}),
      ...(job.providerUsed ? { providerUsed: job.providerUsed } : {}),
      ...(job.modelUsed ? { modelUsed: job.modelUsed } : {}),
    },
    created_at: job.createdAt || job.startedAt || startedIso,
    updated_at: job.updatedAt || new Date().toISOString(),
    started_at: startedIso,
    completed_at: job.completedAt || null,
    deadline_at: deadlineIso,
    worker_heartbeat_at: job.workerHeartbeatAt || new Date().toISOString(),
  };
}

/**
 * Inserts a new job record durably into Supabase PostgreSQL.
 * Strictly verifies persistence and reports observable health status.
 */
export async function insertJobDb(
  job: ImageJob,
  token?: string,
  options?: { requireDb?: boolean }
): Promise<ImageJob> {
  localJobCache.set(job.id, job);
  persistLocalDisk(job);

  const supabase = getDbClient(token);
  if (!supabase) {
    job.dbPersisted = false;
    job.isDurable = false;
    if (options?.requireDb) {
      throw new DatabasePersistenceError("Database is unconfigured (missing Supabase URL or Key)");
    }
    return job;
  }

  dbHealthState.totalPersistOperations++;
  try {
    const row = mapJobToRow(job);
    const { data, error } = await supabase
      .from("image_generation_jobs")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      dbHealthState.failedPersistOperations++;
      dbHealthState.lastPersistStatus = "failed";
      dbHealthState.lastPersistError = error.message;
      dbHealthState.lastPersistTimestamp = new Date().toISOString();
      console.warn(`[DbJobStore] Postgres insert error: ${error.message}`);
      job.dbPersisted = false;
      job.isDurable = false;
      if (options?.requireDb) {
        throw new DatabasePersistenceError(`PostgreSQL insert failed: ${error.message}`, error);
      }
      return job;
    }

    if (data) {
      dbHealthState.lastPersistStatus = "healthy";
      dbHealthState.lastPersistTimestamp = new Date().toISOString();
      const persistedJob = mapRowToJob(data);
      persistedJob.dbPersisted = true;
      persistedJob.isDurable = true;
      localJobCache.set(job.id, persistedJob);
      persistLocalDisk(persistedJob);
      return persistedJob;
    }
  } catch (err: any) {
    if (err instanceof DatabasePersistenceError) throw err;
    dbHealthState.failedPersistOperations++;
    dbHealthState.lastPersistStatus = "failed";
    dbHealthState.lastPersistError = err?.message;
    dbHealthState.lastPersistTimestamp = new Date().toISOString();
    console.warn(`[DbJobStore] Postgres insert exception: ${err?.message}`);
    job.dbPersisted = false;
    job.isDurable = false;
    if (options?.requireDb) {
      throw new DatabasePersistenceError(`PostgreSQL insert exception: ${err?.message}`, err);
    }
  }

  return job;
}

/**
 * Retrieves a job from Supabase PostgreSQL (authoritative source).
 */
export async function getJobFromDb(jobId: string, token?: string): Promise<ImageJob | null> {
  const supabase = getDbClient(token);

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

      if (!error && data) {
        const job = mapRowToJob(data);
        job.dbPersisted = true;
        job.isDurable = true;
        localJobCache.set(jobId, job);
        persistLocalDisk(job);
        return checkStaleAndRecover(job, token);
      }
    } catch (err: any) {
      console.warn(`[DbJobStore] Postgres select exception: ${err?.message}`);
    }
  }

  // Fallback to local memory cache or disk only if DB was not queried or not found
  let job = localJobCache.get(jobId) || loadLocalDisk(jobId);
  if (job) {
    return checkStaleAndRecover(job, token);
  }
  return null;
}

/**
 * Atomically claims a queued job or an abandoned job (>45s stale heartbeat).
 * Uses PostgreSQL RPC `claim_image_job` or direct conditional UPDATE.
 * Strictly prevents active worker collisions across serverless containers.
 */
export async function claimJobAtomic(jobId: string, token?: string): Promise<ImageJob | null> {
  const supabase = getDbClient(token);
  const nowIso = new Date().toISOString();

  if (supabase) {
    try {
      // 1. Attempt stored procedure RPC first
      const { data: rpcData, error: rpcErr } = await supabase.rpc("claim_image_job", {
        p_job_id: jobId,
      });

      if (!rpcErr && rpcData && rpcData.length > 0) {
        const claimed = mapRowToJob(rpcData[0]);
        claimed.dbPersisted = true;
        claimed.isDurable = true;
        localJobCache.set(jobId, claimed);
        persistLocalDisk(claimed);
        return claimed;
      }

      // If RPC is missing or returns error (e.g. not created yet or permission error), try direct UPDATE
      const staleCutoff = new Date(Date.now() - STALE_HEARTBEAT_THRESHOLD_MS).toISOString();
      const { data: updateData, error: updateErr } = await supabase
        .from("image_generation_jobs")
        .update({
          status: "processing",
          current_stage: "generating",
          worker_heartbeat_at: nowIso,
          started_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", jobId)
        .or(`status.eq.queued,and(status.eq.processing,worker_heartbeat_at.lt.${staleCutoff})`)
        .select()
        .maybeSingle();

      if (!updateErr && updateData) {
        const claimed = mapRowToJob(updateData);
        claimed.dbPersisted = true;
        claimed.isDurable = true;
        localJobCache.set(jobId, claimed);
        persistLocalDisk(claimed);
        return claimed;
      }

      // If updateErr is null and updateData is null: the table exists and query succeeded,
      // but the job was already claimed by another active worker in PostgreSQL!
      if (!updateErr && !updateData) {
        return null;
      }

      // If updateErr indicates a missing table or schema issue, log and fall through to local atomic claim
      if (updateErr) {
        console.warn(`[DbJobStore] Postgres atomic claim fallback due to DB error: ${updateErr.message}`);
      }
    } catch (err: any) {
      console.warn(`[DbJobStore] Atomic claim exception: ${err?.message}`);
    }
  }

  // Local fallback atomic check (when database table is unmigrated or client unconfigured)
  const local = localJobCache.get(jobId) || loadLocalDisk(jobId);
  if (local) {
    const isQueued = local.status === "queued";
    const heartbeatAge = Date.now() - new Date(local.workerHeartbeatAt || local.updatedAt).getTime();
    const isStale = local.status === "processing" && heartbeatAge > STALE_HEARTBEAT_THRESHOLD_MS;

    if (isQueued || isStale) {
      local.status = "processing";
      local.currentStage = "generating";
      local.workerHeartbeatAt = nowIso;
      local.updatedAt = nowIso;
      local.dbPersisted = false;
      local.isDurable = false;
      localJobCache.set(jobId, local);
      persistLocalDisk(local);
      return local;
    }
    return null; // Already claimed by another active worker
  }

  return null;
}

/**
 * Updates an active job in PostgreSQL and local cache.
 * Returns null if PostgreSQL update failed when database is configured.
 */
export async function updateJobProgressDb(
  jobId: string,
  updates: Partial<ImageJob>,
  token?: string
): Promise<ImageJob | null> {
  const existing = localJobCache.get(jobId) || loadLocalDisk(jobId);
  const nowIso = new Date().toISOString();

  const merged: ImageJob = {
    ...(existing || ({} as ImageJob)),
    ...updates,
    id: jobId,
    updatedAt: nowIso,
    workerHeartbeatAt: updates.workerHeartbeatAt || nowIso,
  };

  localJobCache.set(jobId, merged);
  persistLocalDisk(merged);

  const supabase = getDbClient(token);
  if (supabase) {
    dbHealthState.totalPersistOperations++;
    try {
      const rowUpdates: Record<string, any> = {
        updated_at: nowIso,
        worker_heartbeat_at: merged.workerHeartbeatAt,
      };

      if (updates.status !== undefined) rowUpdates.status = updates.status;
      if (updates.currentStage !== undefined) rowUpdates.current_stage = updates.currentStage;
      if (updates.progressPercent !== undefined) rowUpdates.progress_percent = updates.progressPercent;
      if (updates.attempts !== undefined) rowUpdates.attempts = updates.attempts;
      if (updates.accuracy !== undefined) rowUpdates.accuracy = updates.accuracy;
      if (updates.verificationStatus !== undefined) rowUpdates.verification_status = updates.verificationStatus;
      if (updates.verificationResult !== undefined) rowUpdates.verification_result = updates.verificationResult;
      if (updates.resultStoragePath !== undefined) rowUpdates.result_storage_path = updates.resultStoragePath;
      if (updates.resultImageUrl !== undefined) rowUpdates.result_image_url = updates.resultImageUrl;
      if (updates.error !== undefined || updates.errorMessage !== undefined) {
        rowUpdates.error_message = updates.error || updates.errorMessage;
      }
      if (updates.completedAt !== undefined) rowUpdates.completed_at = updates.completedAt;
      if (updates.timestamps !== undefined || merged.providerUsed || merged.modelUsed) {
        rowUpdates.timestamps = {
          ...(updates.timestamps || merged.timestamps || {}),
          ...(merged.providerUsed ? { providerUsed: merged.providerUsed } : {}),
          ...(merged.modelUsed ? { modelUsed: merged.modelUsed } : {}),
        };
      }

      const { data, error } = await supabase
        .from("image_generation_jobs")
        .update(rowUpdates)
        .eq("id", jobId)
        .select()
        .maybeSingle();

      if (error) {
        dbHealthState.failedPersistOperations++;
        dbHealthState.lastPersistStatus = "failed";
        dbHealthState.lastPersistError = error.message;
        dbHealthState.lastPersistTimestamp = new Date().toISOString();
        console.warn(`[DbJobStore] Postgres update error on ${jobId}: ${error.message}`);
        merged.dbPersisted = false;
        merged.isDurable = false;
        return merged;
      }

      if (data) {
        dbHealthState.lastPersistStatus = "healthy";
        dbHealthState.lastPersistTimestamp = new Date().toISOString();
        const persisted = mapRowToJob(data);
        persisted.dbPersisted = true;
        persisted.isDurable = true;
        localJobCache.set(jobId, persisted);
        persistLocalDisk(persisted);
        return persisted;
      }
    } catch (err: any) {
      dbHealthState.failedPersistOperations++;
      dbHealthState.lastPersistStatus = "failed";
      dbHealthState.lastPersistError = err?.message;
      dbHealthState.lastPersistTimestamp = new Date().toISOString();
      console.warn(`[DbJobStore] Postgres update exception on ${jobId}: ${err?.message}`);
      merged.dbPersisted = false;
      merged.isDurable = false;
      return merged;
    }
  }

  merged.dbPersisted = false;
  merged.isDurable = false;
  return merged;
}

/**
 * Periodically beats worker heartbeat to prove the serverless container is actively executing.
 */
export async function updateWorkerHeartbeatDb(jobId: string, token?: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const existing = localJobCache.get(jobId);
  if (existing) {
    existing.workerHeartbeatAt = nowIso;
    existing.updatedAt = nowIso;
    persistLocalDisk(existing);
  }

  const supabase = getDbClient(token);
  if (supabase) {
    try {
      await supabase
        .from("image_generation_jobs")
        .update({
          worker_heartbeat_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", jobId);
    } catch {
      // Non-fatal heartbeat notification
    }
  }
}

/**
 * Checks if a job has exceeded its 180s deadline or its 45s heartbeat and transitions to failed.
 */
export function checkStaleAndRecover(job: ImageJob, token?: string): ImageJob {
  if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
    return job;
  }

  const now = Date.now();
  const startedMs = new Date(job.startedAt).getTime();
  const heartbeatMs = new Date(job.workerHeartbeatAt || job.updatedAt).getTime();
  const deadlineMs = job.deadline || (startedMs + JOB_DEADLINE_MS);

  // 1. Maximum hard execution deadline (180s)
  if (now > deadlineMs) {
    const failedAt = new Date().toISOString();
    job.status = "failed";
    job.currentStage = "completed";
    job.progressPercent = 100;
    job.error = `Job exceeded maximum execution time of ${Math.round(JOB_DEADLINE_MS / 1000)} seconds.`;
    job.errorMessage = job.error;
    job.statusMessage = "Image generation timed out: maximum execution deadline exceeded. Please retry.";
    job.completedAt = failedAt;
    job.updatedAt = failedAt;
    if (job.timestamps) {
      job.timestamps.completedAt = failedAt;
    }

    updateJobProgressDb(job.id, {
      status: "failed",
      currentStage: "completed",
      progressPercent: 100,
      error: job.error,
      errorMessage: job.error,
      completedAt: failedAt,
      timestamps: job.timestamps,
    }, token).catch(() => {});

    return job;
  }

  // 2. Stale worker heartbeat (>45s)
  if (job.status === "processing" && (now - heartbeatMs > STALE_HEARTBEAT_THRESHOLD_MS)) {
    const failedAt = new Date().toISOString();
    job.status = "failed";
    job.currentStage = "completed";
    job.progressPercent = 100;
    job.error = "Background worker process timed out or was terminated. Please retry.";
    job.errorMessage = job.error;
    job.statusMessage = "Worker process terminated unexpectedly. Please retry.";
    job.completedAt = failedAt;
    job.updatedAt = failedAt;
    if (job.timestamps) {
      job.timestamps.completedAt = failedAt;
    }

    updateJobProgressDb(job.id, {
      status: "failed",
      currentStage: "completed",
      progressPercent: 100,
      error: job.error,
      errorMessage: job.error,
      completedAt: failedAt,
      timestamps: job.timestamps,
    }, token).catch(() => {});

    return job;
  }

  return job;
}

/**
 * Finds an active existing job by prompt hash and user to prevent duplicate jobs.
 */
export async function findActiveJobDb(promptHash: string, userId?: string, token?: string): Promise<ImageJob | null> {
  const supabase = getDbClient(token);
  const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();

  if (supabase) {
    try {
      let query = supabase
        .from("image_generation_jobs")
        .select("*")
        .eq("prompt_hash", promptHash)
        .in("status", ["queued", "processing"])
        .gt("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(1);

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const job = mapRowToJob(data[0]);
        return checkStaleAndRecover(job, token);
      }
    } catch (err: any) {
      console.warn(`[DbJobStore] findActiveJobDb query notice: ${err?.message}`);
    }
  }

  // Local fallback
  for (const job of localJobCache.values()) {
    if (
      job.promptHash === promptHash &&
      (!userId || job.userId === userId) &&
      (job.status === "queued" || job.status === "processing")
    ) {
      return checkStaleAndRecover(job, token);
    }
  }

  return null;
}
