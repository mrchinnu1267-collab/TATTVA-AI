/**
 * TATTVA AI - GSM8K Multi-Model Mathematical Comparator
 * Benchmarks multiple configured LLMs on identical mathematical question slices.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { Gsm8kModelComparisonRun, Gsm8kEvalRunSummary } from "./types";
import { gsm8kEvaluator } from "./gsm8k-evaluator";

export class Gsm8kModelComparator {
  private static instance: Gsm8kModelComparator;

  public static getInstance(): Gsm8kModelComparator {
    if (!Gsm8kModelComparator.instance) {
      Gsm8kModelComparator.instance = new Gsm8kModelComparator();
    }
    return Gsm8kModelComparator.instance;
  }

  /**
   * Runs side-by-side benchmark comparison across specified models on identical questions
   */
  public async compareModels(
    modelIds: string[],
    questionCount = 10,
    seed = 42,
    mockInference = false
  ): Promise<Gsm8kModelComparisonRun> {
    if (modelIds.length < 1) {
      throw new Error("At least one model must be provided for GSM8K comparison");
    }

    const runs: Gsm8kEvalRunSummary[] = [];

    // Run identical evaluation slice for each model
    for (const mId of modelIds) {
      const run = await gsm8kEvaluator.runEvaluation({
        modelId: mId,
        questionCount,
        seed, // Fixed seed guarantees identical questions
        mockInference,
      });
      runs.push(run);
    }

    // Build question comparison table
    const firstRun = runs[0];
    const questions = firstRun.questionResults.map((qr) => {
      const modelAnswers: Record<
        string,
        { answer: string; isCorrect: boolean; latencyMs: number }
      > = {};

      for (const run of runs) {
        const matching = run.questionResults.find((r) => r.questionId === qr.questionId);
        if (matching) {
          modelAnswers[run.modelId] = {
            answer: matching.aiExtractedAnswer,
            isCorrect: matching.isCorrect,
            latencyMs: matching.latencyMs,
          };
        }
      }

      return {
        id: qr.questionId,
        question: qr.question,
        expectedAnswer: qr.expectedAnswer,
        modelAnswers,
      };
    });

    // Compute consensus (% of questions where all models produced identical correct status)
    let consensusCount = 0;
    for (const q of questions) {
      const statuses = Object.values(q.modelAnswers).map((m) => m.isCorrect);
      const allAgree = statuses.every((s) => s === statuses[0]);
      if (allAgree) consensusCount++;
    }
    const consensusScore =
      questions.length > 0
        ? parseFloat(((consensusCount / questions.length) * 100).toFixed(1))
        : 100;

    // Summarize models
    const models = runs.map((r) => {
      const topicAccuracies: Record<string, number> = {};
      for (const t of r.topicBreakdown) {
        topicAccuracies[t.topic] = t.accuracy;
      }

      return {
        modelId: r.modelId,
        modelName: r.modelId,
        provider: r.modelId.includes("gemini")
          ? "google"
          : r.modelId.includes("claude")
          ? "anthropic"
          : "custom",
        accuracy: r.accuracy,
        correctAnswers: r.correctAnswers,
        incorrectAnswers: r.incorrectAnswers,
        invalidResponses: r.invalidResponses,
        failedRequests: r.failedRequests,
        avgLatencyMs: r.avgResponseTimeMs,
        topicAccuracies,
      };
    });

    // Rank models by accuracy desc, latency asc
    const sorted = [...models].sort((a, b) => {
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return a.avgLatencyMs - b.avgLatencyMs;
    });

    return {
      comparisonId: `gsm8k_cmp_${Date.now()}`,
      datasetId: firstRun.datasetId,
      questionCount: questions.length,
      timestamp: new Date().toISOString(),
      models,
      consensusScore,
      bestModelId: sorted[0]?.modelId || modelIds[0],
      questions,
    };
  }
}

export const gsm8kModelComparator = Gsm8kModelComparator.getInstance();
