/**
 * TATTVA AI - Incidents & Automated Mitigation API Route (Phase 48)
 * GET /api/reliability/incidents -> Lists incident history
 * POST /api/reliability/incidents -> Declares incident or executes mitigation playbook
 */

import { NextResponse } from "next/server";
import { ProductionReliabilityEngine } from "../../../lib/reliability";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") || undefined) as any;

    const engine = ProductionReliabilityEngine.getInstance();
    const incidents = engine.listIncidents(status);

    return NextResponse.json({
      success: true,
      count: incidents.length,
      incidents,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action = "declare", incidentId, mitigationAction, title, service, severity, initialMessage } = body;

    const engine = ProductionReliabilityEngine.getInstance();

    if (action === "mitigate") {
      if (!incidentId || !mitigationAction) {
        return NextResponse.json(
          { success: false, error: "incidentId and mitigationAction are required for mitigation" },
          { status: 400 }
        );
      }

      const result = await engine.mitigateIncident({
        incidentId,
        mitigationAction,
        actor: "Auto-Mitigation-Daemon",
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.details }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        incident: result.incident,
        details: result.details,
      });
    }

    // Default: declare incident
    if (!title || !service) {
      return NextResponse.json(
        { success: false, error: "title and service are required to declare an incident" },
        { status: 400 }
      );
    }

    const incident = engine.declareIncident({
      title,
      service,
      severity,
      initialMessage,
    });

    return NextResponse.json({
      success: true,
      incident,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
