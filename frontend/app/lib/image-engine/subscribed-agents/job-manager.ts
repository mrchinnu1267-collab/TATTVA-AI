/**
 * TATTVA AI - Subscribed Image Agent Job Manager
 * Persistent generation job tracker with user/workspace isolation & cancellation support.
 */

import { randomUUID } from "node:crypto";
import {
  AgentSubJob,
  GenerationJob,
  ImageIntentCategory,
  JobStatus,
  SubscribedAgentId,
} from "./types";

// In-memory persistent job registry
const jobStore = new Map<string, GenerationJob>();

export class SubscribedJobManager {
  /**
   * Creates a new generation job for Agent A and Agent B
   */
  public static createJob(params: {
    userId: string;
    workspaceId: string;
    originalPrompt: string;
    category: ImageIntentCategory;
    aspectRatio: string;
    agentAPrompt: string;
    agentBPrompt: string;
    agentAMode?: any;
    agentBMode?: any;
  }): GenerationJob {
    const jobId = `job_sub_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const agentAJob: AgentSubJob = {
      agentId: "agent_a",
      agentName: "Image Agent A",
      prompt: params.agentAPrompt,
      connectionMode: params.agentAMode || "local_companion",
      status: "queued",
      progressPercent: 0,
      createdAt: now,
      startedAt: now,
    } as any;

    const agentBJob: AgentSubJob = {
      agentId: "agent_b",
      agentName: "Image Agent B",
      prompt: params.agentBPrompt,
      connectionMode: params.agentBMode || "local_companion",
      status: "queued",
      progressPercent: 0,
      createdAt: now,
      startedAt: now,
    } as any;

    const job: GenerationJob = {
      jobId,
      userId: params.userId,
      workspaceId: params.workspaceId,
      originalPrompt: params.originalPrompt,
      category: params.category,
      aspectRatio: params.aspectRatio,
      status: "queued",
      agentAJob,
      agentBJob,
      fallbackApplied: false,
      createdAt: now,
      updatedAt: now,
    };

    jobStore.set(jobId, job);
    return job;
  }

  /**
   * Retrieves a job by ID with user and workspace isolation
   */
  public static getJob(
    jobId: string,
    userId?: string,
    workspaceId?: string
  ): GenerationJob | null {
    const job = jobStore.get(jobId);
    if (!job) return null;

    if (userId && job.userId !== userId) {
      throw new Error("Access denied: User does not own this generation job.");
    }
    if (workspaceId && job.workspaceId !== workspaceId) {
      throw new Error("Access denied: Generation job does not belong to this workspace.");
    }

    return job;
  }

  /**
   * Updates an individual agent subjob
   */
  public static updateSubJob(
    jobId: string,
    agentId: SubscribedAgentId,
    updates: Partial<AgentSubJob>
  ): GenerationJob {
    const job = jobStore.get(jobId);
    if (!job) throw new Error(`Job '${jobId}' not found.`);

    const targetSubJob = agentId === "agent_a" ? job.agentAJob : job.agentBJob;
    Object.assign(targetSubJob, updates);

    // Automatically recalculate top-level job status
    const statusA = job.agentAJob.status;
    const statusB = job.agentBJob.status;

    if (statusA === "cancelled" && statusB === "cancelled") {
      job.status = "cancelled";
      job.completedAt = new Date().toISOString();
    } else if (
      (statusA === "completed" || statusA === "failed" || statusA === "cancelled") &&
      (statusB === "completed" || statusB === "failed" || statusB === "cancelled")
    ) {
      job.status = statusA === "completed" || statusB === "completed" ? "completed" : "failed";
      job.completedAt = new Date().toISOString();
    } else if (statusA === "processing" || statusB === "processing") {
      job.status = "processing";
    } else if (statusA === "submitting" || statusB === "submitting") {
      job.status = "submitting";
    }

    job.updatedAt = new Date().toISOString();
    jobStore.set(jobId, job);
    return job;
  }

  /**
   * Cancels a running job
   */
  public static cancelJob(jobId: string, userId: string): GenerationJob {
    const job = this.getJob(jobId, userId);
    if (!job) throw new Error(`Job '${jobId}' not found.`);

    if (job.status === "completed") {
      throw new Error("Cannot cancel a job that has already completed.");
    }

    const now = new Date().toISOString();
    job.status = "cancelled";
    job.completedAt = now;
    job.updatedAt = now;

    if (job.agentAJob.status !== "completed") {
      job.agentAJob.status = "cancelled";
      job.agentAJob.error = "Cancelled by user request";
      job.agentAJob.completedAt = now;
    }
    if (job.agentBJob.status !== "completed") {
      job.agentBJob.status = "cancelled";
      job.agentBJob.error = "Cancelled by user request";
      job.agentBJob.completedAt = now;
    }

    jobStore.set(jobId, job);
    return job;
  }

  /**
   * Lists jobs belonging to a user/workspace
   */
  public static listJobs(userId: string, workspaceId?: string): GenerationJob[] {
    const list: GenerationJob[] = [];
    for (const job of jobStore.values()) {
      if (job.userId === userId) {
        if (!workspaceId || job.workspaceId === workspaceId) {
          list.push(job);
        }
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Clears in-memory store (for testing)
   */
  public static _clearAll() {
    jobStore.clear();
  }
}
