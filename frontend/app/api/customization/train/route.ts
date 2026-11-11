import { NextResponse } from "next/server";
import {
  submitTrainingJob,
  getTrainingJobStatus,
  cancelTrainingJob,
} from "../../../lib/image-engine/customization/training-pipeline";
import { validateAndPrepareDataset } from "../../../lib/image-engine/customization/dataset-manager";
import { verifyUserSession } from "../../../lib/security";
import { DatasetManifest } from "../../../lib/image-engine/customization/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/customization/train?jobId=xxx
 * Retrieves the live status, progress, loss, and logs of a training job.
 */
export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ success: false, error: "jobId parameter is required." }, { status: 400 });
    }

    const job = getTrainingJobStatus(jobId, session.userId);
    if (!job) {
      return NextResponse.json({ success: false, error: `Training job '${jobId}' not found.` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/customization/train
 * Validates the training dataset and hyperparameters, then submits the training job.
 */
export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ success: false, error: "Request body is required." }, { status: 400 });
    }

    let datasetManifest: DatasetManifest;

    // Check if client passed an already prepared dataset manifest or raw images
    if (body.dataset && body.dataset.images) {
      // Validate and sanitize raw dataset
      const prep = await validateAndPrepareDataset({
        name: body.adapterName || body.dataset.name || "Custom LoRA Dataset",
        category: body.dataset.category || "artistic_style",
        triggerWord: body.dataset.triggerWord,
        hasUserConsent: Boolean(body.dataset.hasUserConsent),
        license: body.dataset.license,
        images: body.dataset.images,
        userId: session.userId,
      });

      if (!prep.isValid || !prep.manifest) {
        return NextResponse.json(
          {
            success: false,
            error: "Dataset validation failed.",
            details: prep.errors,
            warnings: prep.warnings,
          },
          { status: 400 }
        );
      }
      datasetManifest = prep.manifest;
    } else if (body.manifest) {
      datasetManifest = body.manifest;
    } else {
      return NextResponse.json(
        { success: false, error: "Dataset manifest or image list is required." },
        { status: 400 }
      );
    }

    const job = await submitTrainingJob({
      adapterName: body.adapterName || datasetManifest.name,
      dataset: datasetManifest,
      baseModel: body.baseModel || "stabilityai/stable-diffusion-xl-base-1.0",
      config: body.config || {},
      userId: session.userId,
      workspaceId: session.workspaceId || "default_workspace",
      confirmCloudGpuCharge: Boolean(body.confirmCloudGpuCharge),
    });

    return NextResponse.json({
      success: true,
      job,
      message: `Training job '${job.id}' queued successfully.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

/**
 * DELETE /api/customization/train?jobId=xxx
 * Cancels a running or queued training job.
 */
export async function DELETE(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ success: false, error: "jobId parameter is required." }, { status: 400 });
    }

    const cancelled = cancelTrainingJob(jobId, session.userId);
    if (!cancelled) {
      return NextResponse.json(
        { success: false, error: `Job '${jobId}' could not be cancelled (already finished or not found).` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Training job '${jobId}' has been cancelled.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

