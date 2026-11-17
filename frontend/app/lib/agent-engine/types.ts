/**
 * TATTVA AI - Phase 3 Autonomous AI Agent & Multi-Step Task Execution Engine
 * Core Type Definitions, State Machine Interfaces, and Tool Schemas
 * Conceptualized & Engineered for Production Reliability
 */

export type TaskState =
  | "CREATED"
  | "ANALYZING"
  | "PLANNING"
  | "WAITING_FOR_APPROVAL"
  | "EXECUTING"
  | "VERIFYING"
  | "RETRYING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type StepState =
  | "PENDING"
  | "WAITING_FOR_APPROVAL"
  | "RUNNING"
  | "VERIFYING"
  | "RETRYING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED";

export type ToolPermissionLevel = "safe" | "approval_required";

export type AgentSubrole =
  | "planning"
  | "research"
  | "programming"
  | "debugging"
  | "mathematics"
  | "data_analysis"
  | "document"
  | "testing"
  | "security_review";

export interface ToolParameterDefinition {
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
  default?: any;
  enum?: string[];
}

export interface ToolDefinitionSchema {
  name: string;
  displayName: string;
  description: string;
  category: "research" | "code" | "file" | "database" | "api" | "math" | "data" | "security";
  permission: ToolPermissionLevel;
  timeoutMs: number;
  inputSchema: Record<string, ToolParameterDefinition>;
  outputSchema: Record<string, string>;
  execute: (params: Record<string, any>, context: AgentExecutionContext) => Promise<ToolExecutionOutput>;
}

export interface ToolExecutionOutput {
  toolName: string;
  success: boolean;
  output: any;
  error?: string;
  executionTimeMs: number;
  citations?: Array<{ title: string; url: string; snippet?: string }>;
  artifacts?: Array<{ type: string; title: string; data: any; path?: string }>;
}

export interface AgentExecutionContext {
  userId: string;
  workspaceId: string;
  userEmail?: string;
  taskId: string;
  stepId?: string;
  isAuthenticated: boolean;
  isApprovalGranted?: boolean;
  cancelSignal?: AbortSignal;
}

export interface TaskStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  assignedAgent: AgentSubrole;
  toolToUse?: string;
  toolParameters?: Record<string, any>;
  dependencies: string[];
  status: StepState;
  requiresApproval: boolean;
  isApproved?: boolean;
  approvalRequest?: {
    actionType: string;
    details: string;
    riskSummary: string;
    requestedAt: number;
    approvedAt?: number;
    approvedBy?: string;
  };
  output?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
}

export interface TaskMemoryData {
  objective: string;
  completedTasks: string[];
  pendingTasks: string[];
  toolResults: Record<string, any>;
  errorsEncountered: string[];
  decisionsMade: string[];
  userConstraints: string[];
  variables: Record<string, any>;
  interruptedAt?: number;
  resumedAt?: number;
}

export interface TaskCheckpoint {
  id: string;
  stepId: string;
  timestamp: number;
  label: string;
  filesSnapshot: Record<string, string>;
  memorySnapshot: TaskMemoryData;
}

export interface TaskAuditEntry {
  timestamp: number;
  fromState: TaskState;
  toState: TaskState;
  reason?: string;
  agent?: AgentSubrole;
  toolUsed?: string;
  userId: string;
}

export interface AgentTask {
  id: string;
  userId: string;
  workspaceId: string;
  objective: string;
  state: TaskState;
  steps: TaskStep[];
  currentStepIndex: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  failedAt?: number;
  cancelledAt?: number;
  timeoutMs: number;
  artifacts: Array<{
    id: string;
    type: string;
    title: string;
    path?: string;
    content?: string;
    createdAt: number;
  }>;
  memory: TaskMemoryData;
  checkpoints: TaskCheckpoint[];
  auditLog: TaskAuditEntry[];
  finalResult?: {
    summary: string;
    deliverables: string[];
    verificationPassed: boolean;
    totalExecutionTimeMs: number;
  };
  error?: string;
}

export interface AgentTaskEvent {
  taskId: string;
  type: "state_change" | "step_started" | "step_completed" | "step_failed" | "approval_required" | "log" | "artifact_created";
  state: TaskState;
  step?: TaskStep;
  message: string;
  timestamp: number;
  data?: any;
}
