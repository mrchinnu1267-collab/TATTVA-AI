/**
 * TATTVA AI - Multi-Agent Software Engineering Types
 */

export type AgentRole =
  | "project_manager"
  | "software_architect"
  | "frontend_developer"
  | "backend_developer"
  | "database_engineer"
  | "ui_ux_developer"
  | "debugging_engineer"
  | "testing_engineer"
  | "security_engineer"
  | "documentation_engineer";

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  assignedRole: AgentRole;
  status: "pending" | "in_progress" | "completed" | "failed";
  dependencies: string[]; // task IDs that must complete first
  lockedFiles: string[]; // files owned by this task to prevent concurrent write collisions
  outputSummary?: string;
  generatedFiles?: string[];
  error?: string;
}

export interface AgentMessage {
  id: string;
  sender: AgentRole;
  receiver: AgentRole | "all";
  content: string;
  timestamp: string;
  data?: any;
}

export interface MultiAgentExecutionPlan {
  projectId: string;
  projectName: string;
  requirement: string;
  tasks: AgentTask[];
  messages: AgentMessage[];
  status: "planning" | "executing" | "completed" | "failed";
  activeAgent?: AgentRole;
}
