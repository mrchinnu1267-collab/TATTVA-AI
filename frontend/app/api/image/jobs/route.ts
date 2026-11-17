/**
 * TATTVA AI - Background Image Job Queue & Operational Reliability API (Phase K)
 * Handles job dispatch, progress polling, job cancellation, and metrics retrieval.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createImageJob,
  getJob,
  getJobAsync,
  getOrCreateJob,
  checkAndRecoverStaleJob,
  cancelJob,
  listRecentJobs,
  executeJob,
} from "@/app/lib/image-engine/reliability/job-queue";
import {
  validatePromptInput,
  validateReferenceImagePayload,
  checkRateLimit,
  sanitizeUserFacingError,
} from "@/app/lib/image-engine/reliability/security-validator";
import {
  verifySpendingAuthorization,
  estimateGenerationCost,
} from "@/app/lib/image-engine/reliability/cost-tracker";
import { getReliabilityDashboardMetrics } from "@/app/lib/image-engine/reliability/performance-monitor";
import { verifyUserSession } from "@/app/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    const session = await verifyUserSession(req);
    if (!session.authenticated) {
      return NextResponse.json(
        { success: false, error: "Authentication required to access image jobs." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("id");
    const view = searchParams.get("view");
    const workspaceId = searchParams.get("workspaceId") || "default";

    if (view === "metrics") {
      const metrics = getReliabilityDashboardMetrics(workspaceId);
      return NextResponse.json({ success: true, metrics });
    }

    if (jobId) {
      let job = await getJobAsync(jobId);
      if (!job) {
        const rawParams = searchParams.get("params");
        if (rawParams) {
          try {
            const parsed = JSON.parse(decodeURIComponent(rawParams));
            job = getOrCreateJob(jobId, { ...parsed, userId: session.userId });
          } catch {
            // ignore parse error
          }
        }
      }

      if (!job) {
        return NextResponse.json(
          { success: false, error: `Job with ID "${jobId}" not found.` },
          { status: 404 }
        );
      }

      // Strict Ownership Verification: Caller must own this job
      if (job.userId && job.userId !== session.userId) {
        return NextResponse.json(
          { success: false, error: "Forbidden: You are not authorized to view this job." },
          { status: 403 }
        );
      }

      job = checkAndRecoverStaleJob(job);

      // If requested with drive=true and job is queued or pending, trigger execution
      if (job.status === "queued" && searchParams.get("drive") === "true") {
        executeJob(job.id).catch((err) => {
          console.error(`[JobQueue] Driver execution error on job ${job?.id}:`, err);
        });
      }

      return NextResponse.json({ success: true, job });
    }

    // Default: List recent jobs strictly scoped to the authenticated caller
    const limit = Number(searchParams.get("limit")) || 20;
    const jobs = listRecentJobs(limit, session.userId);

    return NextResponse.json({ success: true, jobs });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: sanitizeUserFacingError(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyUserSession(req);
    if (!session.authenticated) {
      return NextResponse.json(
        { success: false, error: "Authentication required to manage image jobs." },
        { status: 401 }
      );
    }

    // 1. Anti-abuse rate limit check
    const clientIp = req.headers.get("x-forwarded-for") || "client";
    const rateCheck = checkRateLimit(`img_job_${session.userId}_${clientIp}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Please wait ${rateCheck.resetSeconds}s before submitting new generation requests.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // Action: Process existing job asynchronously with dedicated function execution budget
    if (body.action === "process" && body.jobId) {
      let job = await getJobAsync(body.jobId);
      if (!job && body.jobParams) {
        job = getOrCreateJob(body.jobId, { ...body.jobParams, userId: session.userId });
      }
      if (!job) {
        return NextResponse.json(
          { success: false, error: `Job "${body.jobId}" not found.` },
          { status: 404 }
        );
      }

      // Strict Ownership Verification before executing
      if (job.userId && job.userId !== session.userId) {
        return NextResponse.json(
          { success: false, error: "Forbidden: You are not authorized to execute this job." },
          { status: 403 }
        );
      }

      job = checkAndRecoverStaleJob(job);

      // If already finished, return immediately
      if (job.status === "completed" || job.status === "failed") {
        return NextResponse.json({ success: true, job });
      }

      // Execute job to completion on this long-running worker container
      const completedJob = await executeJob(body.jobId, body.jobParams);
      return NextResponse.json({ success: true, job: completedJob });
    }

    // 2. Input validation
    const promptValidation = validatePromptInput(body.prompt);
    if (!promptValidation.valid) {
      return NextResponse.json(
        { success: false, error: promptValidation.error },
        { status: 400 }
      );
    }

    // 3. Reference image validation (if provided)
    if (body.referenceImage) {
      const refValidation = validateReferenceImagePayload(body.referenceImage);
      if (!refValidation.valid) {
        return NextResponse.json(
          { success: false, error: refValidation.error },
          { status: 400 }
        );
      }
    }

    const workspaceId = body.workspaceId || "default";
    const quality = body.quality || "balanced";

    // 4. Upfront cost estimation & spending authorization
    const costEstimate = estimateGenerationCost({
      provider: body.provider || "gemini",
      quality,
      isMultiStage: true,
    });

    const authCheck = verifySpendingAuthorization(workspaceId, costEstimate.estimatedCostUsd);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.reason },
        { status: 403 }
      );
    }

    // 5. Create background job (strictly binding userId to verified session)
    const job = createImageJob({
      prompt: promptValidation.sanitizedPrompt!,
      referenceImage: body.referenceImage,
      quality,
      aspectRatio: body.aspectRatio || "1:1",
      userId: session.userId,
      workspaceId,
      provider: body.provider,
    });

    return NextResponse.json({
      success: true,
      job,
      estimatedCostUsd: costEstimate.estimatedCostUsd,
      warning: authCheck.isWarning ? authCheck.reason : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: sanitizeUserFacingError(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await verifyUserSession(req);
    if (!session.authenticated) {
      return NextResponse.json(
        { success: false, error: "Authentication required to cancel image jobs." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("id");

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "Missing required job ID." },
        { status: 400 }
      );
    }

    const job = await getJobAsync(jobId);
    if (!job) {
      return NextResponse.json(
        { success: false, error: `Job "${jobId}" not found.` },
        { status: 404 }
      );
    }

    // Strict Ownership Verification: Only owner can cancel
    if (job.userId && job.userId !== session.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You are not authorized to cancel this job." },
        { status: 403 }
      );
    }

    const cancelled = cancelJob(jobId, session.userId);
    if (!cancelled) {
      return NextResponse.json(
        { success: false, error: "Job cannot be cancelled (already completed or not found)." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Job "${jobId}" has been cancelled.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: sanitizeUserFacingError(err) },
      { status: 500 }
    );
  }
}

