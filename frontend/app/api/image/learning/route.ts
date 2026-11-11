/**
 * TATTVA AI - Continuous Model Improvement & Self-Learning Intelligence API (Phase N)
 * GET /api/image/learning - Dashboard telemetry, model rankings, active alerts, and proposals.
 * POST /api/image/learning - Feedback submission, proposal lifecycle, and governance controls.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  learningDashboardService,
  feedbackCollector,
  failureIntelligence,
  adaptivePromptOptimizer,
  modelLearningEngine,
  controlledLearningPipeline,
  fineTuningGovernor,
  continuousBenchmarkingService,
} from "@/app/lib/image-engine/continuous-learning";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const view = searchParams.get("view") || "dashboard";

    if (view === "proposals") {
      const proposals = controlledLearningPipeline.getAllProposals();
      return NextResponse.json({ success: true, proposals });
    }

    if (view === "models") {
      const models = modelLearningEngine.getAllModelPerformances();
      return NextResponse.json({ success: true, models });
    }

    if (view === "alerts") {
      const alerts = continuousBenchmarkingService.getAllAlerts();
      return NextResponse.json({ success: true, alerts });
    }

    const metrics = learningDashboardService.getDashboardMetrics();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
    });
  } catch (error: any) {
    console.error("[ContinuousLearningAPI] GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load continuous learning metrics" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "submit_feedback";

    // 1. Submit Voluntary User Feedback
    if (action === "submit_feedback") {
      const { feedbackId, issueType, satisfactionRating, userComments, markedRegion, consentForTraining, userId } = body;
      if (!feedbackId || !issueType || !satisfactionRating) {
        return NextResponse.json(
          { success: false, error: "feedbackId, issueType, and satisfactionRating are required." },
          { status: 400 }
        );
      }

      const res = feedbackCollector.submitVoluntaryUserFeedback({
        feedbackId,
        issueType,
        satisfactionRating,
        userComments,
        markedRegion,
        consentForTraining: !!consentForTraining,
        userId,
      });

      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 404 });
      }

      // If feedback had an issue, incorporate into model telemetry and failure intelligence
      if (res.record) {
        failureIntelligence.analyzeFeedbackRecord(res.record);
      }

      return NextResponse.json({ success: true, message: "User feedback recorded successfully.", record: res.record });
    }

    // 2. Adaptive Prompt Optimization Request
    if (action === "optimize_prompt") {
      const { rawPrompt, targetModelId, requiredEntities } = body;
      if (!rawPrompt) {
        return NextResponse.json({ success: false, error: "rawPrompt is required" }, { status: 400 });
      }

      const proposal = adaptivePromptOptimizer.optimizePrompt({
        rawPrompt,
        targetModelId: targetModelId || "flux-schnell",
        requiredEntities,
      });

      return NextResponse.json({ success: true, proposal });
    }

    // 3. Create Controlled Improvement Proposal
    if (action === "create_proposal") {
      const { title, description, affectedSubsystem, proposedChanges } = body;
      if (!title || !description || !affectedSubsystem) {
        return NextResponse.json(
          { success: false, error: "title, description, and affectedSubsystem are required" },
          { status: 400 }
        );
      }

      const proposal = controlledLearningPipeline.createProposal({
        title,
        description,
        affectedSubsystem,
        proposedChanges: proposedChanges || {},
      });

      return NextResponse.json({ success: true, proposal });
    }

    // 4. Run Offline Benchmark on Proposal
    if (action === "benchmark_proposal") {
      const { proposalId, sampleSize } = body;
      if (!proposalId) {
        return NextResponse.json({ success: false, error: "proposalId is required" }, { status: 400 });
      }

      const res = controlledLearningPipeline.runOfflineBenchmark(proposalId, sampleSize || 30);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, proposal: res.proposal });
    }

    // 5. Run Regression Testing on Proposal
    if (action === "regression_test_proposal") {
      const { proposalId } = body;
      if (!proposalId) {
        return NextResponse.json({ success: false, error: "proposalId is required" }, { status: 400 });
      }

      const res = controlledLearningPipeline.runRegressionAudit(proposalId);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, isSafe: res.isSafe, proposal: res.proposal });
    }

    // 6. Approve Proposal
    if (action === "approve_proposal") {
      const { proposalId, adminUser } = body;
      if (!proposalId) {
        return NextResponse.json({ success: false, error: "proposalId is required" }, { status: 400 });
      }

      const res = controlledLearningPipeline.approveProposal(proposalId, adminUser || "tattva-admin");
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, proposal: res.proposal });
    }

    // 7. Deploy Proposal
    if (action === "deploy_proposal") {
      const { proposalId } = body;
      if (!proposalId) {
        return NextResponse.json({ success: false, error: "proposalId is required" }, { status: 400 });
      }

      const res = controlledLearningPipeline.deployProposal(proposalId);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, proposal: res.proposal });
    }

    // 8. Rollback Proposal
    if (action === "rollback_proposal") {
      const { proposalId } = body;
      if (!proposalId) {
        return NextResponse.json({ success: false, error: "proposalId is required" }, { status: 400 });
      }

      const res = controlledLearningPipeline.rollbackProposal(proposalId);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, proposal: res.proposal });
    }

    // 9. Dataset Validation for Fine-Tuning
    if (action === "validate_dataset") {
      const { datasetId, images, userConsentVerified, workspaceAuthorized } = body;
      if (!datasetId || !images) {
        return NextResponse.json({ success: false, error: "datasetId and images array are required" }, { status: 400 });
      }

      const validation = fineTuningGovernor.validateDataset({
        datasetId,
        images,
        userConsentVerified: !!userConsentVerified,
        workspaceAuthorized: !!workspaceAuthorized,
      });

      return NextResponse.json({ success: true, validation });
    }

    // 10. Training Job Authorization Check
    if (action === "authorize_training") {
      const { adapterName, baseModel, datasetValidation, isPaidTrainingAuthorized, estimatedCostUSD, userAuthorizationToken } = body;
      if (!adapterName || !baseModel || !datasetValidation) {
        return NextResponse.json({ success: false, error: "adapterName, baseModel, and datasetValidation are required" }, { status: 400 });
      }

      const auth = fineTuningGovernor.evaluateTrainingJobAuthorization({
        adapterName,
        baseModel,
        datasetValidation,
        isPaidTrainingAuthorized: !!isPaidTrainingAuthorized,
        estimatedCostUSD: estimatedCostUSD || 0,
        userAuthorizationToken,
      });

      return NextResponse.json({ success: auth.authorized, auth });
    }

    return NextResponse.json(
      { success: false, error: `Unrecognized action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[ContinuousLearningAPI] POST Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute continuous learning operation" },
      { status: 500 }
    );
  }
}

