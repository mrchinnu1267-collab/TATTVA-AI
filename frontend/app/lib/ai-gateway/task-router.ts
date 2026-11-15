/**
 * TATTVA AI - AI Gateway Task Router (Phase 59)
 * Analyzes incoming requests, determines appropriate TaskType, and identifies provider affinity.
 */

import { GatewayRequest, TaskType } from "./types";

export interface TaskClassification {
  taskType: TaskType;
  confidence: number;
  reason: string;
  suggestedProvider?: string;
}

export class TaskRouter {
  /**
   * Classify request based on explicit declaration or prompt heuristics
   */
  public classify(request: GatewayRequest): TaskClassification {
    // 1. Explicit taskType takes highest priority
    if (request.taskType) {
      return {
        taskType: request.taskType,
        confidence: 1.0,
        reason: `Explicitly specified task type: ${request.taskType}`,
        suggestedProvider: this.getSuggestedProvider(request.taskType),
      };
    }

    const prompt = (request.prompt || "").toLowerCase();
    const hasAttachments = Boolean(request.context?.attachments && request.context.attachments.length > 0);

    // 2. Multimodal attachment detection
    if (hasAttachments) {
      return {
        taskType: "multimodal",
        confidence: 0.95,
        reason: "Request contains file/image attachments for analysis",
        suggestedProvider: "gemini_api",
      };
    }

    // 3. Image generation intent
    const imageKeywords = [
      "generate image", "create image", "draw", "render an image",
      "create a poster", "illustration of", "photorealistic", "cinematic shot",
      "picture of", "image of", "visual of"
    ];
    if (imageKeywords.some(kw => prompt.includes(kw))) {
      return {
        taskType: "image",
        confidence: 0.9,
        reason: "Matched image generation keywords in prompt",
        suggestedProvider: "local_procedural", // safe procedural fallback or user assisted
      };
    }

    // 4. Code & Reasoning
    const codeKeywords = [
      "function", "write code", "typescript", "javascript", "python",
      "bug", "fix", "refactor", "component", "sql", "api route", "class", "async"
    ];
    if (codeKeywords.some(kw => prompt.includes(kw))) {
      return {
        taskType: "coding",
        confidence: 0.85,
        reason: "Matched programming keywords in prompt",
        suggestedProvider: "gemini_api",
      };
    }

    // 5. Reasoning / Math / Logic
    const reasoningKeywords = [
      "prove", "calculate", "solve step by step", "reasoning", "deduce", "evaluate math"
    ];
    if (reasoningKeywords.some(kw => prompt.includes(kw))) {
      return {
        taskType: "reasoning",
        confidence: 0.85,
        reason: "Matched analytical / reasoning keywords",
        suggestedProvider: "gemini_api",
      };
    }

    // 6. Summarization
    const summaryKeywords = ["summarize", "tldr", "key takeaways", "brief overview", "bullet summary"];
    if (summaryKeywords.some(kw => prompt.includes(kw))) {
      return {
        taskType: "summarization",
        confidence: 0.85,
        reason: "Matched summarization intent",
        suggestedProvider: "gemini_api",
      };
    }

    // 7. Data Analysis
    const dataKeywords = ["dataset", "csv", "trends", "metrics", "analytics", "table data", "correlate"];
    if (dataKeywords.some(kw => prompt.includes(kw))) {
      return {
        taskType: "data_analysis",
        confidence: 0.8,
        reason: "Matched data analysis keywords",
        suggestedProvider: "gemini_api",
      };
    }

    // Default to general text
    return {
      taskType: "text",
      confidence: 0.7,
      reason: "Default general conversational/text intent",
      suggestedProvider: "gemini_api",
    };
  }

  private getSuggestedProvider(taskType: TaskType): string {
    switch (taskType) {
      case "image":
        return "local_procedural";
      case "coding":
      case "reasoning":
      case "text":
      case "summarization":
      case "multimodal":
      case "data_analysis":
      case "knowledge_retrieval":
      case "document":
      default:
        return "gemini_api";
    }
  }
}
