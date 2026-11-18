/**
 * TATTVA AI - Autonomous Task Execution Planner API Route
 * POST /api/agent/plan -> Decomposes objective into DAG with Kahn's topological execution tiers
 * GET  /api/agent/plan?planId=... -> Retrieves serialized execution checkpoint
 * Enforces zero-trust session validation and sliding-window rate limiting.
 */

import { NextResponse } from "next/server";
import { dynamicExecutionPlanner } from "../../../lib/agent-engine/execution-planner";
import { verifyUserSession, checkRateLimit, logSecurityEvent } from "../../../lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rateCheck = checkRateLimit(`agent_plan_${session.userId}_${clientIp}`, 60, 60000);
    if (!rateCheck.allowed) {
      logSecurityEvent("RATE_LIMIT_EXCEEDED", {
        userId: session.userId,
        ip: clientIp,
        endpoint: "/api/agent/plan",
      });
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.objective || typeof body.objective !== "string" || !body.objective.trim()) {
      return NextResponse.json(
        { error: "A non-empty 'objective' string is required to generate an execution plan." },
        { status: 400 }
      );
    }

    const objective = body.objective.trim();
    const constraints = Array.isArray(body.constraints) ? body.constraints : [];

    // Generate DAG with Kahn's algorithm execution tiers & risk assessment
    const dag = dynamicExecutionPlanner.planGoal(objective, constraints);

    // Save initial checkpoint
    const checkpoint = dynamicExecutionPlanner.saveCheckpoint(dag);

    return NextResponse.json({
      success: true,
      plan: dag,
      checkpointId: checkpoint.checkpointId,
      executionTiersCount: dag.executionTiers.length,
      requiresApproval: dag.requiresApproval,
      approvalReasons: dag.approvalReasons,
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Internal server error";
    const status = errMessage.includes("Authentication required") ? 401 : 500;
    return NextResponse.json({ error: errMessage }, { status });
  }
}

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("planId");

    if (!planId) {
      return NextResponse.json(
        { error: "Query parameter 'planId' is required." },
        { status: 400 }
      );
    }

    const checkpoint = dynamicExecutionPlanner.getLatestCheckpoint(planId);
    if (!checkpoint) {
      return NextResponse.json(
        { error: `No active plan checkpoint found for plan ID '${planId}'.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      checkpoint,
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Internal server error";
    const status = errMessage.includes("Authentication required") ? 401 : 500;
    return NextResponse.json({ error: errMessage }, { status });
  }
}
