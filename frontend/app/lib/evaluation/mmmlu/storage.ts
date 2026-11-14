/**
 * TATTVA AI - MMMLU Evaluation Run Storage & History Persistence
 * Persists benchmark results with filesystem vault and Supabase RLS compatibility
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import fs from "fs";
import path from "path";
import { EvaluationRunSummary } from "./types";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export class EvaluationStorage {
  private static instance: EvaluationStorage;
  private vaultDir: string;
  private supabase: any = null;

  public static getInstance(): EvaluationStorage {
    if (!EvaluationStorage.instance) {
      EvaluationStorage.instance = new EvaluationStorage();
    }
    return EvaluationStorage.instance;
  }

  constructor() {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    this.vaultDir = isServerless
      ? path.join("/tmp", ".tattva-vault", "evaluations")
      : path.join(process.cwd(), ".tattva-vault", "evaluations");

    this.ensureVaultDir();
    this.initSupabase();
  }

  private initSupabase() {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (url && key) {
        this.supabase = createSupabaseClient(url, key);
      }
    } catch (err) {
      console.warn("[EvaluationStorage] Supabase client initialization bypassed:", err);
    }
  }

  private ensureVaultDir() {
    try {
      if (!fs.existsSync(this.vaultDir)) {
        fs.mkdirSync(this.vaultDir, { recursive: true });
      }
    } catch (err) {
      console.warn("[EvaluationStorage] Failed to create vault directory:", err);
    }
  }

  /**
   * Saves an evaluation run summary to secure local vault & mirrors to Supabase when available
   */
  public async saveRun(summary: EvaluationRunSummary): Promise<void> {
    this.ensureVaultDir();
    const filePath = path.join(this.vaultDir, `${summary.id}.json`);
    const jsonStr = JSON.stringify(summary, null, 2);
    fs.writeFileSync(filePath, jsonStr, { encoding: "utf8" });

    // Asynchronous Supabase persistence with RLS support
    if (this.supabase) {
      try {
        const { error: runErr } = await this.supabase.from("evaluation_runs").upsert({
          id: summary.id,
          user_id: summary.userId || null,
          dataset_name: summary.datasetName,
          dataset_version: summary.datasetVersion,
          language: summary.language || "hi-IN",
          provider: summary.provider,
          model: summary.model,
          status: summary.status || "completed",
          total_questions: summary.totalQuestions,
          attempted_questions: summary.attemptedQuestions,
          valid_attempts: summary.validAttempts,
          correct_answers: summary.correctAnswers,
          incorrect_answers: summary.incorrectAnswers,
          invalid_responses: summary.invalidResponses,
          failed_requests: summary.failedRequests,
          accuracy: summary.accuracy,
          raw_accuracy: summary.rawAccuracy,
          average_response_time_ms: summary.averageResponseTimeMs || 0,
          total_duration_ms: summary.durationMs,
          subject_accuracy: summary.subjectAccuracy,
          selected_question_ids: summary.selectedQuestionIds,
          seed: summary.seed ?? null,
          created_at: summary.createdAt,
          completed_at: summary.completedAt || new Date().toISOString(),
        });

        if (runErr) {
          console.warn("[EvaluationStorage] Supabase evaluation_runs insert notice:", runErr.message);
        } else if (summary.results && summary.results.length > 0) {
          const resultRows = summary.results.map((r) => ({
            run_id: summary.id,
            question_id: r.questionId,
            subject: r.subject,
            question: r.question,
            options: r.options,
            expected_answer: r.expectedAnswer,
            ai_answer: r.aiAnswer,
            explanation: r.explanation || null,
            raw_response: r.rawResponse || null,
            is_correct: r.isCorrect,
            status: r.status,
            response_time_ms: r.latencyMs || 0,
            error: r.error || null,
          }));

          const { error: resErr } = await this.supabase
            .from("evaluation_results")
            .insert(resultRows);

          if (resErr) {
            console.warn("[EvaluationStorage] Supabase evaluation_results insert notice:", resErr.message);
          }
        }
      } catch (dbErr) {
        console.warn("[EvaluationStorage] Supabase synchronization skipped:", dbErr);
      }
    }
  }

  /**
   * Retrieves all evaluation runs (metadata and summaries without full results array for speed)
   */
  public async listRuns(): Promise<Array<Omit<EvaluationRunSummary, "results">>> {
    this.ensureVaultDir();
    try {
      const files = fs.readdirSync(this.vaultDir).filter((f) => f.endsWith(".json"));
      const summaries: Array<Omit<EvaluationRunSummary, "results">> = [];

      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(this.vaultDir, file), "utf8");
          const data: EvaluationRunSummary = JSON.parse(content);
          // Omit results for lightweight listing
          const { results, ...lightweight } = data;
          summaries.push(lightweight);
        } catch {
          // Ignore corrupted files
        }
      }

      // Sort by creation date descending
      return summaries.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch {
      return [];
    }
  }

  /**
   * Retrieves a specific evaluation run with complete question-by-question results
   */
  public async getRun(runId: string): Promise<EvaluationRunSummary | null> {
    this.ensureVaultDir();
    const filePath = path.join(this.vaultDir, `${runId}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, "utf8");
      return JSON.parse(content) as EvaluationRunSummary;
    } catch {
      return null;
    }
  }

  /**
   * Deletes an evaluation run
   */
  public async deleteRun(runId: string): Promise<boolean> {
    this.ensureVaultDir();
    const filePath = path.join(this.vaultDir, `${runId}.json`);
    let deleted = false;
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        deleted = true;
      } catch {
        deleted = false;
      }
    }

    if (this.supabase) {
      try {
        await this.supabase.from("evaluation_runs").delete().eq("id", runId);
      } catch {
        // ignore db error
      }
    }

    return deleted;
  }
}

export const evaluationStorage = EvaluationStorage.getInstance();
