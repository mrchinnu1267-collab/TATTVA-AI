/**
 * TATTVA AI - Automated Image Accuracy Regression Testing API (Phase O)
 * GET /api/image/regression - Telemetry, approved baseline, gate status, and historical reports.
 * POST /api/image/regression - Execute audits, evaluate deployment gates, approve baselines, and trigger rollback.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  regressionRunner,
  baselineManager,
  rollbackGuard,
  cicdGatingService,
} from "@/app/lib/image-engine/regression-testing";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const view = searchParams.get("view") || "dashboard";

    if (view === "baselines") {
      const baselines = baselineManager.getAllBaselines();
      return NextResponse.json({ success: true, baselines });
    }

    if (view === "incidents") {
      const incidents = rollbackGuard.getIncidentLedger();
      return NextResponse.json({ success: true, incidents });
    }

    if (view === "snapshots") {
      const snapshots = rollbackGuard.getAllSnapshots();
      return NextResponse.json({ success: true, snapshots });
    }

    const metrics = regressionRunner.getDashboardMetrics();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
    });
  } catch (error: any) {
    console.error("[RegressionTestingAPI] GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load regression telemetry" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "run_audit";

    // 1. Run Regression Audit
    if (action === "run_audit") {
      const { modelIdentifier, tier, testMode, autoRollbackOnCritical, candidateScoreOffsets } = body;

      const report = await regressionRunner.runRegressionAudit({
        modelIdentifier: modelIdentifier || "flux-schnell",
        tier: tier || "smoke_test",
        testMode: testMode || "verified_simulation",
        autoRollbackOnCritical: autoRollbackOnCritical ?? true,
        candidateScoreOffsets: candidateScoreOffsets || {},
      });

      return NextResponse.json({ success: true, report });
    }

    // 2. Evaluate CI/CD Deployment Gate
    if (action === "evaluate_gate") {
      const { reportId, totalSpendUSD, customSpendingCapUSD } = body;
      let targetReport = reportId ? regressionRunner.getReport(reportId) : regressionRunner.getDashboardMetrics().latestReport;

      if (!targetReport) {
        targetReport = await regressionRunner.runRegressionAudit({ tier: "smoke_test" });
      }

      const gateResult = cicdGatingService.evaluateDeploymentGate({
        report: targetReport,
        totalSpendUSD: totalSpendUSD || 0.002,
        customSpendingCapUSD,
      });

      return NextResponse.json({ success: true, gateResult });
    }

    // 3. Approve Candidate Baseline
    if (action === "approve_baseline") {
      const { baselineId, adminSignature, approvalToken } = body;
      if (!baselineId || !adminSignature) {
        return NextResponse.json(
          { success: false, error: "baselineId and adminSignature are required" },
          { status: 400 }
        );
      }

      const res = baselineManager.approveCandidateBaseline({
        baselineId,
        adminSignature,
        approvalToken: approvalToken || "auth-admin-sig-verified",
      });

      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, baseline: res.baseline });
    }

    // 4. Trigger Emergency Rollback
    if (action === "trigger_rollback") {
      const { reportId, reason } = body;
      let latestReport = reportId ? regressionRunner.getReport(reportId) : regressionRunner.getDashboardMetrics().latestReport;

      if (!latestReport) {
        latestReport = await regressionRunner.runRegressionAudit({ tier: "smoke_test" });
      }

      const incident = rollbackGuard.executeEmergencyRollback({
        report: latestReport,
        administratorEmails: ["lead-architect@tattva.internal"],
      });

      return NextResponse.json({ success: true, message: "Emergency rollback executed successfully.", incident });
    }

    return NextResponse.json(
      { success: false, error: `Unrecognized action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[RegressionTestingAPI] POST Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute regression testing operation" },
      { status: 500 }
    );
  }
}

