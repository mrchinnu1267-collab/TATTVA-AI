/**
 * TATTVA AI - Background Image Job Queue & Operational Reliability API (Phase K)
 * Handles job dispatch, progress polling, job cancellation, and metrics retrieval.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createImageJob,
  getJob,
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("id");
    const view = searchParams.get("view");
    const workspaceId = searchParams.get("workspaceId") || "default";

    if (view === "metrics") {
      const metrics = getReliabilityDashboardMetrics(workspaceId);
      return NextResponse.json({ success: true, metrics });
    }

    if (jobId) {
      let job = getJob(jobId);
      if (!job) {
        return NextResponse.json(
          { success: false, error: `Job with ID "${jobId}" not found.` },
          { status: 404 }
        );
      }

      // If requested with drive=true and job is queued or pending, trigger execution asynchronously
      if ((job.status === "queued" || (job.status === "processing" && job.attempts === 0)) && searchParams.get("drive") === "true") {
        executeJob(job.id).catch((err) => {
          console.error(`[JobQueue] Driver execution error on job ${job?.id}:`, err);
        });
      }

      return NextResponse.json({ success: true, job });
    }

    // Default: List recent jobs
    const limit = Number(searchParams.get("limit")) || 20;
    const jobs = listRecentJobs(limit);

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
    // 1. Anti-abuse rate limit check
    const clientIp = req.headers.get("x-forwarded-for") || "client";
    const rateCheck = checkRateLimit(clientIp);
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
      const job = getJob(body.jobId);
      if (!job) {
        return NextResponse.json(
          { success: false, error: `Job "${body.jobId}" not found.` },
          { status: 404 }
        );
      }

      // If already finished, return immediately
      if (job.status === "completed" || job.status === "failed") {
        return NextResponse.json({ success: true, job });
      }

      // Execute job to completion
      const completedJob = await executeJob(body.jobId);
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

    // 5. Create background job
    const job = createImageJob({
      prompt: promptValidation.sanitizedPrompt!,
      referenceImage: body.referenceImage,
      quality,
      aspectRatio: body.aspectRatio || "1:1",
      userId: body.userId,
      workspaceId,
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
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("id");

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "Missing required job ID." },
        { status: 400 }
      );
    }

    const cancelled = cancelJob(jobId);
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

