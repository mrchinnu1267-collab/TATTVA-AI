/**
 * TATTVA AI - Advanced Model Comparison & Arena Engine
 * Fair side-by-side benchmarking on identical question sets with identical seeds
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import fs from "fs";
import path from "path";
import {
  ModelComparisonConfig,
  ModelComparisonReport,
  ModelComparisonModelScore,
  QuestionComparisonDelta,
} from "./types";
import { mmmluEvaluator } from "../mmmlu/evaluator";
import { evaluationStorage } from "../mmmlu/storage";
import { EvaluationRunSummary } from "../mmmlu/types";

export class ModelComparator {
  private static instance: ModelComparator;
  private vaultDir: string;

  public static getInstance(): ModelComparator {
    if (!ModelComparator.instance) {
      ModelComparator.instance = new ModelComparator();
    }
    return ModelComparator.instance;
  }

  constructor() {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    this.vaultDir = isServerless
      ? path.join("/tmp", ".tattva-vault", "comparisons")
      : path.join(process.cwd(), ".tattva-vault", "comparisons");

    this.ensureVaultDir();
  }

  private ensureVaultDir() {
    try {
      if (!fs.existsSync(this.vaultDir)) {
        fs.mkdirSync(this.vaultDir, { recursive: true });
      }
    } catch (err) {
      console.warn("[ModelComparator] Failed to create comparisons vault:", err);
    }
  }

  /**
   * Executes fair comparison across 2 or more configured models on identical questions
   */
  public async executeComparison(
    config: ModelComparisonConfig,
    options?: {
      onProgress?: (modelName: string, progress: any) => void;
      mockHandlers?: Record<string, (prompt: string, q: any) => Promise<{ text: string }>>;
    }
  ): Promise<ModelComparisonReport> {
    const comparisonId = `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const startTime = Date.now();

    if (!config.targets || config.targets.length < 1) {
      throw new Error("Model comparison requires at least 1 target model.");
    }

    const runs: EvaluationRunSummary[] = [];

    // Evaluate each model sequentially or with controlled concurrency
    for (const target of config.targets) {
      const runId = `${comparisonId}_${target.provider}_${target.model.replace(/[^a-zA-Z0-9]/g, "-")}`;
      const mockHandler = options?.mockHandlers?.[`${target.provider}:${target.model}`] || options?.mockHandlers?.[target.model];

      const runSummary = await mmmluEvaluator.runEvaluation(
        {
          provider: target.provider,
          model: target.model,
          sampleSize: config.sampleSize as any,
          subject: config.subject,
          concurrency: config.concurrency || 2,
          seed: config.seed, // CRITICAL: Fair benchmark requires identical PRNG seed
          dataset: config.datasetId?.includes("full") ? "full" : "sample",
        },
        {
          runId,
          mockHandler,
          onProgress: (p) => {
            if (options?.onProgress) {
              options.onProgress(target.model, p);
            }
          },
        }
      );

      // Persist run
      await evaluationStorage.saveRun(runSummary);
      runs.push(runSummary);
    }

    // Build question comparison deltas
    const questionDeltas: QuestionComparisonDelta[] = [];
    const firstRun = runs[0];

    for (let i = 0; i < firstRun.results.length; i++) {
      const baseResult = firstRun.results[i];
      const modelAnswers: Record<string, any> = {};
      const answerCounts: Record<string, number> = {};

      for (const run of runs) {
        const matchingResult = run.results.find((r) => r.questionId === baseResult.questionId) || run.results[i];
        if (matchingResult) {
          modelAnswers[`${run.provider}:${run.model}`] = {
            aiAnswer: matchingResult.aiAnswer,
            isCorrect: matchingResult.isCorrect,
            latencyMs: matchingResult.latencyMs,
            explanation: matchingResult.explanation,
            status: matchingResult.status,
          };
          if (matchingResult.aiAnswer && matchingResult.aiAnswer !== "INVALID" && matchingResult.aiAnswer !== "ERROR") {
            answerCounts[matchingResult.aiAnswer] = (answerCounts[matchingResult.aiAnswer] || 0) + 1;
          }
        }
      }

      // Find consensus
      let consensusAnswer: string | undefined = undefined;
      let maxVotes = 0;
      for (const [ans, votes] of Object.entries(answerCounts)) {
        if (votes > maxVotes) {
          maxVotes = votes;
          consensusAnswer = ans;
        }
      }

      const answersArr = Object.values(modelAnswers).map((m) => m.aiAnswer);
      const unanimousAgreement = answersArr.length > 0 && answersArr.every((a) => a === answersArr[0]);

      questionDeltas.push({
        questionId: baseResult.questionId,
        question: baseResult.question,
        subject: baseResult.subject,
        expectedAnswer: baseResult.expectedAnswer,
        modelAnswers,
        consensusAnswer,
        unanimousAgreement,
      });
    }

    // Model scores
    const modelScores: ModelComparisonModelScore[] = runs.map((run) => {
      // Calculate consensus agreement rate
      let agreedCount = 0;
      for (const delta of questionDeltas) {
        const myAns = delta.modelAnswers[`${run.provider}:${run.model}`]?.aiAnswer;
        if (myAns && delta.consensusAnswer && myAns === delta.consensusAnswer) {
          agreedCount++;
        }
      }
      const consistencyScore = questionDeltas.length > 0 ? Number(((agreedCount / questionDeltas.length) * 100).toFixed(2)) : 0;

      return {
        provider: run.provider,
        model: run.model,
        runId: run.id,
        accuracy: run.accuracy,
        rawAccuracy: run.rawAccuracy,
        averageResponseTimeMs: run.averageResponseTimeMs || 0,
        totalDurationMs: run.durationMs,
        totalQuestions: run.totalQuestions,
        correctAnswers: run.correctAnswers,
        incorrectAnswers: run.incorrectAnswers,
        invalidResponses: run.invalidResponses,
        failedRequests: run.failedRequests,
        subjectAccuracy: run.subjectAccuracy,
        consistencyScore,
      };
    });

    // Determine top model
    let topScore = -1;
    let lowestLatency = Infinity;
    let winner: any = undefined;

    for (const m of modelScores) {
      if (m.accuracy > topScore || (m.accuracy === topScore && m.averageResponseTimeMs < lowestLatency)) {
        topScore = m.accuracy;
        lowestLatency = m.averageResponseTimeMs;
        winner = {
          model: m.model,
          provider: m.provider,
          accuracy: m.accuracy,
          avgLatencyMs: m.averageResponseTimeMs,
          reason: `Highest accuracy (${m.accuracy}%) with ${m.averageResponseTimeMs}ms average response latency.`,
        };
      }
    }

    const report: ModelComparisonReport = {
      id: comparisonId,
      title: config.comparisonName || `Benchmark Arena (${config.targets.map((t) => t.model).join(" vs ")})`,
      createdAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      datasetName: firstRun.datasetName,
      datasetVersion: firstRun.datasetVersion,
      language: firstRun.language,
      sampleSize: config.sampleSize,
      seed: config.seed,
      fairBenchmarkConditionMet: true,
      models: modelScores,
      questionDeltas,
      winnerModel: winner,
    };

    this.saveReport(report);
    return report;
  }

  public saveReport(report: ModelComparisonReport): void {
    this.ensureVaultDir();
    const filePath = path.join(this.vaultDir, `${report.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf8");
  }

  public listComparisons(): Array<Omit<ModelComparisonReport, "questionDeltas">> {
    this.ensureVaultDir();
    try {
      const files = fs.readdirSync(this.vaultDir).filter((f) => f.endsWith(".json"));
      const list: any[] = [];
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(this.vaultDir, file), "utf8");
          const { questionDeltas, ...summary } = JSON.parse(raw);
          list.push(summary);
        } catch {
          // ignore corrupted
        }
      }
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }

  public getComparisonById(id: string): ModelComparisonReport | null {
    this.ensureVaultDir();
    const filePath = path.join(this.vaultDir, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      return null;
    }
  }
}

export const modelComparator = ModelComparator.getInstance();
