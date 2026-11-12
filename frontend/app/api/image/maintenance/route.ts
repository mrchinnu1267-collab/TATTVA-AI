/**
 * TATTVA AI - Phase W: Engine Maintenance API Route
 * Telemetry query, Model health monitoring, Regression checks & Safe improvements.
 */

import { NextRequest, NextResponse } from "next/server";
import { EngineMaintenanceService } from "@/app/lib/image-engine/services/engine-maintenance.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "health") {
      const health = EngineMaintenanceService.getModelHealth();
      return NextResponse.json({ success: true, health });
    }

    if (action === "reliability") {
      const reliability = EngineMaintenanceService.getReliabilityStatus();
      return NextResponse.json({ success: true, reliability });
    }

    if (action === "proposals") {
      const proposals = EngineMaintenanceService.getAllProposals();
      return NextResponse.json({ success: true, proposals });
    }

    // Default: query telemetry with filters
    const provider = searchParams.get("provider") as any || "all";
    const model = searchParams.get("model") || "all";
    const feature = searchParams.get("feature") as any || "all";
    const errorCategory = searchParams.get("errorCategory") as any || "all";

    const telemetry = EngineMaintenanceService.queryTelemetry({
      provider,
      model,
      feature,
      errorCategory,
    });

    const health = EngineMaintenanceService.getModelHealth();
    const reliability = EngineMaintenanceService.getReliabilityStatus();

    return NextResponse.json({
      success: true,
      telemetry,
      modelHealth: health,
      reliability,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Maintenance API] GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve maintenance telemetry" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "run_regression") {
      const regressionResult = EngineMaintenanceService.runRegressionCheck(body.triggeredBy || "compiler_change");
      return NextResponse.json({ success: true, regressionResult });
    }

    if (action === "submit_proposal") {
      const { category, component, evidence, reproduction, fixDescription } = body;
      const proposal = EngineMaintenanceService.submitImprovementProposal(
        category,
        component,
        evidence,
        reproduction || [],
        fixDescription
      );
      return NextResponse.json({ success: true, proposal });
    }

    if (action === "approve_proposal") {
      const { proposalId, approverName } = body;
      const approved = EngineMaintenanceService.approveImprovementProposal(proposalId, approverName || "Lead Systems Architect");
      return NextResponse.json({ success: approved });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("[Maintenance API] POST Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process maintenance action" },
      { status: 500 }
    );
  }
}

