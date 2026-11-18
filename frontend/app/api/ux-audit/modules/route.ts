import { NextRequest, NextResponse } from "next/server";
import { ProductUXAuditEngine } from "@/app/lib/ux-audit";

export async function GET(request: NextRequest) {
  try {
    const engine = ProductUXAuditEngine.getInstance();
    const summary = engine.getAuditSummary();
    const modules = engine.getModuleAudits();

    return NextResponse.json({
      success: true,
      summary,
      modules
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch UX audit data" },
      { status: 500 }
    );
  }
}
