/**
 * TATTVA AI - Natural Language Tabular Query API Route
 * POST /api/data-science/query -> Conversational query execution over dataset
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { DataSciencePlatformEngine, Dataset } from "../../../lib/data-science";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId.trim() : "default";

    if (!query) {
      return NextResponse.json(
        { error: "Field 'query' is required." },
        { status: 400 }
      );
    }

    let dataset: Dataset | null = null;
    if (typeof body.datasetId === "string") {
      dataset = DataSciencePlatformEngine.getDataset(session.userId, workspaceId, body.datasetId);
    }

    if (!dataset && typeof body.csvContent === "string" && body.csvContent.trim()) {
      dataset = DataSciencePlatformEngine.ingestCSV(
        session.userId,
        workspaceId,
        body.name || "Query Data",
        body.csvContent
      );
    } else if (!dataset && Array.isArray(body.rows) && body.rows.length > 0) {
      dataset = DataSciencePlatformEngine.ingestJSON(
        session.userId,
        workspaceId,
        body.name || "Query Data",
        body.rows
      );
    }

    if (!dataset) {
      const all = DataSciencePlatformEngine.listDatasets(session.userId, workspaceId);
      dataset = all[0] || null;
    }

    if (!dataset) {
      return NextResponse.json(
        { error: "No dataset found to execute query on." },
        { status: 400 }
      );
    }

    const result = DataSciencePlatformEngine.queryDataset(dataset, query);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    const isAuth = err.message && (err.message.includes("Unauthorized") || err.message.includes("Invalid session"));
    return NextResponse.json(
      { error: err.message || "Failed to execute natural language query" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
