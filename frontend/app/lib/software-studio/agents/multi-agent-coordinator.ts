/**
 * TATTVA AI - Multi-Agent Central Coordinator & Task Supervisor
 * Orchestrates the 10 specialized engineering agents, enforces file locking,
 * coordinates inter-agent messaging, and supervises autonomous project building.
 */

import { SPECIALIZED_AGENTS } from "./specialized-agents";
import type { AgentRole, AgentTask, AgentMessage, MultiAgentExecutionPlan } from "./types";

export class MultiAgentCoordinator {
  private activeLocks: Map<string, string> = new Map(); // filePath -> taskId

  /**
   * Plans an autonomous software engineering project from natural language requirements.
   */
  public createExecutionPlan(
    projectId: string,
    projectName: string,
    requirement: string
  ): MultiAgentExecutionPlan {
    const tasks: AgentTask[] = [
      {
        id: "task_1_pm",
        title: "Requirement Decomposition & Task Breakdown",
        description: `Analyze requirement "${requirement.slice(0, 100)}" and define project scope.`,
        assignedRole: "project_manager",
        status: "pending",
        dependencies: [],
        lockedFiles: ["PROJECT_PLAN.md"],
      },
      {
        id: "task_2_arch",
        title: "Architecture & Tech Stack Design",
        description: "Select frameworks (Next.js, React 19, TypeScript) and design component & service boundaries.",
        assignedRole: "software_architect",
        status: "pending",
        dependencies: ["task_1_pm"],
        lockedFiles: ["ARCHITECTURE.md", "package.json"],
      },
      {
        id: "task_3_db",
        title: "Database Schema & Migration Authoring",
        description: "Design relational SQL schemas, indexes, and primary/foreign key relationships.",
        assignedRole: "database_engineer",
        status: "pending",
        dependencies: ["task_2_arch"],
        lockedFiles: ["schema.sql"],
      },
      {
        id: "task_4_backend",
        title: "Backend API Routes & Logic Implementation",
        description: "Write type-safe API route handlers (GET, POST) and service logic.",
        assignedRole: "backend_developer",
        status: "pending",
        dependencies: ["task_3_db"],
        lockedFiles: ["route.ts"],
      },
      {
        id: "task_5_frontend",
        title: "Interactive Frontend Component Development",
        description: "Build reactive client components with clean state and fluid interactivity.",
        assignedRole: "frontend_developer",
        status: "pending",
        dependencies: ["task_4_backend"],
        lockedFiles: ["page.tsx", "components.tsx"],
      },
      {
        id: "task_6_uiux",
        title: "UI/UX Accessibility & Responsive Polish",
        description: "Apply WCAG contrast, responsive grid breakpoints, and dark mode aesthetic.",
        assignedRole: "ui_ux_developer",
        status: "pending",
        dependencies: ["task_5_frontend"],
        lockedFiles: ["styles.css"],
      },
      {
        id: "task_7_test",
        title: "Automated Unit & Integration Test Generation",
        description: "Author comprehensive test suites asserting functionality and edge cases.",
        assignedRole: "testing_engineer",
        status: "pending",
        dependencies: ["task_5_frontend"],
        lockedFiles: ["app.test.ts"],
      },
      {
        id: "task_8_security",
        title: "Zero-Trust Security & Vulnerability Audit",
        description: "Scan code for injection vulnerabilities, secret leakage, and path safety.",
        assignedRole: "security_engineer",
        status: "pending",
        dependencies: ["task_7_test"],
        lockedFiles: ["SECURITY.md"],
      },
      {
        id: "task_9_docs",
        title: "Project Documentation & README Synthesis",
        description: "Generate structured README, API endpoints catalog, and setup runbook.",
        assignedRole: "documentation_engineer",
        status: "pending",
        dependencies: ["task_8_security"],
        lockedFiles: ["README.md"],
      },
    ];

    const messages: AgentMessage[] = [
      {
        id: "msg_init",
        sender: "project_manager",
        receiver: "all",
        content: `Initiated autonomous development for "${projectName}". 9 structured milestones planned.`,
        timestamp: new Date().toISOString(),
      },
    ];

    return {
      projectId,
      projectName,
      requirement,
      tasks,
      messages,
      status: "planning",
    };
  }

  /**
   * Attempts to acquire file locks for a task, preventing conflicting file edits.
   */
  public acquireLocks(taskId: string, files: string[]): { granted: boolean; conflictFile?: string } {
    for (const f of files) {
      const existingTask = this.activeLocks.get(f);
      if (existingTask && existingTask !== taskId) {
        return { granted: false, conflictFile: f };
      }
    }
    for (const f of files) {
      this.activeLocks.set(f, taskId);
    }
    return { granted: true };
  }

  /**
   * Releases file locks after task completion.
   */
  public releaseLocks(taskId: string): void {
    for (const [file, task] of this.activeLocks.entries()) {
      if (task === taskId) {
        this.activeLocks.delete(file);
      }
    }
  }

  /**
   * Executes a task with its assigned agent and records inter-agent messaging.
   */
  public async executeTask(
    plan: MultiAgentExecutionPlan,
    taskId: string,
    executeFn: (task: AgentTask, agentRole: AgentRole) => Promise<{ summary: string; files: string[] }>
  ): Promise<AgentTask> {
    const task = plan.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error(`Task "${taskId}" not found in plan.`);

    // Check dependencies
    for (const depId of task.dependencies) {
      const dep = plan.tasks.find((t) => t.id === depId);
      if (!dep || dep.status !== "completed") {
        throw new Error(`Cannot execute task "${task.title}": dependency "${dep?.title || depId}" is not completed.`);
      }
    }

    // Acquire locks
    const lockResult = this.acquireLocks(task.id, task.lockedFiles);
    if (!lockResult.granted) {
      throw new Error(`File lock collision on "${lockResult.conflictFile}". Another agent holds this lock.`);
    }

    task.status = "in_progress";
    plan.activeAgent = task.assignedRole;

    try {
      const result = await executeFn(task, task.assignedRole);
      task.status = "completed";
      task.outputSummary = result.summary;
      task.generatedFiles = result.files;

      plan.messages.push({
        id: `msg_${Date.now()}`,
        sender: task.assignedRole,
        receiver: "project_manager",
        content: `Completed: ${task.title}. ${result.summary}`,
        timestamp: new Date().toISOString(),
        data: { files: result.files },
      });

      return task;
    } catch (err: any) {
      task.status = "failed";
      task.error = err?.message || "Execution failure";

      plan.messages.push({
        id: `msg_err_${Date.now()}`,
        sender: task.assignedRole,
        receiver: "debugging_engineer",
        content: `Failed: ${task.title}. Error: ${task.error}. Requesting Autonomous Debugging Agent.`,
        timestamp: new Date().toISOString(),
      });

      throw err;
    } finally {
      this.releaseLocks(task.id);
      plan.activeAgent = undefined;
    }
  }
}

export const GlobalAgentCoordinator = new MultiAgentCoordinator();
