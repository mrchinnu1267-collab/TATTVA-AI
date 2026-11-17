/**
 * TATTVA AI - Machine Learning Recommendation API Route
 * POST /api/data-science/ml-recommend -> Select optimal ML algorithm and generate pipeline code
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { DataSciencePlatformEngine, Dataset } from "../../../lib/data-science";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));
    const targetColumn = typeof body.targetColumn === "string" ? body.targetColumn.trim() : undefined;
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "default";

    let dataset: Dataset | null = null;
    if (typeof body.datasetId === "string") {
      dataset = DataSciencePlatformEngine.getDataset(session.userId, workspaceId, body.datasetId);
    }

    if (!dataset && typeof body.csvContent === "string" && body.csvContent.trim()) {
      dataset = DataSciencePlatformEngine.ingestCSV(
        session.userId,
        workspaceId,
        body.name || "ML Data",
        body.csvContent
      );
    } else if (!dataset && Array.isArray(body.rows) && body.rows.length > 0) {
      dataset = DataSciencePlatformEngine.ingestJSON(
        session.userId,
        workspaceId,
        body.name || "ML Data",
        body.rows
      );
    }

    if (!dataset) {
      const all = DataSciencePlatformEngine.listDatasets(session.userId, workspaceId);
      dataset = all[0] || null;
    }

    if (!dataset) {
      return NextResponse.json(
        { error: "No dataset available for ML recommendation." },
        { status: 400 }
      );
    }

    const recommendation = DataSciencePlatformEngine.recommendML(dataset, targetColumn);

    return NextResponse.json({
      success: true,
      data: recommendation,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to recommend ML pipeline" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
