import { NextRequest, NextResponse } from "next/server";
import { PlatformCertificationEngine } from "@/app/lib/platform-certification";

export async function GET(request: NextRequest) {
  try {
    const engine = PlatformCertificationEngine.getInstance();
    const cert = engine.getCertificationStatus();

    return NextResponse.json({
      success: true,
      certification: cert
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch platform certification" },
      { status: 500 }
    );
  }
}
