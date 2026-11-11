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

export const dynamic = "force-dynamic";

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
      const job = getJob(jobId);
      if (!job) {
        return NextResponse.json(
          { success: false, error: `Job with ID "${jobId}" not found.` },
          { status: 404 }
        );
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

