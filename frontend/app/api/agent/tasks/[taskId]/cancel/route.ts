/**
 * TATTVA AI - Agent Task Cancellation Handler
 * POST /api/agent/tasks/[taskId]/cancel -> Terminate active execution
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
    const body = await request.json().catch(() => ({}));

    const cancelled = taskExecutionController.cancelTask(
      taskId,
      session.userId,
      body.reason || "User requested cancellation"
    );

    if (!cancelled) {
      return NextResponse.json(
        { error: `Task "${taskId}" not found or unauthorized.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Task "${taskId}" has been cancelled.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
