/**
 * TATTVA AI - Agent Execution Dashboard & Observability Engine (Phase 17)
 * Tracks active agent traces, timeline metrics, token utilization, and telemetry
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { AgentExecutionTrace } from "./types";

export interface AgentMetricSummary {
  activeExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  totalDurationMs: number;
  averageLatencyMs: number;
  totalTokensUsed: number;
  estimatedTotalCostUsd: number;
}

export class AgentDashboard {
  private static instance: AgentDashboard;
  private traces: Map<string, AgentExecutionTrace> = new Map();

  public static getInstance(): AgentDashboard {
    if (!AgentDashboard.instance) {
      AgentDashboard.instance = new AgentDashboard();
    }
    return AgentDashboard.instance;
  }

  public recordTrace(trace: AgentExecutionTrace) {
    this.traces.set(trace.taskId, trace);
  }

  public getTrace(taskId: string): AgentExecutionTrace | undefined {
    return this.traces.get(taskId);
  }

  public listRecentTraces(limit: number = 10): AgentExecutionTrace[] {
    return Array.from(this.traces.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  public getMetrics(): AgentMetricSummary {
    const all = Array.from(this.traces.values());
    const active = all.filter((t) => t.status === "in_progress").length;
    const completed = all.filter((t) => t.status === "completed").length;
    const failed = all.filter((t) => t.status === "failed" || t.status === "cancelled").length;

    let totalDurationMs = 0;
    let totalTokens = 0;
    let totalCost = 0;

    for (const t of all) {
      totalDurationMs += t.totalDurationMs || 0;
      totalTokens += t.totalTokensUsed || 0;
      totalCost += t.estimatedCostUsd || 0;
    }

    return {
      activeExecutions: active,
      completedExecutions: completed,
      failedExecutions: failed,
      totalDurationMs,
      averageLatencyMs: all.length > 0 ? Math.round(totalDurationMs / all.length) : 0,
      totalTokensUsed: totalTokens,
      estimatedTotalCostUsd: totalCost,
    };
  }
}

export const agentDashboard = AgentDashboard.getInstance();
