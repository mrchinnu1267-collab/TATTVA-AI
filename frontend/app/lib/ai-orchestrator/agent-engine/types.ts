/**
 * TATTVA AI - Agentic AI & Tool Execution Engine Types (Phase 17)
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type ToolSafetyLevel = "safe" | "confirm_required" | "dangerous";
export type ToolPermissionLevel = "read_only" | "write" | "execute";

export interface AgentTaskStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  assignedTool?: string;
  toolInput?: Record<string, any>;
  dependencies: string[]; // step IDs that must complete first
  status: "pending" | "executing" | "completed" | "failed" | "skipped";
  output?: any;
  error?: string;
  durationMs?: number;
  retryCount?: number;
}

export interface AgentTaskPlan {
  planId: string;
  userGoal: string;
  steps: AgentTaskStep[];
  estimatedTotalMs: number;
  requiresUserConfirmation: boolean;
  confirmationReason?: string;
}

export interface AgentExecutionTrace {
  taskId: string;
  planId: string;
  status: "in_progress" | "completed" | "failed" | "cancelled";
  steps: AgentTaskStep[];
  startTime: number;
  endTime?: number;
  totalDurationMs?: number;
  totalTokensUsed: number;
  estimatedCostUsd: number;
  artifacts: Record<string, any>;
  finalOutput?: string;
  error?: string;
}

export interface ToolExecutionOptions {
  timeoutMs?: number;
  abortSignal?: AbortSignal;
  userConfirmed?: boolean;
  maxRetries?: number;
}
