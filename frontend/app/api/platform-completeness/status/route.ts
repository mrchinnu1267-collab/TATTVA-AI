/**
 * TATTVA AI - Platform Completeness Public Status & SLA Telemetry API Route
 * GET /api/platform-completeness/status -> Public summary of the 15 completeness dimensions and system health
 */

import { NextResponse } from "next/server";
import { platformCompletenessAuditor } from "../../../lib/platform-completeness";

export const runtime = "nodejs";

export async function GET() {
  try {
    const report = platformCompletenessAuditor.runFullCompletenessAudit("https://tattva-ai-phi.vercel.app");

    // Provide a streamlined public summary without internal implementation details
    const summary = {
      overallStatus: report.overallStatus,
      certificationScore: report.certificationScore,
      totalDimensions: report.totalDimensions,
      verifiedDimensions: report.verifiedDimensions,
      compliancePassRate: `${Math.round((report.verifiedDimensions / report.totalDimensions) * 100)}%`,
      dimensions: Object.values(report.findings).map((f) => ({
        dimensionNumber: f.dimensionNumber,
        title: f.title,
        status: f.status,
        score: f.score,
      })),
      lastAuditedAt: report.executedAt,
      nextScheduledAudit: report.nextScheduledAudit,
    };

    return NextResponse.json({
      success: true,
      system: "TATTVA AI General Intelligence Platform",
      status: summary,
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
