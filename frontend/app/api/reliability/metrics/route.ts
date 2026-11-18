/**
 * TATTVA AI - Reliability Metrics API Route (Phase 48)
 * GET /api/reliability/metrics -> Returns SLA, SLO, uptime, and latency heatmap
 */

import { NextResponse } from "next/server";
import { ProductionReliabilityEngine } from "../../../lib/reliability";

export const runtime = "nodejs";

export async function GET() {
  try {
    const engine = ProductionReliabilityEngine.getInstance();
    const metrics = engine.getMetrics();
    const heatmap = engine.getLatencyHeatmap();

    return NextResponse.json({
      success: true,
      metrics,
      heatmap,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
