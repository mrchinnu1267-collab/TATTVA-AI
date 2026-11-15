/**
 * TATTVA AI - Intelligent Tool Selector (Phase 17)
 * Evaluates goal intent, constraints, and tool capabilities to select optimal tools
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { toolRegistry } from "../tools/tool-registry";

export class ToolSelector {
  private static instance: ToolSelector;

  public static getInstance(): ToolSelector {
    if (!ToolSelector.instance) {
      ToolSelector.instance = new ToolSelector();
    }
    return ToolSelector.instance;
  }

  /**
   * Identifies candidate tools matching the user goal
   */
  public selectToolsForGoal(goal: string): string[] {
    const lower = goal.toLowerCase();
    const selected: string[] = [];
    const available = toolRegistry.listTools().map((t) => t.name);

    if (
      (/\b(search|google|web|online|latest|news|2025|2026|today|find articles)\b/i.test(lower) ||
        /\bwhat is\b/i.test(lower)) &&
      available.includes("web_search")
    ) {
      selected.push("web_search");
    }

    if (
      /\b(github|repo|repository|git commit|branches|pull request)\b/i.test(lower) &&
      available.includes("github_inspector")
    ) {
      selected.push("github_inspector");
    }

    if (
      /\b(calculate|math|formula|mean|median|statistics|sum|standard deviation|expression)\b/i.test(lower) &&
      available.includes("data_calculator")
    ) {
      selected.push("data_calculator");
    }

    if (
      /\b(document|pdf|docx|xlsx|file|read file|extract text|transcribe)\b/i.test(lower) &&
      available.includes("document_processor")
    ) {
      selected.push("document_processor");
    }

    if (
      /\b(code|run code|execute script|typescript|python|compile|eval)\b/i.test(lower) &&
      available.includes("code_runner")
    ) {
      selected.push("code_runner");
    }

    return selected;
  }
}

export const toolSelector = ToolSelector.getInstance();
