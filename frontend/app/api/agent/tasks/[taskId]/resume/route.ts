/**
 * TATTVA AI - Agent Task Resume Handler
 * POST /api/agent/tasks/[taskId]/resume -> Resume interrupted or paused task from checkpoint
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

    const task = taskExecutionController.getTask(taskId, session.userId);
    if (!task) {
      return NextResponse.json(
        { error: `Task "${taskId}" not found or unauthorized.` },
        { status: 404 }
      );
    }

    const resumedTask = await taskExecutionController.resumeTask(taskId, session.userId);

    return NextResponse.json({
      success: true,
      message: `Task "${taskId}" resumed.`,
      task: resumedTask,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
