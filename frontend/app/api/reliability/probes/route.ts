/**
 * TATTVA AI - Synthetic Health Probes API Route (Phase 48)
 * GET /api/reliability/probes -> Lists recent synthetic health probes
 * POST /api/reliability/probes -> Executes an on-demand synthetic probe run
 */

import { NextResponse } from "next/server";
import { ProductionReliabilityEngine } from "../../../lib/reliability";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 30;

    const engine = ProductionReliabilityEngine.getInstance();
    const probes = engine.getRecentProbes(limit);

    return NextResponse.json({
      success: true,
      count: probes.length,
      probes,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const engine = ProductionReliabilityEngine.getInstance();
    const results = await engine.runHealthProbes();

    return NextResponse.json({
      success: true,
      count: results.length,
      probes: results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
