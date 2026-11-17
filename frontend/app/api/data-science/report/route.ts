/**
 * TATTVA AI - Data Science Report Generator API Route
 * POST /api/data-science/report -> Generates Markdown analytics summary report
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { DataSciencePlatformEngine, Dataset } from "../../../lib/data-science";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "default";

    let dataset: Dataset | null = null;
    if (typeof body.datasetId === "string") {
      dataset = DataSciencePlatformEngine.getDataset(session.userId, workspaceId, body.datasetId);
    }

    if (!dataset && typeof body.csvContent === "string" && body.csvContent.trim()) {
      dataset = DataSciencePlatformEngine.ingestCSV(
        session.userId,
        workspaceId,
        body.name || "Report Data",
        body.csvContent
      );
    } else if (!dataset && Array.isArray(body.rows) && body.rows.length > 0) {
      dataset = DataSciencePlatformEngine.ingestJSON(
        session.userId,
        workspaceId,
        body.name || "Report Data",
        body.rows
      );
    }

    if (!dataset) {
      const all = DataSciencePlatformEngine.listDatasets(session.userId, workspaceId);
      dataset = all[0] || null;
    }

    if (!dataset) {
      return NextResponse.json(
        { error: "No dataset available to generate analytics report." },
        { status: 400 }
      );
    }

    const bundle = DataSciencePlatformEngine.generateAnalyticsReport(dataset);

    return NextResponse.json({
      success: true,
      data: bundle,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to generate analytics report" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
