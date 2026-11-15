/**
 * TATTVA AI - GSM8K Mathematical Reasoning Evaluation Engine
 * Orchestrates reproducible benchmark runs, answer extraction, scoring,
 * topic classification, and result persistence.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import fs from "fs";
import path from "path";
import {
  Gsm8kEvalRequest,
  Gsm8kEvalRunSummary,
  Gsm8kQuestionResult,
  Gsm8kQuestionItem,
} from "./types";
import { datasetRegistry } from "../datasets/dataset-registry";
import { parquetDatasetLoader } from "../datasets/parquet-loader";
import { mathAnswerExtractor } from "./math-answer-extractor";
import { mathTopicClassifier } from "./math-topic-classifier";
import { modelRouter } from "../../ai-orchestrator/model-router";

export class Gsm8kEvaluator {
  private static instance: Gsm8kEvaluator;
  private activeRuns: Map<string, { cancelled: boolean }> = new Map();
  private storageFilePath: string;

  private constructor() {
    this.storageFilePath = path.resolve(
      process.cwd(),
      ".tattva_secure_vault",
      "gsm8k_eval_runs.json"
    );
  }

  public static getInstance(): Gsm8kEvaluator {
    if (!Gsm8kEvaluator.instance) {
      Gsm8kEvaluator.instance = new Gsm8kEvaluator();
    }
    return Gsm8kEvaluator.instance;
  }

  /**
   * Mulberry32 deterministic pseudo-random number generator
   */
  private mulberry32(seed: number): () => number {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Executes a mathematical reasoning evaluation run
   */
  public async runEvaluation(request: Gsm8kEvalRequest): Promise<Gsm8kEvalRunSummary> {
    const runId = `gsm8k_run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.activeRuns.set(runId, { cancelled: false });

    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    // 1. Resolve and load the evaluation dataset (protected)
    const datasetId = request.datasetId || "gsm8k-evaluation";
    const meta = datasetRegistry.getDatasetById(datasetId);
    if (!meta) {
      throw new Error(`Dataset '${datasetId}' not found in registry`);
    }

    const root = datasetRegistry.resolveCanonicalDatasetsRoot();
    const filePath = path.join(root, meta.relativePath);

    // Read evaluation records asynchronously
    const rawRecords = await parquetDatasetLoader.readParquetRecords(filePath, datasetId);
    if (rawRecords.length === 0) {
      throw new Error(`Zero records found in evaluation dataset file: ${filePath}`);
    }

    // 2. Select questions with reproducible deterministic sampling
    const count =
      request.questionCount === "all"
        ? rawRecords.length
        : Math.min(Number(request.questionCount) || 10, rawRecords.length);

    const seed = request.seed !== undefined ? request.seed : 42;
    const prng = this.mulberry32(seed);

    // Shuffle using Fisher-Yates with deterministic PRNG
    const indices = Array.from({ length: rawRecords.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const selectedIndices = indices.slice(0, count);
    const selectedRecords = selectedIndices.map((idx) => rawRecords[idx]);

    // 3. Process questions and evaluate
    const questionResults: Gsm8kQuestionResult[] = [];
    let correctCount = 0;
    let incorrectCount = 0;
    let invalidCount = 0;
    let failedCount = 0;
    let totalLatency = 0;

    for (let i = 0; i < selectedRecords.length; i++) {
      if (this.activeRuns.get(runId)?.cancelled) {
        break;
      }

      const rec = selectedRecords[i];
      const questionId = String(rec.id);
      const questionText = rec.question;
      const expectedAns = String(rec.expectedAnswer || "");
      const topic = mathTopicClassifier.classifyQuestion(questionText, rec.metadata?.fullSolution);
      const calculationSteps = rec.metadata?.calculationSteps || [];

      const qStartTime = Date.now();
      let aiRawResponse = "";
      let isFailed = false;
      let errorMessage: string | undefined;

      try {
        if (request.mockInference) {
          // Controlled offline test response generator
          // Generates valid structured JSON response
          aiRawResponse = JSON.stringify({
            answer: expectedAns,
            explanation: `Mock step-by-step reasoning for test question ${i + 1}.`,
          });
        } else {
          // Model invocation prompt with strict instructions
          const prompt = `You are an expert mathematical problem solver.
Solve the following grade-school mathematical word problem step by step.
You must return your final numerical answer as a clean string inside a JSON object:
{"answer": "<final_number>", "explanation": "<step-by-step reasoning>"}

Problem:
${questionText}`;

          // Invoke selected model via ModelRouter
          const callResult = await modelRouter.executeWithFallback("reasoning", 5, {
            messages: [{ role: "user", content: prompt }],
            preferredModel: request.modelId,
            temperature: request.temperature !== undefined ? request.temperature : 0.1,
          });

          aiRawResponse = callResult.text;
        }
      } catch (err: any) {
        isFailed = true;
        errorMessage = err instanceof Error ? err.message : String(err);
        aiRawResponse = "";
      }

      const qLatency = Date.now() - qStartTime;
      totalLatency += qLatency;

      if (isFailed) {
        failedCount++;
        questionResults.push({
          questionId,
          question: questionText,
          expectedAnswer: expectedAns,
          expectedNumericValue: mathAnswerExtractor.normalizeNumericValue(expectedAns),
          aiRawResponse: "",
          aiExtractedAnswer: "",
          aiNumericValue: null,
          explanation: "",
          isCorrect: false,
          isInvalid: true,
          isFailed: true,
          errorMessage,
          latencyMs: qLatency,
          timestamp: new Date().toISOString(),
          topic,
          calculationSteps,
        });
      } else {
        const comparison = mathAnswerExtractor.compareAnswers(expectedAns, aiRawResponse);
        if (comparison.isInvalid) {
          invalidCount++;
        } else if (comparison.isCorrect) {
          correctCount++;
        } else {
          incorrectCount++;
        }

        questionResults.push({
          questionId,
          question: questionText,
          expectedAnswer: expectedAns,
          expectedNumericValue: comparison.expectedNumericValue,
          aiRawResponse,
          aiExtractedAnswer: comparison.extractedAnswer,
          aiNumericValue: comparison.aiNumericValue,
          explanation: comparison.explanation,
          isCorrect: comparison.isCorrect,
          isInvalid: comparison.isInvalid,
          isFailed: false,
          latencyMs: qLatency,
          timestamp: new Date().toISOString(),
          topic,
          calculationSteps,
        });

        console.log(
          `[GSM8K Eval] Q${i + 1}/${selectedRecords.length}: ${comparison.isCorrect ? "CORRECT" : comparison.isInvalid ? "INVALID" : "INCORRECT"} (${qLatency}ms) | Exp: ${expectedAns} | Got: ${comparison.extractedAnswer}`
        );
      }

      if (!request.mockInference && i < selectedRecords.length - 1) {
        await new Promise((r) => setTimeout(r, 2500));
      }
    }

    const completedAt = new Date().toISOString();
    const totalDurationMs = Date.now() - startTime;
    const evaluatedCount = correctCount + incorrectCount;
    const accuracy =
      evaluatedCount > 0 ? parseFloat(((correctCount / evaluatedCount) * 100).toFixed(1)) : 0;
    const validRate =
      questionResults.length > 0
        ? parseFloat((((questionResults.length - invalidCount - failedCount) / questionResults.length) * 100).toFixed(1))
        : 0;

    const topicBreakdown = mathTopicClassifier.computeTopicMetrics(questionResults);
    const recommendations = mathTopicClassifier.generateRecommendations(topicBreakdown);

    const summary: Gsm8kEvalRunSummary = {
      runId,
      modelId: request.modelId,
      datasetId,
      datasetVersion: meta.version || "1.0.0",
      totalQuestions: questionResults.length,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      invalidResponses: invalidCount,
      failedRequests: failedCount,
      accuracy,
      validCompletionRate: validRate,
      avgResponseTimeMs: questionResults.length > 0 ? Math.round(totalLatency / questionResults.length) : 0,
      totalDurationMs,
      startedAt,
      completedAt,
      status: this.activeRuns.get(runId)?.cancelled ? "cancelled" : "completed",
      topicBreakdown,
      questionResults,
      recommendations,
    };

    // 4. Save results to secure local storage
    this.saveRunSummary(summary);
    this.activeRuns.delete(runId);

    return summary;
  }

  /**
   * Cancels an active evaluation run
   */
  public cancelRun(runId: string): boolean {
    const entry = this.activeRuns.get(runId);
    if (entry) {
      entry.cancelled = true;
      return true;
    }
    return false;
  }

  /**
   * Retrieves past evaluation run summaries
   */
  public getHistory(): Gsm8kEvalRunSummary[] {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, "utf8");
        return JSON.parse(raw);
      }
    } catch {
      // Ignore read errors
    }
    return [];
  }

  /**
   * Retrieves single evaluation run by ID
   */
  public getRunById(runId: string): Gsm8kEvalRunSummary | null {
    const history = this.getHistory();
    return history.find((h) => h.runId === runId) || null;
  }

  /**
   * Persists summary to file
   */
  private saveRunSummary(summary: Gsm8kEvalRunSummary): void {
    try {
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const history = this.getHistory();
      // Prepend recent run, keeping up to 100 runs
      const updated = [summary, ...history.filter((h) => h.runId !== summary.runId)].slice(0, 100);
      fs.writeFileSync(this.storageFilePath, JSON.stringify(updated, null, 2), "utf8");
    } catch (err) {
      console.warn("[Gsm8kEvaluator] Failed to persist run summary:", err);
    }
  }
}

export const gsm8kEvaluator = Gsm8kEvaluator.getInstance();
