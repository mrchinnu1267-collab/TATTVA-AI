/**
 * TATTVA AI - Agent Memory & Task Context Store
 * Isolated task memory with resumption capability, user isolation, and decision tracking
 */

import { TaskMemoryData, TaskCheckpoint } from "./types";

export class AgentMemoryStore {
  private memory: TaskMemoryData;
  private checkpoints: Map<string, TaskCheckpoint> = new Map();
  private readonly userId: string;
  private readonly workspaceId: string;
  private readonly taskId: string;

  constructor(taskId: string, userId: string, workspaceId: string, objective: string, constraints: string[] = []) {
    this.taskId = taskId;
    this.userId = userId;
    this.workspaceId = workspaceId;
    this.memory = {
      objective,
      completedTasks: [],
      pendingTasks: [],
      toolResults: {},
      errorsEncountered: [],
      decisionsMade: [],
      userConstraints: [...constraints],
      variables: {},
    };
  }

  public getObjective(): string {
    return this.memory.objective;
  }

  public getSnapshot(): TaskMemoryData {
    return JSON.parse(JSON.stringify(this.memory));
  }

  public recordDecision(decision: string): void {
    if (decision && !this.memory.decisionsMade.includes(decision)) {
      this.memory.decisionsMade.push(decision);
    }
  }

  public recordError(error: string): void {
    if (error) {
      this.memory.errorsEncountered.push(`[${new Date().toISOString()}] ${error}`);
    }
  }

  public recordToolResult(stepId: string, toolName: string, result: any): void {
    this.memory.toolResults[`${stepId}_${toolName}`] = result;
  }

  public getToolResult(stepId: string, toolName: string): any {
    return this.memory.toolResults[`${stepId}_${toolName}`];
  }

  public markTaskCompleted(taskTitle: string): void {
    if (!this.memory.completedTasks.includes(taskTitle)) {
      this.memory.completedTasks.push(taskTitle);
    }
    this.memory.pendingTasks = this.memory.pendingTasks.filter((t) => t !== taskTitle);
  }

  public setPendingTasks(tasks: string[]): void {
    this.memory.pendingTasks = [...tasks];
  }

  public setVariable(key: string, value: any): void {
    this.memory.variables[key] = value;
  }

  public getVariable<T = any>(key: string): T | undefined {
    return this.memory.variables[key];
  }

  public createCheckpoint(stepId: string, label: string, filesSnapshot: Record<string, string> = {}): TaskCheckpoint {
    const checkpoint: TaskCheckpoint = {
      id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      stepId,
      timestamp: Date.now(),
      label,
      filesSnapshot: { ...filesSnapshot },
      memorySnapshot: this.getSnapshot(),
    };
    this.checkpoints.set(checkpoint.id, checkpoint);
    return checkpoint;
  }

  public getCheckpoint(checkpointId: string): TaskCheckpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }

  public listCheckpoints(): TaskCheckpoint[] {
    return Array.from(this.checkpoints.values());
  }

  public restoreFromCheckpoint(checkpointId: string): boolean {
    const chk = this.checkpoints.get(checkpointId);
    if (!chk) return false;
    this.memory = JSON.parse(JSON.stringify(chk.memorySnapshot));
    this.memory.resumedAt = Date.now();
    return true;
  }

  public markInterrupted(): void {
    this.memory.interruptedAt = Date.now();
  }

  public markResumed(): void {
    this.memory.resumedAt = Date.now();
  }

  public verifyIsolation(callingUserId: string, callingWorkspaceId: string): boolean {
    return this.userId === callingUserId && this.workspaceId === callingWorkspaceId;
  }
}
