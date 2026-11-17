/**
 * TATTVA AI - Execution Controller & State Machine Engine
 * Implements Section 6 (Execution Controller) and Section 7 (Human Approval & Permissions)
 */

import {
  AgentTask,
  TaskState,
  TaskStep,
  StepState,
  AgentExecutionContext,
  TaskAuditEntry,
  AgentTaskEvent,
} from "./types";
import { AgentMemoryStore } from "./agent-memory";
import { centralAgentOrchestrator } from "./multi-agent-system";
import { TaskPlanningEngine } from "./planning-engine";

export class TaskExecutionController {
  private static instance: TaskExecutionController;
  private tasks: Map<string, AgentTask> = new Map();
  private memories: Map<string, AgentMemoryStore> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private eventListeners: Map<string, Array<(event: AgentTaskEvent) => void>> = new Map();

  private constructor() {}

  public static getInstance(): TaskExecutionController {
    if (!TaskExecutionController.instance) {
      TaskExecutionController.instance = new TaskExecutionController();
    }
    return TaskExecutionController.instance;
  }

  /**
   * Initializes a new autonomous task.
   */
  public createTask(params: {
    userId: string;
    workspaceId: string;
    objective: string;
    constraints?: string[];
    timeoutMs?: number;
  }): AgentTask {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const memory = new AgentMemoryStore(
      taskId,
      params.userId,
      params.workspaceId,
      params.objective,
      params.constraints || []
    );
    this.memories.set(taskId, memory);

    const task: AgentTask = {
      id: taskId,
      userId: params.userId,
      workspaceId: params.workspaceId,
      objective: params.objective,
      state: "CREATED",
      steps: [],
      currentStepIndex: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      timeoutMs: params.timeoutMs || 120000,
      artifacts: [],
      memory: memory.getSnapshot(),
      checkpoints: [],
      auditLog: [
        {
          timestamp: Date.now(),
          fromState: "CREATED",
          toState: "CREATED",
          reason: "Task initialized",
          userId: params.userId,
        },
      ],
    };

    this.tasks.set(taskId, task);
    this.emitEvent(taskId, {
      taskId,
      type: "state_change",
      state: "CREATED",
      message: `Task created for objective: "${params.objective.slice(0, 80)}"`,
      timestamp: Date.now(),
    });

    return task;
  }

