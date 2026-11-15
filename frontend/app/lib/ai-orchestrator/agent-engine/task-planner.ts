/**
 * TATTVA AI - Autonomous Task Planner (Phase 17)
 * Decomposes complex goals into DAG-ordered subtasks with tool assignments
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { AgentTaskPlan, AgentTaskStep } from "./types";
import { toolSelector } from "./tool-selector";

export class TaskPlanner {
  private static instance: TaskPlanner;

  public static getInstance(): TaskPlanner {
    if (!TaskPlanner.instance) {
      TaskPlanner.instance = new TaskPlanner();
    }
    return TaskPlanner.instance;
  }

  /**
   * Generates a structured multi-step execution plan from a user goal
   */
  public plan(userGoal: string): AgentTaskPlan {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const lower = userGoal.toLowerCase();
    const steps: AgentTaskStep[] = [];
    let requiresUserConfirmation = false;
    let confirmationReason: string | undefined = undefined;

    // 1. Goal Classification & Planning Pattern Selection
    if (/github|repo|codebase audit|audit repository/i.test(lower)) {
      // Step 1: Scan & Inspect
      steps.push({
        id: "step_1_inspect",
        stepNumber: 1,
        title: "Repository Inspection",
        description: "Fetch file tree, inspect dependencies and configuration files",
        assignedTool: "github_inspector",
        toolInput: { repository: this.extractTargetRepo(userGoal) },
        dependencies: [],
        status: "pending",
      });

      // Step 2: Code Runner / Test Execution
      steps.push({
        id: "step_2_verify",
        stepNumber: 2,
        title: "Security & Syntax Verification",
        description: "Run automated security checks and verify syntax integrity",
        assignedTool: "code_runner",
        toolInput: { language: "typescript", code: "// verification run" },
        dependencies: ["step_1_inspect"],
        status: "pending",
      });

      // Step 3: Synthesis & Remediation Report
      steps.push({
        id: "step_3_report",
        stepNumber: 3,
        title: "Remediation Report Generation",
        description: "Synthesize findings into an executive security audit report",
        dependencies: ["step_1_inspect", "step_2_verify"],
        status: "pending",
      });
    } else if (/search|research|investigate|market analysis|competitor/i.test(lower)) {
      // Step 1: Web Research
      steps.push({
        id: "step_1_search",
        stepNumber: 1,
        title: "Live Web Retrieval",
        description: "Execute targeted search across current authoritative documentation",
        assignedTool: "web_search",
        toolInput: { query: userGoal.slice(0, 100), maxResults: 5 },
        dependencies: [],
        status: "pending",
      });

      // Step 2: Data Extraction & Calculation
      steps.push({
        id: "step_2_calc",
        stepNumber: 2,
        title: "Data Verification & Metrics Calculation",
        description: "Extract numerical indicators and compute comparative statistics",
        assignedTool: "data_calculator",
        toolInput: { expression: "1+1" },
        dependencies: ["step_1_search"],
        status: "pending",
      });

      // Step 3: Synthesis
      steps.push({
        id: "step_3_dossier",
        stepNumber: 3,
        title: "Research Dossier Synthesis",
        description: "Compile verified findings with grounded citations",
        dependencies: ["step_1_search", "step_2_calc"],
        status: "pending",
      });
    } else if (/calculate|statistics|data analysis|dataset/i.test(lower)) {
      steps.push({
        id: "step_1_calc",
        stepNumber: 1,
        title: "Data Processing & Calculation",
        description: "Execute statistical transformations and math calculations",
        assignedTool: "data_calculator",
        toolInput: { expression: "mean" },
        dependencies: [],
        status: "pending",
      });

      steps.push({
        id: "step_2_summary",
        stepNumber: 2,
        title: "Statistical Summary Synthesis",
        description: "Format metrics and analytical conclusions",
        dependencies: ["step_1_calc"],
        status: "pending",
      });
    } else {
      // General Autonomous Plan
      const selectedTools = toolSelector.selectToolsForGoal(userGoal);
      let stepNum = 1;

      for (const toolName of selectedTools) {
        steps.push({
          id: `step_${stepNum}_${toolName}`,
          stepNumber: stepNum,
          title: `Execute ${toolName}`,
          description: `Run ${toolName} to gather required task context`,
          assignedTool: toolName,
          toolInput: {},
          dependencies: stepNum > 1 ? [`step_${stepNum - 1}`] : [],
          status: "pending",
        });
        stepNum++;
      }

      steps.push({
        id: `step_${stepNum}_finalize`,
        stepNumber: stepNum,
        title: "Finalize & Verify",
        description: "Consolidate tool outputs and formulate verified response",
        dependencies: steps.map((s) => s.id),
        status: "pending",
      });
    }

    // Check if dangerous/modifying actions require explicit user confirmation
    if (lower.includes("delete") || lower.includes("drop") || lower.includes("modify database") || lower.includes("kill")) {
      requiresUserConfirmation = true;
      confirmationReason = "Destructive action detected. Explicit user approval is mandatory.";
    }

    return {
      planId,
      userGoal,
      steps,
      estimatedTotalMs: steps.length * 1500,
      requiresUserConfirmation,
      confirmationReason,
    };
  }

  private extractTargetRepo(prompt: string): string {
    const match = prompt.match(/(?:https:\/\/github\.com\/[^\s]+|[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/i);
    return match ? match[0] : "mrchinnu1267-collab/TATTVA-AI";
  }
}

export const taskPlanner = TaskPlanner.getInstance();
