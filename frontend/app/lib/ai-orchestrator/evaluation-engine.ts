/**
 * TATTVA AI - AI Evaluation & Quality Control Engine
 * Measures model benchmarks, tool reliability, reasoning fidelity, and regression safety
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { TaskIntent } from "./types";
import { toolRegistry } from "./tools/tool-registry";
import { modelRouter } from "./model-router";
import { classifyIntent } from "./intent-classifier";

export interface EvaluationBenchmarkResult {
  suiteName: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  passRatePercentage: number;
  averageLatencyMs: number;
  details: Array<{
    name: string;
    category: "intent" | "tool" | "reasoning" | "security" | "multilingual";
    passed: boolean;
    latencyMs: number;
    error?: string;
  }>;
  timestamp: number;
}

export class EvaluationEngine {
  private static instance: EvaluationEngine;

  public static getInstance(): EvaluationEngine {
    if (!EvaluationEngine.instance) {
      EvaluationEngine.instance = new EvaluationEngine();
    }
    return EvaluationEngine.instance;
  }

  /**
   * Runs an automated benchmark suite across the core AI capabilities
   */
  public async runAutomatedBenchmark(): Promise<EvaluationBenchmarkResult> {
    const details: EvaluationBenchmarkResult["details"] = [];
    const latencies: number[] = [];

    // Test 1: Intent Recognition Accuracy
    const intentStart = Date.now();
    try {
      const mathClassification = await classifyIntent("Calculate standard deviation of [12, 18, 25, 30, 42]");
      const passed = mathClassification.primaryIntent === "mathematics" || mathClassification.primaryIntent === "data_analysis";
      const dur = Date.now() - intentStart;
      latencies.push(dur);
      details.push({
        name: "Intent Recognition: Math & Data Classification",
        category: "intent",
        passed,
        latencyMs: dur,
      });
    } catch (e) {
      details.push({
        name: "Intent Recognition: Math & Data Classification",
        category: "intent",
        passed: false,
        latencyMs: Date.now() - intentStart,
        error: String(e),
      });
    }

    // Test 2: Tool Registry & Sandboxed Code Execution
    const codeStart = Date.now();
    try {
      const codeRes = await toolRegistry.executeTool(
        "code_runner",
        {
          language: "javascript",
          code: "function add(a, b) { return a + b; }; add;",
          testCases: [{ input: [5, 7], expected: 12, name: "Addition test" }],
        },
        { userId: "benchmark", userEmail: "benchmark@tattva.internal" }
      );

      const passed = codeRes.success && codeRes.output?.testsPassed === 1;
      const dur = Date.now() - codeStart;
      latencies.push(dur);
      details.push({
        name: "Tool Sandbox: Unit Test Execution",
        category: "tool",
        passed,
        latencyMs: dur,
      });
    } catch (e) {
      details.push({
        name: "Tool Sandbox: Unit Test Execution",
        category: "tool",
        passed: false,
        latencyMs: Date.now() - codeStart,
        error: String(e),
      });
    }

    // Test 3: Mathematical Precision Calculator
    const calcStart = Date.now();
    try {
      const calcRes = await toolRegistry.executeTool(
        "data_calculator",
        { expression: "2 * (15 + 25) / 4", dataset: [10, 20, 30] },
        { userId: "benchmark", userEmail: "benchmark@tattva.internal" }
      );
      const passed = calcRes.success && calcRes.output?.result === 20 && calcRes.output?.statistics?.mean === 20;
      const dur = Date.now() - calcStart;
      latencies.push(dur);
      details.push({
        name: "Tool Math: Calculation & Dataset Statistics",
        category: "tool",
        passed,
        latencyMs: dur,
      });
    } catch (e) {
      details.push({
        name: "Tool Math: Calculation & Dataset Statistics",
        category: "tool",
        passed: false,
        latencyMs: Date.now() - calcStart,
        error: String(e),
      });
    }

    // Test 4: Web Search Retrievability
    const searchStart = Date.now();
    try {
      const searchRes = await toolRegistry.executeTool(
        "web_search",
        { query: "Artificial Intelligence research 2026", maxResults: 3 },
        { userId: "benchmark", userEmail: "benchmark@tattva.internal" }
      );
      const passed = searchRes.success && Array.isArray(searchRes.citations) && searchRes.citations.length > 0;
      const dur = Date.now() - searchStart;
      latencies.push(dur);
      details.push({
        name: "Tool Search: Live Retrieval & Citation Grounding",
        category: "tool",
        passed,
        latencyMs: dur,
      });
    } catch (e) {
      details.push({
        name: "Tool Search: Live Retrieval & Citation Grounding",
        category: "tool",
        passed: false,
        latencyMs: Date.now() - searchStart,
        error: String(e),
      });
    }

    // Test 5: Multi-Provider Model Orchestration
    const modelStart = Date.now();
    try {
      const modelRes = await modelRouter.executeWithFallback("general_chat", 2, {
        messages: [{ role: "user", content: "Reply with the exact word: TATTVA_CONFIRMED" }],
        temperature: 0.1,
      });
      const passed = modelRes.text.includes("TATTVA_CONFIRMED");
      const dur = Date.now() - modelStart;
      latencies.push(dur);
      details.push({
        name: "Model Orchestration: Prompt Adherence & Latency",
        category: "reasoning",
        passed,
        latencyMs: dur,
      });
    } catch (e) {
      details.push({
        name: "Model Orchestration: Prompt Adherence & Latency",
        category: "reasoning",
        passed: false,
        latencyMs: Date.now() - modelStart,
        error: String(e),
      });
    }

    const passedCount = details.filter((d) => d.passed).length;
    const failedCount = details.length - passedCount;
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

    return {
      suiteName: "TATTVA AI Core Intelligence Benchmark Suite",
      totalTests: details.length,
      passedCount,
      failedCount,
      passRatePercentage: Math.round((passedCount / details.length) * 100),
      averageLatencyMs: avgLatency,
      details,
      timestamp: Date.now(),
    };
  }
}

export const evaluationEngine = EvaluationEngine.getInstance();
