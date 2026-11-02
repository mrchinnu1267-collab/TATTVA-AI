import { NextResponse } from "next/server";
import { experienceEngine } from "../../lib/ai-orchestrator/experience-engine";
import { verifyUserSession } from "../../lib/security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    if (format === "jsonl") {
      const jsonlData = experienceEngine.exportDatasetJSONL();
      return new Response(jsonlData, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Content-Disposition": 'attachment; filename="tattva_verified_experiences.jsonl"',
        },
      });
    }

    const stats = experienceEngine.getSummaryStats();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

