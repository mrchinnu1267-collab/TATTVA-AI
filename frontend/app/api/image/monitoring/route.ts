import { NextRequest, NextResponse } from "next/server";
import { ProductionMonitoringService } from "@/app/lib/image-engine/services/production-monitoring.service";

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role") || "admin";
    const userId = req.headers.get("x-user-id") || "admin_user";
    const workspaceId = req.headers.get("x-workspace-id") || "default";

    const data = ProductionMonitoringService.getDashboardData({
      userId,
      userRole: role,
      workspaceId,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data,
    });
  } catch (error: any) {
    const isAuth = error?.message?.includes("Unauthorized");
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to retrieve production monitoring data",
      },
      { status: isAuth ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.type === "ingest_telemetry") {
      ProductionMonitoringService.ingestGenerationTelemetrySync(body.event);
      return NextResponse.json({ success: true, message: "Telemetry ingested successfully" });
    }

    return NextResponse.json({ success: false, error: "Invalid monitoring action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process monitoring action" },
      { status: 500 }
    );
  }
}

