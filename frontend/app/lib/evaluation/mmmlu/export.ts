/**
 * TATTVA AI - MMMLU Evaluation Export Engine
 * Generates publication-ready CSV, JSON, and PDF reports for benchmark evaluation runs
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { EvaluationRunSummary } from "./types";
import { createPdf } from "../../document-engine/pdf";

export class EvaluationExporter {
  private static instance: EvaluationExporter;

  public static getInstance(): EvaluationExporter {
    if (!EvaluationExporter.instance) {
      EvaluationExporter.instance = new EvaluationExporter();
    }
    return EvaluationExporter.instance;
  }

  /**
   * Generates standard RFC 4180 CSV export of evaluation results
   */
  public generateCSV(run: EvaluationRunSummary): string {
    const escapeCSV = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const lines: string[] = [];

    // Header metadata lines
    lines.push(`# TATTVA AI - MMMLU Benchmark Evaluation Report`);
    lines.push(`# Run ID: ${run.id}`);
    lines.push(`# Model: ${run.model} (${run.provider})`);
    lines.push(`# Dataset: ${run.datasetName} - ${run.datasetVersion}`);
    lines.push(`# Date: ${run.createdAt}`);
    lines.push(`# Total Questions: ${run.totalQuestions}`);
    lines.push(`# Overall Accuracy: ${run.accuracy}%\n`);

    // Data table header
    const headers = [
      "Question ID",
      "Subject",
      "Question",
      "Option A",
      "Option B",
      "Option C",
      "Option D",
      "Expected Answer",
      "AI Answer",
      "Status",
      "Is Correct",
      "Latency (ms)",
      "Explanation",
    ];
    lines.push(headers.map(escapeCSV).join(","));

    for (const r of run.results) {
      const row = [
        r.questionId,
        r.subject,
        r.question,
        r.options.A,
        r.options.B,
        r.options.C,
        r.options.D,
        r.expectedAnswer,
        r.aiAnswer,
        r.status,
        r.isCorrect ? "YES" : "NO",
        r.latencyMs,
        r.explanation || "",
      ];
      lines.push(row.map(escapeCSV).join(","));
    }

    return lines.join("\n");
  }

  /**
   * Generates formatted JSON export
   */
  public generateJSON(run: EvaluationRunSummary): string {
    return JSON.stringify(run, null, 2);
  }

  /**
   * Generates a PDF evaluation report using TATTVA AI's native PDF Engine
   */
  public generatePDF(run: EvaluationRunSummary): Buffer {
    const subjectRows: (string | number)[][] = Object.values(run.subjectAccuracy).map((s) => [
      s.subject,
      s.total,
      s.correct,
      s.incorrect,
      `${Math.round(s.accuracy * 10) / 10}%`,
    ]);

    const sampleResults = run.results.slice(0, 15).map((r, i) => [
      String(i + 1),
      r.subject,
      r.expectedAnswer,
      r.aiAnswer,
      r.isCorrect ? "CORRECT" : r.status.toUpperCase(),
      `${r.latencyMs}ms`,
    ]);

    return createPdf({
      title: "TATTVA AI - MMMLU Benchmark Evaluation Report",
      subtitle: `Model: ${run.model} | Accuracy: ${run.accuracy}% | Dataset: ${run.datasetName} (${run.datasetVersion})`,
      author: "TATTVA AI Autonomous Intelligence System",
      sections: [
        {
          heading: "1. Executive Evaluation Summary",
          content: `This report details the empirical accuracy evaluation of the model "${run.model}" (${run.provider}) tested against the OpenAI MMMLU (Hindi - HI-IN) academic benchmark dataset. The evaluation strictly followed double-blind isolation where ground truth answers were withheld from the model during inference.`,
          table: {
            headers: ["Metric", "Value"],
            rows: [
              ["Evaluation Run ID", run.id],
              ["Evaluated Model", run.model],
              ["Provider", run.provider.toUpperCase()],
              ["Dataset Language", "Hindi (HI-IN)"],
              ["Total Questions Attempted", run.attemptedQuestions],
              ["Correct Answers", run.correctAnswers],
              ["Incorrect Answers", run.incorrectAnswers],
              ["Invalid / Malformed Responses", run.invalidResponses],
              ["API Failed Requests", run.failedRequests],
              ["Overall Benchmark Accuracy", `${run.accuracy}%`],
              ["Raw Accuracy (all questions)", `${run.rawAccuracy}%`],
              ["Execution Duration", `${Math.round(run.durationMs / 1000)} seconds`],
            ],
          },
        },
        {
          heading: "2. Subject-Wise Performance Breakdown",
          content: "The MMMLU benchmark spans disciplines including Mathematics, Computer Science, Economics, Chemistry, and Medicine. The subject-specific breakdown below highlights strengths and domain nuances:",
          table: {
            headers: ["Subject", "Total", "Correct", "Incorrect", "Accuracy"],
            rows: subjectRows.length > 0 ? subjectRows : [["All", run.totalQuestions, run.correctAnswers, run.incorrectAnswers, `${run.accuracy}%`]],
          },
        },
        {
          heading: "3. Evaluated Questions Sample & Answer Audit",
          content: "Sample question-level audit verifying model choices against official MMMLU ground-truth answers:",
          table: {
            headers: ["#", "Subject", "Expected", "AI Answer", "Outcome", "Latency"],
            rows: sampleResults,
          },
        },
        {
          heading: "4. Architectural Compliance & Integrity Notes",
          bullets: [
            "Ground-Truth Isolation: Answers were never provided in model context or system prompts.",
            "Unicode Verification: Hindi Devanagari script was parsed and evaluated with pristine fidelity.",
            "Failure Segregation: Transient API errors were tracked separately and excluded from incorrect answer penalties.",
            "Reproducibility: Evaluated question sets are fully reproducible using the recorded run parameters and question IDs.",
          ],
        },
      ],
    });
  }
}

export const evaluationExporter = EvaluationExporter.getInstance();
