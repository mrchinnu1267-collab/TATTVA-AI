/**
 * TATTVA AI - SLM Benchmarking Harness (Phase 27)
 * Evaluates compact Small Language Models against Frontier Teachers
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { BenchmarkScore, ModelBenchmarkComparison } from "./types";

export class SLMBenchmarkingHarness {
  private static instance: SLMBenchmarkingHarness;

  public static getInstance(): SLMBenchmarkingHarness {
    if (!SLMBenchmarkingHarness.instance) {
      SLMBenchmarkingHarness.instance = new SLMBenchmarkingHarness();
    }
    return SLMBenchmarkingHarness.instance;
  }

  /**
   * Compares empirical benchmark performances between a teacher model and distilled SLM
   */
  public evaluateComparison(
    teacherScores: BenchmarkScore[],
    studentScores: BenchmarkScore[],
    teacherParamsBillion: number,
    studentParamsBillion: number
  ): ModelBenchmarkComparison {
    if (teacherScores.length === 0 || studentScores.length === 0) {
      throw new Error("Benchmark score collections cannot be empty");
    }

    const compressionRatio = Number((teacherParamsBillion / studentParamsBillion).toFixed(1));

    // Calculate average latency speedup
    const avgTeacherLatency =
      teacherScores.reduce((acc, s) => acc + s.averageLatencyMs, 0) / teacherScores.length;
    const avgStudentLatency =
      studentScores.reduce((acc, s) => acc + s.averageLatencyMs, 0) / studentScores.length;
    const latencySpeedup = Number((avgTeacherLatency / avgStudentLatency).toFixed(2));

    // Calculate accuracy retention across shared benchmarks
    let totalRetention = 0;
    let matchedCount = 0;

    for (const tScore of teacherScores) {
      const sScore = studentScores.find((s) => s.benchmark === tScore.benchmark);
      if (sScore) {
        totalRetention += sScore.accuracy / tScore.accuracy;
        matchedCount++;
      }
    }

    const accuracyRetention =
      matchedCount > 0 ? Number(((totalRetention / matchedCount) * 100).toFixed(2)) : 0;

    return {
      teacherScores,
      studentScores,
      compressionRatio,
      latencySpeedup,
      accuracyRetention,
    };
  }

  /**
   * Evaluates if a distilled SLM is ready for production deployment
   * Production criteria: Accuracy retention >= 85% and Latency speedup >= 2.0x
   */
  public assessProductionReadiness(comparison: ModelBenchmarkComparison): {
    isDeployable: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    if (comparison.accuracyRetention < 85.0) {
      reasons.push(
        `Accuracy retention (${comparison.accuracyRetention}%) is below 85% deployment threshold`
      );
    }

    if (comparison.latencySpeedup < 2.0) {
      reasons.push(
        `Latency speedup (${comparison.latencySpeedup}x) is below 2.0x edge optimization requirement`
      );
    }

    return {
      isDeployable: reasons.length === 0,
      reasons,
    };
  }
}

export const slmBenchmarkingHarness = SLMBenchmarkingHarness.getInstance();
