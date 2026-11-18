import { NextRequest, NextResponse } from "next/server";
import { ProductUXAuditEngine } from "@/app/lib/ux-audit";

export async function POST(request: NextRequest) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty or absent body
    }

    const engine = ProductUXAuditEngine.getInstance();
    const result = engine.runAudit(body);

    return NextResponse.json({
      success: true,
      message: `Audited ${result.auditedModules.length} platform modules successfully.`,
      ...result
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute UX audit" },
      { status: 500 }
    );
  }
}
