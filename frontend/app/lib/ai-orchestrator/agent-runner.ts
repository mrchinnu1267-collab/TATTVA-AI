/**
 * TATTVA AI - Multi-Step Autonomous AI Agent Engine
 * Plans, executes tools, tracks milestone states, and validates complex objectives
 * Integrates directly with Phase 3 ExecutionController, StateMachine, and MultiAgentSystem
 */

import {
  AgentExecutionState,
  AgentStepEvent,
  ExecutionContext,
} from "./types";
import { taskExecutionController } from "../agent-engine/execution-controller";

export class AgentRunner {
  private static instance: AgentRunner;

  public static getInstance(): AgentRunner {
    if (!AgentRunner.instance) {
      AgentRunner.instance = new AgentRunner();
    }
    return AgentRunner.instance;
  }

  /**
   * Plans and executes an autonomous multi-step workflow via Phase 3 ExecutionController
   */
  public async executeAgentTask(
    userPrompt: string,
    context: ExecutionContext,
    onProgress?: (event: AgentStepEvent) => void
  ): Promise<AgentExecutionState> {
    const userId = context.userId || "anonymous";
    const workspaceId = context.workspaceId || "default";

    // Create Phase 3 Autonomous Task
    const task = taskExecutionController.createTask({
      userId,
      workspaceId,
      objective: userPrompt,
    });

    const stepEvents: AgentStepEvent[] = [];

    // Subscribe to task events and forward to onProgress
    const unsubscribe = taskExecutionController.subscribeToEvents(task.id, (event) => {
      const stepIndex = event.step ? event.step.stepNumber - 1 : 0;
      const totalSteps = task.steps.length || 3;
      const agentEvent: AgentStepEvent = {
        stepIndex,
        totalSteps,
        title: event.step?.title || event.message,
        description: event.message,
        status:
          event.state === "COMPLETED"
            ? "completed"
            : event.state === "FAILED"
            ? "error"
            : event.state === "EXECUTING"
            ? "executing"
            : "planning",
        toolUsed: event.step?.toolToUse,
        timestamp: event.timestamp,
      };
      stepEvents.push(agentEvent);
      if (onProgress) {
        onProgress(agentEvent);
      }
    });

    try {
      const executedTask = await taskExecutionController.executeTask(task.id, userId);

      return {
        taskId: executedTask.id,
        userPrompt,
        status: executedTask.state === "COMPLETED" ? "completed" : "failed",
        plan: executedTask.steps.map((s) => s.title),
        currentStepIndex: executedTask.currentStepIndex,
        stepEvents,
        collectedData: executedTask.memory.toolResults || {},
        finalReport:
          executedTask.finalResult?.summary ||
          `Task completed with status: ${executedTask.state}. Total steps executed: ${executedTask.steps.length}.`,
        error: executedTask.error,
      };
    } finally {
      unsubscribe();
    }
  }
}

export const agentRunner = AgentRunner.getInstance();
