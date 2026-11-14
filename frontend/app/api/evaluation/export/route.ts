/**
 * TATTVA AI - MMMLU Evaluation Export API (CSV, JSON, PDF)
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextRequest, NextResponse } from "next/server";
import { evaluationStorage, evaluationExporter } from "../../../lib/evaluation/mmmlu";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const runId = searchParams.get("runId");
    const format = (searchParams.get("format") || "csv").toLowerCase();

    if (!runId) {
      return NextResponse.json({ success: false, error: "Missing runId parameter" }, { status: 400 });
    }

    const run = await evaluationStorage.getRun(runId);
    if (!run) {
      return NextResponse.json({ success: false, error: "Evaluation run not found" }, { status: 404 });
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const filenameBase = `tattva-eval-${run.model.replace(/[^a-zA-Z0-9_\-]/g, "_")}-${timestamp}`;

    if (format === "json") {
      const jsonStr = evaluationExporter.generateJSON(run);
      return new NextResponse(jsonStr, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filenameBase}.json"`,
        },
      });
    }

    if (format === "pdf") {
      const pdfBuffer = evaluationExporter.generatePDF(run);
      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
        },
      });
    }

    // Default to CSV
    const csvContent = evaluationExporter.generateCSV(run);
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
      },
    });
  } catch (err: any) {
    console.error("[MMMLU Export Error]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
