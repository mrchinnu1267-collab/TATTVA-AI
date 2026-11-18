/**
 * TATTVA AI - Automated Bug Diagnostics API Route
 * GET /api/evolution/diagnostics -> Returns recent diagnostic bug reports
 * POST /api/evolution/diagnostics -> Captures a new bug diagnostic report
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { automatedBugDetector, BugDiagnosticReport } from "../../../lib/platform-evolution";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity") as BugDiagnosticReport["severity"] | null;

    const reports = automatedBugDetector.getReports(severity || undefined);
    return NextResponse.json({ success: true, count: reports.length, data: reports });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    if (!body.errorMessage || !body.subsystem) {
      return NextResponse.json(
        { error: "Provide 'errorMessage' and 'subsystem'." },
        { status: 400 }
      );
    }

    const report = automatedBugDetector.captureError({
      severity: body.severity || "medium",
      subsystem: body.subsystem,
      routeOrFunction: body.routeOrFunction || "unknown",
      errorMessage: body.errorMessage,
      stackTraceSample: body.stackTraceSample,
      reproductionSteps: Array.isArray(body.reproductionSteps) ? body.reproductionSteps : ["1. Unspecified reproduction step."],
      suggestedAction: body.suggestedAction || "Investigate logs and apply regression test.",
      isSafeToAutoFix: Boolean(body.isSafeToAutoFix),
    });

    return NextResponse.json({ success: true, data: report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
