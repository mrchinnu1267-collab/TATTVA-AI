/**
 * TATTVA AI - Complex Task Decomposition Engine
 * Breaks multi-part enterprise goals into ordered, dependency-mapped subtasks
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { TaskDecompositionResult, SubtaskPlanItem } from "./schema";

export class TaskDecomposer {
  private static instance: TaskDecomposer;

  public static getInstance(): TaskDecomposer {
    if (!TaskDecomposer.instance) {
      TaskDecomposer.instance = new TaskDecomposer();
    }
    return TaskDecomposer.instance;
  }

  public decompose(prompt: string, entities: string[], complexityScore: number): TaskDecompositionResult {
    const lower = prompt.toLowerCase();

    // Only decompose complex multi-faceted tasks (complexity >= 6 or multi-domain entities)
    const isComplexAppDev =
      (lower.includes("build") || lower.includes("develop") || lower.includes("create") || lower.includes("architecture")) &&
      (entities.length >= 3 || lower.includes("system") || lower.includes("platform") || lower.includes("application"));

    if (!isComplexAppDev && complexityScore < 7) {
      return {
        isMultiStep: false,
        subtasks: [],
      };
    }

    const subtasks: SubtaskPlanItem[] = [];
    let step = 1;

    // Step 1: Requirements & Architecture
    subtasks.push({
      stepNumber: step++,
      title: "System Architecture & Requirements Analysis",
      description: `Analyze functional objectives, boundary conditions, and tech stack for ${entities.slice(0, 3).join(", ") || "the project"}.`,
      dependencies: [],
      recommendedCapability: "architecture_planning",
    });

    // Step 2: Database Schema
    if (entities.some((e) => ["student", "user", "order", "product", "patient", "database", "sql"].includes(e)) || lower.includes("database")) {
      subtasks.push({
        stepNumber: step++,
        title: "Relational Database Schema & Data Models",
        description: "Design normalized database tables, primary/foreign keys, and indexes.",
        dependencies: [1],
        recommendedCapability: "database_design",
      });
    }

    // Step 3: Authentication & Security
    if (lower.includes("login") || lower.includes("auth") || lower.includes("user") || lower.includes("security")) {
      subtasks.push({
        stepNumber: step++,
        title: "Authentication & Role-Based Access Control (RBAC)",
        description: "Implement secure session tokens, password hashing, and endpoint authorization.",
        dependencies: [step - 2],
        recommendedCapability: "security_engineering",
      });
    }

    // Step 4: Core Domain CRUD & Logic
    subtasks.push({
      stepNumber: step++,
      title: "Core Business Logic & API Endpoints",
      description: `Implement verified handlers and logic for ${entities.slice(0, 4).join(", ") || "core services"}.`,
      dependencies: [step - 2],
      recommendedCapability: "backend_specialist",
    });

    // Step 5: Frontend Interface / Dashboard
    if (lower.includes("app") || lower.includes("website") || lower.includes("ui") || lower.includes("dashboard") || lower.includes("frontend")) {
      subtasks.push({
        stepNumber: step++,
        title: "Responsive Frontend Interface & UI Components",
        description: "Construct accessible dark-mode UI with interactive controls, forms, and validation.",
        dependencies: [step - 2],
        recommendedCapability: "ui_ux_specialist",
      });
    }

    // Step 6: Testing & Verification
    subtasks.push({
      stepNumber: step++,
      title: "Automated Testing, Verification & Hardening",
      description: "Validate inputs, edge cases, error codes, and end-to-end user workflows.",
      dependencies: [step - 2],
      recommendedCapability: "testing_specialist",
    });

    return {
      isMultiStep: true,
      subtasks,
    };
  }
}

export const taskDecomposer = TaskDecomposer.getInstance();