  public getTask(taskId: string, userId: string): AgentTask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    if (task.userId !== userId) {
      return null;
    }
    return task;
  }

  public listTasks(userId: string, workspaceId?: string): AgentTask[] {
    const userTasks = Array.from(this.tasks.values()).filter((t) => t.userId === userId);
    if (workspaceId) {
      return userTasks.filter((t) => t.workspaceId === workspaceId);
    }
    return userTasks;
  }

  public subscribeToEvents(taskId: string, listener: (event: AgentTaskEvent) => void): () => void {
    const existing = this.eventListeners.get(taskId) || [];
    this.eventListeners.set(taskId, [...existing, listener]);
    return () => {
      const current = this.eventListeners.get(taskId) || [];
      this.eventListeners.set(
        taskId,
        current.filter((l) => l !== listener)
      );
    };
  }

  private emitEvent(taskId: string, event: AgentTaskEvent): void {
    const listeners = this.eventListeners.get(taskId) || [];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {}
    }
  }

  private transitionState(task: AgentTask, newState: TaskState, reason?: string): void {
    const oldState = task.state;
    task.state = newState;
    task.updatedAt = Date.now();
    task.auditLog.push({
      timestamp: Date.now(),
      fromState: oldState,
      toState: newState,
      reason,
      userId: task.userId,
    });
    this.emitEvent(task.id, {
      taskId: task.id,
      type: "state_change",
      state: newState,
      message: reason || `State transitioned to ${newState}`,
      timestamp: Date.now(),
    });
  }

  /**
   * Plans and executes the task end-to-end.
   */
  public async executeTask(taskId: string, userId: string, isResuming = false): Promise<AgentTask> {
    const task = this.getTask(taskId, userId);
    if (!task) {
      throw new Error(`Task "${taskId}" not found or unauthorized.`);
    }

    if (!isResuming && ["EXECUTING", "PLANNING", "ANALYZING"].includes(task.state)) {
      return task;
    }

    const abortController = new AbortController();
    this.abortControllers.set(taskId, abortController);

    const memory = this.memories.get(taskId);
    if (!memory) {
      throw new Error(`Memory store not found for task "${taskId}".`);
    }

    // 1. ANALYZING & PLANNING (Only if not already planned)
    if (task.steps.length === 0) {
      this.transitionState(task, "ANALYZING", "Deconstructing user objective and constraints");
      this.transitionState(task, "PLANNING", "Generating dependency-aware step plan");

      const plan = TaskPlanningEngine.planTask(task.objective, task.memory.userConstraints);
      task.steps = plan.steps;
      memory.setPendingTasks(plan.steps.map((s) => s.title));
      task.memory = memory.getSnapshot();
    }

    // 2. EXECUTING
    this.transitionState(
      task,
      "EXECUTING",
      isResuming
        ? `Resuming execution at step ${task.currentStepIndex + 1}`
        : `Executing plan with ${task.steps.length} ordered steps`
    );

    const context: AgentExecutionContext = {
      userId: task.userId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      isAuthenticated: true,
      cancelSignal: abortController.signal,
    };

    const maxLoops = 25;
    let loopCount = 0;

    while (task.currentStepIndex < task.steps.length && loopCount < maxLoops) {
      loopCount++;

      if (abortController.signal.aborted || task.state === "CANCELLED") {
        this.transitionState(task, "CANCELLED", "Task execution cancelled by user");
        task.cancelledAt = Date.now();
        return task;
      }

      const step = task.steps[task.currentStepIndex];

      // If already completed in previous run, advance
      if (step.status === "COMPLETED") {
        task.currentStepIndex++;
        continue;
      }

      const unfulfilled = step.dependencies.filter((depId) => {
        const dep = task.steps.find((s) => s.id === depId);
        return !dep || dep.status !== "COMPLETED";
      });

      if (unfulfilled.length > 0) {
        step.status = "FAILED";
        step.error = `Unfulfilled dependencies: ${unfulfilled.join(", ")}`;
        this.transitionState(task, "FAILED", `Step "${step.title}" failed due to unmet dependencies.`);
        task.failedAt = Date.now();
        return task;
      }

      if (step.requiresApproval && !step.isApproved) {
        step.status = "WAITING_FOR_APPROVAL";
        this.transitionState(
          task,
          "WAITING_FOR_APPROVAL",
          `Step "${step.title}" requires human approval before proceeding.`
        );
        this.emitEvent(task.id, {
          taskId: task.id,
          type: "approval_required",
          state: "WAITING_FOR_APPROVAL",
          step,
          message: `Action requires approval: ${step.approvalRequest?.riskSummary || step.title}`,
          timestamp: Date.now(),
        });
        return task;
      }

      step.status = "RUNNING";
      step.startedAt = Date.now();
      this.emitEvent(task.id, {
        taskId: task.id,
        type: "step_started",
        state: "EXECUTING",
        step,
        message: `Executing step ${step.stepNumber}: ${step.title}`,
        timestamp: Date.now(),
      });

      memory.createCheckpoint(step.id, `pre_${step.id}`);

      let agentResult = await centralAgentOrchestrator.dispatch(step, memory, context);

      if (!agentResult.success && step.retryCount < step.maxRetries) {
        step.retryCount++;
        step.status = "RETRYING";
        this.transitionState(task, "RETRYING", `Retrying step "${step.title}" (Attempt ${step.retryCount + 1})`);

        this.emitEvent(task.id, {
          taskId: task.id,
          type: "step_failed",
          state: "RETRYING",
          step,
          message: `Step failed: ${agentResult.error}. Initiating retry attempt ${step.retryCount}.`,
          timestamp: Date.now(),
        });

        agentResult = await centralAgentOrchestrator.dispatch(step, memory, context);
      }

      step.completedAt = Date.now();
      step.durationMs = step.completedAt - step.startedAt;

      if (agentResult.success) {
        step.status = "COMPLETED";
        step.output = agentResult.summary;
        memory.markTaskCompleted(step.title);

        if (agentResult.deliverables && agentResult.deliverables.length > 0) {
          for (const item of agentResult.deliverables) {
            if (item.path && item.data) {
              task.artifacts.push({
                id: `art_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                type: item.type || "file",
                title: item.title || item.path,
                path: item.path,
                content: typeof item.data === "string" ? item.data : JSON.stringify(item.data),
                createdAt: Date.now(),
              });
            }
          }
        }

        this.emitEvent(task.id, {
          taskId: task.id,
          type: "step_completed",
          state: "EXECUTING",
          step,
          message: `Completed step ${step.stepNumber}: ${agentResult.summary}`,
          timestamp: Date.now(),
        });

        task.currentStepIndex++;
      } else {
        step.status = "FAILED";
        step.error = agentResult.error || "Unknown step execution failure";
        memory.recordError(step.error);

        this.transitionState(task, "FAILED", `Execution halted at step ${step.stepNumber}: ${step.error}`);
        task.failedAt = Date.now();
        task.error = step.error;

        this.emitEvent(task.id, {
          taskId: task.id,
          type: "step_failed",
          state: "FAILED",
          step,
          message: `Task failed at step ${step.stepNumber}: ${step.error}`,
          timestamp: Date.now(),
        });

        return task;
      }
    }

    // 3. VERIFYING & FINALIZING
    this.transitionState(task, "VERIFYING", "Verifying task completion invariants");
    const allCompleted = task.steps.every((s) => s.status === "COMPLETED");

    if (allCompleted) {
      this.transitionState(task, "COMPLETED", "All planned steps completed successfully");
      task.completedAt = Date.now();
      task.finalResult = {
        summary: `Successfully completed objective: "${task.objective}" across ${task.steps.length} executed steps.`,
        deliverables: task.artifacts.map((a) => a.title),
        verificationPassed: true,
        totalExecutionTimeMs: task.completedAt - task.createdAt,
      };

      this.emitEvent(task.id, {
        taskId: task.id,
        type: "state_change",
        state: "COMPLETED",
        message: task.finalResult.summary,
        timestamp: Date.now(),
        data: task.finalResult,
      });
    } else {
      this.transitionState(task, "FAILED", "Not all steps reached completion status");
      task.failedAt = Date.now();
    }

    task.memory = memory.getSnapshot();
    task.checkpoints = memory.listCheckpoints();
    return task;
  }

  public async grantApproval(taskId: string, stepId: string, approvedBy: string): Promise<AgentTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task "${taskId}" not found.`);
    }

    const step = task.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new Error(`Step "${stepId}" not found in task "${taskId}".`);
    }

    step.isApproved = true;
    step.status = "PENDING";
    if (step.approvalRequest) {
      step.approvalRequest.approvedAt = Date.now();
      step.approvalRequest.approvedBy = approvedBy;
    }

    this.transitionState(task, "EXECUTING", `Approval granted by ${approvedBy} for step "${step.title}". Resuming execution.`);
    return await this.executeTask(taskId, task.userId, true);
  }

  public cancelTask(taskId: string, userId: string, reason: string = "User requested cancellation"): boolean {
    const task = this.getTask(taskId, userId);
    if (!task) return false;

    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
    }

    this.transitionState(task, "CANCELLED", reason);
    task.cancelledAt = Date.now();
    return true;
  }

  public async resumeTask(taskId: string, userId: string): Promise<AgentTask> {
    const task = this.getTask(taskId, userId);
    if (!task) {
      throw new Error(`Task "${taskId}" not found or unauthorized.`);
    }

    const memory = this.memories.get(taskId);
    if (memory) {
      memory.markResumed();
    }

    return await this.executeTask(taskId, userId, true);
  }
}

export const taskExecutionController = TaskExecutionController.getInstance();
