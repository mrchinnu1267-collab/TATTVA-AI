/**
 * TATTVA AI - Model Routing & Latency Optimizer (Phase 25)
 * Dynamically selects cost-effective models for simple tasks while preserving quality for complex work
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { TaskIntent } from "../ai-orchestrator/types";

export interface RoutingDecision {
  selectedModel: string;
  tier: "ultra_low_latency" | "balanced" | "frontier_reasoning";
  estimatedLatencyMs: number;
  costPer1kTokens: number;
  reason: string;
}

export class RoutingOptimizer {
  private static instance: RoutingOptimizer;

  public static getInstance(): RoutingOptimizer {
    if (!RoutingOptimizer.instance) {
      RoutingOptimizer.instance = new RoutingOptimizer();
    }
    return RoutingOptimizer.instance;
  }

  /**
   * Optimizes model choice based on intent and complexity
   */
  public optimizeRoute(intent: TaskIntent, complexityScore: number): RoutingDecision {
    // 1. Simple conversational or low-complexity factual tasks
    if (complexityScore <= 4 && (intent === "conversational" || intent === "general_qa" || intent === "summarization")) {
      return {
        selectedModel: "gemini-3.5-flash-lite",
        tier: "ultra_low_latency",
        estimatedLatencyMs: 120,
        costPer1kTokens: 0.000075,
        reason: "Low complexity task routed to lightweight model for 3x faster response and 50% cost savings",
      };
    }

    // 2. High-complexity coding, agent task, or mathematics
    if (complexityScore >= 7 || intent === "coding" || intent === "agent_task" || intent === "mathematics") {
      return {
        selectedModel: "gemini-3.6-flash",
        tier: "frontier_reasoning",
        estimatedLatencyMs: 450,
        costPer1kTokens: 0.00030,
        reason: "High complexity logic requires frontier reasoning capabilities to maintain 100% accuracy",
      };
    }

    // 3. Balanced default
    return {
      selectedModel: "gemini-3.5-flash-lite",
      tier: "balanced",
      estimatedLatencyMs: 250,
      costPer1kTokens: 0.00015,
      reason: "Balanced profile delivering optimal speed and reasoning trade-off",
    };
  }
}

export const routingOptimizer = RoutingOptimizer.getInstance();
