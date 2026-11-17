/**
 * TATTVA AI - Agent Task Human Approval Handler
 * POST /api/agent/tasks/[taskId]/approve -> Grant authorization for sensitive operations
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../../../lib/security";
import { taskExecutionController } from "../../../../../lib/agent-engine/execution-controller";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await verifyUserSession(request);
    const { taskId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || !body.stepId) {
      return NextResponse.json(
        { error: "A valid 'stepId' is required to grant approval." },
        { status: 400 }
      );
    }

    const task = taskExecutionController.getTask(taskId, session.userId);
    if (!task) {
      return NextResponse.json(
        { error: `Task "${taskId}" not found or unauthorized.` },
        { status: 404 }
      );
    }

    const approvedTask = await taskExecutionController.grantApproval(
      taskId,
      body.stepId,
      session.email || session.userId
    );

    return NextResponse.json({
      success: true,
      message: `Approval granted for step ${body.stepId}. Execution resumed.`,
      task: approvedTask,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
