/**
 * TATTVA AI - Phase V: Final Image Engine Certification API Route
 * GET: Retrieves the full official engine certification report.
 * POST: Triggers a fresh certification evaluation across all subsystems.
 */

import { NextRequest, NextResponse } from "next/server";
import { FinalCertificationService } from "@/app/lib/image-engine/services/final-certification.service";

export async function GET(request: NextRequest) {
  try {
    const report = FinalCertificationService.getCertificationReport();
    return NextResponse.json({
      success: true,
      report,
      certifiedDecision: report.decision,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Certification API] GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve engine certification report" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const freshReport = FinalCertificationService.getCertificationReport();
    return NextResponse.json({
      success: true,
      message: "Engine certification evaluation executed successfully.",
      report: freshReport,
    });
  } catch (error: any) {
    console.error("[Certification API] POST Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute engine certification" },
      { status: 500 }
    );
  }
}

