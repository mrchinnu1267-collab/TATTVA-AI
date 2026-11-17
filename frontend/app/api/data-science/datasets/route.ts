/**
 * TATTVA AI - Data Science Datasets API Route
 * GET /api/data-science/datasets -> List datasets for workspace
 * POST /api/data-science/datasets -> Upload CSV or JSON dataset
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { DataSciencePlatformEngine } from "../../../lib/data-science";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") || "default";

    const datasets = DataSciencePlatformEngine.listDatasets(session.userId, workspaceId);

    return NextResponse.json({
      success: true,
      data: datasets.map((d) => ({
        id: d.id,
        name: d.name,
        rowCount: d.rowCount,
        columnCount: d.columnCount,
        columns: d.columns,
        createdAt: d.createdAt,
      })),
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to list datasets" },
      { status: isAuth ? 401 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const name = typeof body.name === "string" ? body.name.trim() : "Custom Dataset";
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "default";

    let dataset;
    if (typeof body.csvContent === "string" && body.csvContent.trim()) {
      dataset = DataSciencePlatformEngine.ingestCSV(session.userId, workspaceId, name, body.csvContent);
    } else if (Array.isArray(body.rows) && body.rows.length > 0) {
      dataset = DataSciencePlatformEngine.ingestJSON(session.userId, workspaceId, name, body.rows);
    } else {
      return NextResponse.json(
        { error: "Provide either 'csvContent' as a string or 'rows' as a JSON array of records." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: dataset.id,
        name: dataset.name,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        columns: dataset.columns,
        createdAt: dataset.createdAt,
      },
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to ingest dataset" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
