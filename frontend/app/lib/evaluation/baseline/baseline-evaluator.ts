/**
 * TATTVA AI - Master Baseline Evaluator Engine
 * Phase 14 Architecture: Multi-category empirical intelligence baseline evaluator
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import fs from "fs";
import path from "path";
import {
  BaselineCategory,
  BaselineModelResult,
  BaselineComparisonReport,
  CategoryEvaluationScore,
  BaselineQuestion,
} from "./types";
import { BASELINE_EVALUATION_QUESTIONS } from "./baseline-dataset";
import { modelRouter } from "../../ai-orchestrator/model-router";
import { ModelProvider } from "../../ai-orchestrator/types";

export class BaselineEvaluator {
  private static instance: BaselineEvaluator;
  private vaultDir: string;

  public static getInstance(): BaselineEvaluator {
    if (!BaselineEvaluator.instance) {
      BaselineEvaluator.instance = new BaselineEvaluator();
    }
    return BaselineEvaluator.instance;
  }

  constructor() {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    this.vaultDir = isServerless
      ? path.join("/tmp", ".tattva-vault", "baseline")
      : path.join(process.cwd(), ".tattva-vault", "baseline");
    this.ensureVaultDir();
  }

  private ensureVaultDir() {
    try {
      if (!fs.existsSync(this.vaultDir)) {
        fs.mkdirSync(this.vaultDir, { recursive: true });
      }
    } catch (err) {
      console.warn("[BaselineEvaluator] Vault directory init notice:", err);
    }
  }

  /**
   * Evaluates a single model across all 12 baseline categories
   */
  public async evaluateModel(
    provider: ModelProvider,
    modelId: string,
    options?: {
      mockHandler?: (q: BaselineQuestion) => Promise<{ text: string; latencyMs?: number }>;
      questions?: BaselineQuestion[];
    }
  ): Promise<BaselineModelResult> {
    const startTime = Date.now();
    const questions = options?.questions || BASELINE_EVALUATION_QUESTIONS;
    const detailedResults: BaselineModelResult["detailedResults"] = [];

    const categoryMap: Record<
      BaselineCategory,
      { total: number; passed: number; partial: number; failed: number; latencies: number[]; hallucinations: number }
    > = {
      general_knowledge: { total: 0, passed: 0, partial: 0, failed: 0, latencies: [], hallucinations: 0 },
      logical_reasoning: { total: 0, passed: 0, partial: 0, failed: 0, latencies: [], hallucinations: 0 },
      mathematical_reasoning: { total: 0, passed: 0, partial: 0, failed: 0, latencies: [], hallucinations: 0 },
      instruction_following: { total: 0, passed: 0, partial: 0, failed: 0, latencies: [], hallucinations: 0 },
      prompt_understanding: { total: 0, passed: 0, partial: 0, failed: 0, latencies: [], hallucinations: 0 },
      conversational_capability: { total: 0, passed: 0, partial: 0, failed: 0, latencies: [], hallucinations: 0 },
      coding: { total: 0, passed: 0, partial: 0, failed: 0, latencies: [], hallucinations: 0 },
      context_retention: { total: 0, passed: 0, partial: 0, failed: 0, latencies: [], hallucinations: 0 },
      multilingual_understanding: { total: 0, passed: 0, partial: 0, failed: 0, latencies: [], hallucinations: 0 },
      tool_usage: { total: 0, passed: 0, partial: 0, failed: 0, latencies: [], hallucinations: 0 },
      document_understanding: { total: 0, passed: 0, partial: 0, failed: 0, latencies: [], hallucinations: 0 },
      retrieval_accuracy: { total: 0, passed: 0, partial: 0, failed: 0, latencies: [], hallucinations: 0 },
    };

    for (const q of questions) {
      const qStart = Date.now();
      let responseText = "";
      let latencyMs = 0;

      try {
        if (options?.mockHandler) {
          const res = await options.mockHandler(q);
          responseText = res.text;
          latencyMs = res.latencyMs || Date.now() - qStart;
        } else {
          const messages = q.conversationHistory ? [...q.conversationHistory] : [];
          const userPrompt = q.context ? `CONTEXT:\n${q.context}\n\nQUESTION: ${q.prompt}` : q.prompt;
          messages.push({ role: "user", content: userPrompt });

          const res = await modelRouter.executeWithFallback("reasoning", 5, {
            messages,
            preferredProvider: provider,
            preferredModel: modelId,
            temperature: 0.1,
            timeoutMs: 30000,
          });
          responseText = res.text;
          latencyMs = Date.now() - qStart;
        }
      } catch (err: any) {
        responseText = `ERROR: ${err.message || String(err)}`;
        latencyMs = Date.now() - qStart;
      }

      // Objective Rubric Scoring
      const { score, isPass, isHallucination, feedback } = this.gradeResponse(q, responseText);
      const catStats = categoryMap[q.category];
      catStats.total++;
      catStats.latencies.push(latencyMs);

      if (isHallucination) catStats.hallucinations++;

      if (score >= 80) catStats.passed++;
      else if (score >= 40) catStats.partial++;
      else catStats.failed++;

      detailedResults.push({
        questionId: q.id,
        category: q.category,
        prompt: q.prompt,
        response: responseText,
        score,
        isPass,
        isHallucination,
        latencyMs,
        feedback,
      });
    }

    const totalQuestions = questions.length;
    const passedQuestions = detailedResults.filter((r) => r.isPass).length;
    const overallAccuracy = totalQuestions > 0 ? Math.round((passedQuestions / totalQuestions) * 100) : 0;
    const totalScore = detailedResults.reduce((acc, r) => acc + r.score, 0);
    const overallScore = totalQuestions > 0 ? Math.round(totalScore / totalQuestions) : 0;
    const avgLatency =
      detailedResults.length > 0
        ? Math.round(detailedResults.reduce((acc, r) => acc + r.latencyMs, 0) / detailedResults.length)
        : 0;

    const categoryScores = {} as Record<BaselineCategory, CategoryEvaluationScore>;
    for (const [cat, stats] of Object.entries(categoryMap) as Array<[BaselineCategory, any]>) {
      const catPassed = stats.passed;
      const catTotal = stats.total || 1;
      const catScore = Math.round((catPassed / catTotal) * 100);
      const catAvgLatency =
        stats.latencies.length > 0
          ? Math.round(stats.latencies.reduce((a: number, b: number) => a + b, 0) / stats.latencies.length)
          : 0;
      const hallucinationRate = Math.round((stats.hallucinations / catTotal) * 100);

      categoryScores[cat] = {
        category: cat,
        totalQuestions: stats.total,
        passedQuestions: stats.passed,
        partialQuestions: stats.partial,
        failedQuestions: stats.failed,
        scorePercentage: catScore,
        averageLatencyMs: catAvgLatency,
        hallucinationRatePercentage: hallucinationRate,
        notes: `${catPassed}/${stats.total} passed (${catScore}%) with ${catAvgLatency}ms avg latency.`,
      };
    }

    // Estimate cost based on rough token count (~250 tokens per question)
    const totalTokensEst = totalQuestions * 300;
    const costEstimateUsd = Number(((totalTokensEst / 1000000) * 0.5).toFixed(4));

    const result: BaselineModelResult = {
      modelId,
      provider,
      evaluatedAt: new Date().toISOString(),
      totalDurationMs: Date.now() - startTime,
      overallScore,
      overallAccuracy,
      averageLatencyMs: avgLatency,
      totalCostEstimateUsd: costEstimateUsd,
      categoryScores,
      detailedResults,
    };

    return result;
  }

  /**
   * Objective Rubric Grader
   */
  private gradeResponse(
    q: BaselineQuestion,
    response: string
  ): { score: number; isPass: boolean; isHallucination: boolean; feedback: string } {
    let score = 100;
    const feedbackList: string[] = [];
    const rubric = q.evaluationRubric;
    const cleanLower = response.toLowerCase();

    // Check 1: Negative keywords check
    if (rubric.negativeKeywords) {
      for (const neg of rubric.negativeKeywords) {
        if (cleanLower.includes(neg.toLowerCase())) {
          score -= 40;
          feedbackList.push(`Violated negative constraint: contains '${neg}'`);
        }
      }
    }

    // Check 2: Required keywords check
    if (rubric.requiredKeywords) {
      for (const req of rubric.requiredKeywords) {
        if (!cleanLower.includes(req.toLowerCase())) {
          score -= 35;
          feedbackList.push(`Missing essential keyword: '${req}'`);
        }
      }
    }

    // Check 3: Regex match
    if (rubric.regexMatch) {
      const re = new RegExp(rubric.regexMatch, "i");
      if (!re.test(response)) {
        score -= 30;
        feedbackList.push(`Failed regex criteria: /${rubric.regexMatch}/`);
      }
    }

    // Check 4: Length constraints
    if (rubric.minResponseLength && response.length < rubric.minResponseLength) {
      score -= 25;
      feedbackList.push(`Response too short (< ${rubric.minResponseLength} chars)`);
    }

    // Check 5: Hallucination risk check
    let isHallucination = false;
    if (rubric.hallucinationRiskCheck && rubric.hallucinationRiskCheck(response)) {
      isHallucination = true;
      score -= 50;
      feedbackList.push("Hallucination or confabulated entity detected");
    }

    score = Math.max(0, Math.min(100, score));
    const isPass = score >= 70;

    return {
      score,
      isPass,
      isHallucination,
      feedback: feedbackList.length > 0 ? feedbackList.join("; ") : "All rubric criteria satisfied.",
    };
  }

  /**
   * Generates a multi-model comparative baseline report
   */
  public generateComparisonReport(models: BaselineModelResult[]): BaselineComparisonReport {
    const reportId = `baseline_cmp_${Date.now()}`;
    const allCategories: BaselineCategory[] = [
      "general_knowledge",
      "logical_reasoning",
      "mathematical_reasoning",
      "instruction_following",
      "prompt_understanding",
      "conversational_capability",
      "coding",
      "context_retention",
      "multilingual_understanding",
      "tool_usage",
      "document_understanding",
      "retrieval_accuracy",
    ];

    const categoryRankings = {} as Record<BaselineCategory, Array<{ modelId: string; score: number }>>;
    for (const cat of allCategories) {
      categoryRankings[cat] = models
        .map((m) => ({
          modelId: m.modelId,
          score: m.categoryScores[cat]?.scorePercentage || 0,
        }))
        .sort((a, b) => b.score - a.score);
    }

    const summaryStrengthsAndWeaknesses: Record<
      string,
      { strengths: string[]; weaknesses: string[]; recommendation: string }
    > = {};

    for (const m of models) {
      const sortedCats = Object.entries(m.categoryScores).sort(
        (a, b) => b[1].scorePercentage - a[1].scorePercentage
      );
      const top3 = sortedCats.slice(0, 3).map(([c, s]) => `${c} (${s.scorePercentage}%)`);
      const bottom3 = sortedCats.slice(-3).map(([c, s]) => `${c} (${s.scorePercentage}%)`);

      summaryStrengthsAndWeaknesses[m.modelId] = {
        strengths: top3,
        weaknesses: bottom3,
        recommendation:
          m.overallScore >= 80
            ? "Suitable for general high-accuracy reasoning and agentic tasks."
            : "Recommended for lighter latency-sensitive tasks or pair with verification checks.",
      };
    }

    const report: BaselineComparisonReport = {
      id: reportId,
      title: "TATTVA AI 12-Category Foundation Model Performance Baseline",
      createdAt: new Date().toISOString(),
      totalQuestionsEvaluated: BASELINE_EVALUATION_QUESTIONS.length,
      models,
      categoryRankings,
      summaryStrengthsAndWeaknesses,
    };

    this.saveReport(report);
    return report;
  }

  public saveReport(report: BaselineComparisonReport): void {
    this.ensureVaultDir();
    const filePath = path.join(this.vaultDir, `${report.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf8");
  }

  public getReportById(id: string): BaselineComparisonReport | null {
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

export const baselineEvaluator = BaselineEvaluator.getInstance();
