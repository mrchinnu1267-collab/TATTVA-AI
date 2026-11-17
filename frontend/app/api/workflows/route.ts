/**
 * TATTVA AI - Workflow Automation API Route Handler
 * POST /api/workflows -> Create or trigger workflow execution
 * GET  /api/workflows -> List user workflows or get execution run details
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../lib/security";
import { WorkflowEngine } from "../../lib/ecosystem/workflow-engine";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));
    const action = body.action || "create";

    if (action === "create") {
      const def = WorkflowEngine.saveWorkflow({
        id: body.id || "",
        userId: session.userId,
        workspaceId: body.workspaceId || "default",
        name: body.name || "Automated Workflow",
        description: body.description || "",
        trigger: body.trigger || { type: "manual" },
        steps: Array.isArray(body.steps) ? body.steps : [],
        createdAt: "",
        updatedAt: "",
      });
      return NextResponse.json({ success: true, workflow: def });
    }

    if (action === "execute") {
      const workflowId = String(body.workflowId || "");
      const inputs = body.inputs || {};
      const run = await WorkflowEngine.executeWorkflow(session.userId, workflowId, inputs);
      return NextResponse.json({ success: true, run });
    }

    if (action === "cancel") {
      const runId = String(body.runId || "");
      const cancelled = WorkflowEngine.cancelRun(runId);
      return NextResponse.json({ success: cancelled, runId });
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    if (runId) {
      const run = WorkflowEngine.getRun(runId);
      if (!run || run.userId !== session.userId) {
        return NextResponse.json({ error: "Execution run not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, run });
    }

    const workflows = WorkflowEngine.listWorkflows(session.userId);
    return NextResponse.json({
      success: true,
      total: workflows.length,
      workflows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
