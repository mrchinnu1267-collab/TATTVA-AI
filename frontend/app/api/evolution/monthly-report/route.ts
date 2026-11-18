/**
 * TATTVA AI - Monthly Engineering Report API Route
 * GET /api/evolution/monthly-report -> Compiles and returns comprehensive platform report
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { MonthlyReportGenerator } from "../../../lib/platform-evolution";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "November 2026";
    const format = searchParams.get("format");

    const report = MonthlyReportGenerator.generateReport(period);
    const markdown = MonthlyReportGenerator.toMarkdown(report);

    if (format === "markdown" || format === "text") {
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        report,
        markdown,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
