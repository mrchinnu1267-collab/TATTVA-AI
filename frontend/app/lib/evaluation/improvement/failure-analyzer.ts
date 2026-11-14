/**
 * TATTVA AI - AI Failure Analysis & Improvement Engine
 * Analyzes evaluation errors, clusters failure patterns, and manages human-approved improvements
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import fs from "fs";
import path from "path";
import {
  PerformanceAnalysisReport,
  FailureCluster,
  ImprovementRecommendation,
  FailurePatternCategory,
} from "./types";
import { EvaluationRunSummary } from "../mmmlu/types";
import { evaluationStorage } from "../mmmlu/storage";

export class FailureAnalyzer {
  private static instance: FailureAnalyzer;
  private vaultDir: string;

  public static getInstance(): FailureAnalyzer {
    if (!FailureAnalyzer.instance) {
      FailureAnalyzer.instance = new FailureAnalyzer();
    }
    return FailureAnalyzer.instance;
  }

  constructor() {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    this.vaultDir = isServerless
      ? path.join("/tmp", ".tattva-vault", "improvements")
      : path.join(process.cwd(), ".tattva-vault", "improvements");

    this.ensureVaultDir();
  }

  private ensureVaultDir() {
    try {
      if (!fs.existsSync(this.vaultDir)) {
        fs.mkdirSync(this.vaultDir, { recursive: true });
      }
    } catch (err) {
      console.warn("[FailureAnalyzer] Failed to create improvements vault:", err);
    }
  }

  /**
   * Analyzes an evaluation run, clusters weaknesses, and generates actionable recommendations
   */
  public analyzeRun(summary: EvaluationRunSummary): PerformanceAnalysisReport {
    const reportId = `analysis_${summary.id}`;
    const errors = summary.results.filter((r) => !r.isCorrect);
    const totalErrors = errors.length;

    const clusters: FailureCluster[] = [];
    const recommendations: ImprovementRecommendation[] = [];

    if (totalErrors === 0) {
      return {
        id: reportId,
        runId: summary.id,
        model: summary.model,
        provider: summary.provider,
        createdAt: new Date().toISOString(),
        totalErrors: 0,
        clusters: [],
        recommendations: [],
      };
    }

    // 1. Cluster: Malformed Formatting / Invalid Answers
    const invalidItems = errors.filter((r) => r.status === "invalid_response" || r.aiAnswer === "INVALID");
    if (invalidItems.length > 0) {
      const pct = Math.round((invalidItems.length / totalErrors) * 100);
      clusters.push({
        category: "answer_formatting_malformed",
        count: invalidItems.length,
        percentageOfErrors: pct,
        impactScore: pct > 20 ? "high" : "medium",
        affectedSubjects: Array.from(new Set(invalidItems.map((r) => r.subject))),
        exampleQuestionIds: invalidItems.slice(0, 3).map((r) => r.questionId),
        description: `${invalidItems.length} questions failed due to non-standard response formatting or unparseable JSON output.`,
      });

      recommendations.push({
        id: `rec_${Date.now()}_fmt`,
        category: "answer_formatting_malformed",
        title: "Enforce Rigid JSON Response Template & Fallback Regex Heuristics",
        description: `Model ${summary.model} produced ${invalidItems.length} unparseable outputs. System prompt should enforce explicit JSON structure with fallback extraction.`,
        actionableStep: "Inject few-shot JSON format examples into the system prompt and expand regex fallback to detect conversational option affirmations.",
        suggestedPatchArea: "prompt_formatting",
        supportingEvidence: {
          runId: summary.id,
          model: summary.model,
          errorCount: invalidItems.length,
          sampleErrors: invalidItems.slice(0, 3).map((r) => ({
            question: r.question.substring(0, 80),
            expected: r.expectedAnswer,
            actual: String(r.aiAnswer),
          })),
        },
        humanApprovalStatus: "pending_review",
      });
    }

    // 2. Cluster: Subject Knowledge Gaps
    const subjectErrorCounts: Record<string, number> = {};
    for (const err of errors) {
      if (err.status === "incorrect") {
        subjectErrorCounts[err.subject] = (subjectErrorCounts[err.subject] || 0) + 1;
      }
    }

    const weakSubjects = Object.entries(subjectErrorCounts)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, count]) => count >= 2);

    if (weakSubjects.length > 0) {
      const topSubject = weakSubjects[0][0];
      const topCount = weakSubjects[0][1];
      const affected = weakSubjects.map(([s]) => s);

      clusters.push({
        category: "subject_knowledge_gap",
        count: weakSubjects.reduce((acc, curr) => acc + curr[1], 0),
        percentageOfErrors: Math.round(
          (weakSubjects.reduce((acc, curr) => acc + curr[1], 0) / totalErrors) * 100
        ),
        impactScore: "high",
        affectedSubjects: affected,
        exampleQuestionIds: errors
          .filter((r) => affected.includes(r.subject))
          .slice(0, 3)
          .map((r) => r.questionId),
        description: `Identified concentrated academic knowledge gaps in: ${affected.join(", ")}.`,
      });

      recommendations.push({
        id: `rec_${Date.now()}_subj`,
        category: "subject_knowledge_gap",
        title: `Augment Domain RAG Context for '${topSubject}' & Specialized Routing`,
        description: `Model showed ${topCount} incorrect answers in ${topSubject}. Domain context or routing to a higher-capability model is recommended.`,
        actionableStep: `Route questions with subject tags in [${affected.slice(0, 3).join(", ")}] to reasoning-tier models or enrich prompt with verified domain context definitions.`,
        suggestedPatchArea: "model_routing",
        supportingEvidence: {
          runId: summary.id,
          model: summary.model,
          errorCount: topCount,
          sampleErrors: errors
            .filter((r) => r.subject === topSubject)
            .slice(0, 3)
            .map((r) => ({
              question: r.question.substring(0, 80),
              expected: r.expectedAnswer,
              actual: String(r.aiAnswer),
            })),
        },
        humanApprovalStatus: "pending_review",
      });
    }

    const report: PerformanceAnalysisReport = {
      id: reportId,
      runId: summary.id,
      model: summary.model,
      provider: summary.provider,
      createdAt: new Date().toISOString(),
      totalErrors,
      clusters,
      recommendations,
    };

    this.saveAnalysis(report);
    return report;
  }

  /**
   * Updates human approval state for a recommendation (zero automated unvetted production changes)
   */
  public updateRecommendationStatus(
    analysisId: string,
    recommendationId: string,
    status: "approved" | "rejected" | "implemented",
    reviewerName?: string
  ): boolean {
    const analysis = this.getAnalysisById(analysisId);
    if (!analysis) return false;

    const rec = analysis.recommendations.find((r) => r.id === recommendationId);
    if (!rec) return false;

    rec.humanApprovalStatus = status;
    rec.reviewedBy = reviewerName || "Lead AI Engineer";
    rec.reviewedAt = new Date().toISOString();

    if (status === "implemented") {
      rec.implementedAt = new Date().toISOString();
    }

    this.saveAnalysis(analysis);
    return true;
  }

  public saveAnalysis(report: PerformanceAnalysisReport): void {
    this.ensureVaultDir();
    const filePath = path.join(this.vaultDir, `${report.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf8");
  }

  public getAnalysisById(id: string): PerformanceAnalysisReport | null {
    this.ensureVaultDir();
    const filePath = path.join(this.vaultDir, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      return null;
    }
  }

  public listAnalyses(): PerformanceAnalysisReport[] {
    this.ensureVaultDir();
    try {
      const files = fs.readdirSync(this.vaultDir).filter((f) => f.endsWith(".json"));
      const list: PerformanceAnalysisReport[] = [];
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(this.vaultDir, file), "utf8");
          list.push(JSON.parse(raw));
        } catch {
          // ignore
        }
      }
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }
}

export const failureAnalyzer = FailureAnalyzer.getInstance();
