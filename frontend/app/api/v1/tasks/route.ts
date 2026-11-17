/**
 * TATTVA AI - Developer API v1: Autonomous Agent Tasks Endpoint
 * POST /api/v1/tasks
 * Scope: tasks:write
 */

import { NextResponse } from "next/server";
import { ApiKeyManager } from "../../../lib/ecosystem/api-key-manager";
import { taskExecutionController } from "../../../lib/agent-engine/execution-controller";
import { AgentSubrole } from "../../../lib/agent-engine/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const rawKey = authHeader.replace(/^Bearer\s+/i, "").trim();

    const auth = ApiKeyManager.authenticateApiKey(rawKey, "tasks:write");
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const objective = typeof body.objective === "string" ? body.objective.trim() : "";
    if (!objective) {
      return NextResponse.json({ error: "Missing required parameter: objective" }, { status: 400 });
    }

    const agentRole = (body.agentRole as AgentSubrole) || "planning";
    const createdTask = taskExecutionController.createTask({
      userId: auth.apiKey!.userId,
      workspaceId: auth.apiKey!.workspaceId,
      objective,
      constraints: [],
      timeoutMs: 120000,
    });

    const task = await taskExecutionController.executeTask(createdTask.id, auth.apiKey!.userId);

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
