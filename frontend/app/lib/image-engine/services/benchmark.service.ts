/**
 * TATTVA AI - Unified Benchmark Service (Phase L)
 * Executes model comparison benchmarks, tracks historical prompt accuracy,
 * and maintains continuous evaluation across 500 standardized benchmark prompts.
 */

import { runBenchmarkAccuracyAudit } from "../accuracy/benchmark-runner";
import {
  selectOptimalModelForPrompt,
  rankModelsByParetoEfficiency,
  getHistoricalBenchmarkRuns,
  getFailedBenchmarkCases,
  BENCHMARK_500_PROMPTS,
  MODEL_BENCHMARK_PROFILES,
} from "../model-benchmarking";

export class BenchmarkService {
  /**
   * Runs an accuracy audit across a sample of benchmark prompts.
   */
  public static async runAccuracyAudit(sampleSize: number = 20) {
    return runBenchmarkAccuracyAudit(sampleSize);
  }

  /**
   * Evaluates prompt against benchmark models and selects the optimal model.
   */
  public static selectOptimalModel(params: {
    prompt: string;
    hasReferenceImage?: boolean;
    requiresExactText?: boolean;
    maxCostUsd?: number;
    maxLatencyMs?: number;
  }) {
    return selectOptimalModelForPrompt(params);
  }

  /**
   * Returns Pareto efficiency rankings across supported image models.
   */
  public static rankModels(categoryFilter?: any) {
    return rankModelsByParetoEfficiency(categoryFilter);
  }

  /**
   * Returns continuous benchmark metrics, Pareto tiers, and failure patterns.
   */
  public static getContinuousMetrics() {
    return {
      historicalRuns: getHistoricalBenchmarkRuns(),
      failedCases: getFailedBenchmarkCases(),
    };
  }

  /**
   * Returns registered model specifications with historical accuracy records.
   */
  public static getModelSpecs() {
    return Object.values(MODEL_BENCHMARK_PROFILES);
  }

  /**
   * Returns the catalog of 500 standard benchmark prompts.
   */
  public static getBenchmarkCatalog() {
    return BENCHMARK_500_PROMPTS;
  }
}

