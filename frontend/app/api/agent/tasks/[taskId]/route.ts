/**
 * TATTVA AI - Agent Task Detail Route Handler
 * GET /api/agent/tasks/[taskId] -> Detailed task state, steps, memory, and artifacts
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../../lib/security";
import { taskExecutionController } from "../../../../lib/agent-engine/execution-controller";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await verifyUserSession(request);
    const { taskId } = await params;

    const task = taskExecutionController.getTask(taskId, session.userId);
    if (!task) {
      return NextResponse.json(
        { error: `Task "${taskId}" not found or unauthorized.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
