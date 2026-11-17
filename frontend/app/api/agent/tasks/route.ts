/**
 * TATTVA AI - Agent Tasks API Route Handler
 * POST /api/agent/tasks -> Create & execute autonomous task
 * GET  /api/agent/tasks -> List user tasks with state and workspace filtering
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { taskExecutionController } from "../../../lib/agent-engine/execution-controller";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") || undefined;
    const stateFilter = searchParams.get("state") || undefined;

    let tasks = taskExecutionController.listTasks(session.userId, workspaceId);
    if (stateFilter) {
      tasks = tasks.filter((t) => t.state === stateFilter);
    }

    return NextResponse.json({
      success: true,
      total: tasks.length,
      tasks: tasks.map((t) => ({
        id: t.id,
        objective: t.objective,
        state: t.state,
        currentStepIndex: t.currentStepIndex,
        totalSteps: t.steps.length,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        completedAt: t.completedAt,
        artifactsCount: t.artifacts.length,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => null);

    if (!body || !body.objective || typeof body.objective !== "string") {
      return NextResponse.json(
        { error: "A valid 'objective' string is required to launch an autonomous task." },
        { status: 400 }
      );
    }

    const workspaceId = body.workspaceId || "default_workspace";
    const constraints = Array.isArray(body.constraints) ? body.constraints : [];
    const timeoutMs = typeof body.timeoutMs === "number" ? body.timeoutMs : 120000;

    const task = taskExecutionController.createTask({
      userId: session.userId,
      workspaceId,
      objective: body.objective.trim(),
      constraints,
      timeoutMs,
    });

    // If async is requested, trigger execution in background and return task immediately
    if (body.async === true) {
      taskExecutionController.executeTask(task.id, session.userId).catch((err) => {
        console.error(`[AgentTask Error] Task ${task.id} execution failed:`, err);
      });

      return NextResponse.json(
        {
          success: true,
          status: "queued",
          task,
        },
        { status: 202 }
      );
    }

    // Default: execute synchronously and return completed state
    const executedTask = await taskExecutionController.executeTask(task.id, session.userId);

    return NextResponse.json({
      success: true,
      task: executedTask,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
