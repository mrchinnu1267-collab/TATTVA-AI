/**
 * TATTVA AI - Evolution & Performance Telemetry API Route
 * GET /api/evolution/metrics -> Returns real-time P50/P95 latencies, uptime, and degradation alerts
 * POST /api/evolution/metrics -> Ingests request telemetry
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { platformPerformanceMonitor } from "../../../lib/platform-evolution";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await verifyUserSession(request);
    const snapshot = platformPerformanceMonitor.getSnapshot();
    return NextResponse.json({ success: true, data: snapshot });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const endpoint = body.endpoint || "/api/custom";
    const latencyMs = Number(body.latencyMs) || 100;
    const isError = Boolean(body.isError);
    const errorMessage = body.errorMessage;

    platformPerformanceMonitor.recordRequest(endpoint, latencyMs, isError, errorMessage);
    const snapshot = platformPerformanceMonitor.getSnapshot();

    return NextResponse.json({ success: true, data: snapshot });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
