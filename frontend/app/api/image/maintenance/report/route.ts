/**
 * TATTVA AI - Phase W: Monthly Quality Report API Route
 * Exposes official monthly quality reports with measured vs estimated metrics.
 */

import { NextRequest, NextResponse } from "next/server";
import { EngineMaintenanceService } from "@/app/lib/image-engine/services/engine-maintenance.service";

export async function GET(request: NextRequest) {
  try {
    const report = EngineMaintenanceService.getMonthlyQualityReport();
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error("[Maintenance Report API] GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate monthly quality report" },
      { status: 500 }
    );
  }
}

