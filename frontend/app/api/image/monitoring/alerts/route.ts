import { NextRequest, NextResponse } from "next/server";
import { ProductionMonitoringService } from "@/app/lib/image-engine/services/production-monitoring.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyActive = searchParams.get("active") === "true";

    const alerts = ProductionMonitoringService.getAlerts(onlyActive);
    return NextResponse.json({
      success: true,
      alerts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to retrieve alerts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { alertId, action, acknowledgedBy } = body;

    if (!alertId) {
      return NextResponse.json({ success: false, error: "Missing alertId" }, { status: 400 });
    }

    if (action === "acknowledge") {
      const success = ProductionMonitoringService.acknowledgeAlert(alertId, acknowledgedBy || "admin");
      return NextResponse.json({ success, message: "Alert acknowledged" });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process alert action" },
      { status: 500 }
    );
  }
}

