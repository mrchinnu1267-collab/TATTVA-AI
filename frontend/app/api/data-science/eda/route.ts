/**
 * TATTVA AI - Automated EDA API Route
 * POST /api/data-science/eda -> Generate full exploratory data analysis and cleaning recipes
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
        body.name || "Uploaded Data",
        body.csvContent
      );
    } else if (!dataset && Array.isArray(body.rows) && body.rows.length > 0) {
      dataset = DataSciencePlatformEngine.ingestJSON(
        session.userId,
        workspaceId,
        body.name || "Uploaded Data",
        body.rows
      );
    }

    if (!dataset) {
      // Fallback to active sample dataset for workspace
      const all = DataSciencePlatformEngine.listDatasets(session.userId, workspaceId);
      dataset = all[0] || null;
    }

    if (!dataset) {
      return NextResponse.json(
        { error: "No dataset available for EDA. Please upload data or provide datasetId." },
        { status: 400 }
      );
    }

    const eda = DataSciencePlatformEngine.runEDA(dataset);
    const recommendations = DataSciencePlatformEngine.getCleaningRecommendations(eda);

    return NextResponse.json({
      success: true,
      data: {
        datasetId: dataset.id,
        datasetName: dataset.name,
        eda,
        recommendations,
      },
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to execute EDA" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
