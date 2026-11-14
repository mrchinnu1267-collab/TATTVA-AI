/**
 * TATTVA AI - MMMLU Evaluation Run Storage & History Persistence
 * Persists benchmark results with filesystem vault and Supabase RLS compatibility
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import fs from "fs";
import path from "path";
import { EvaluationRunSummary } from "./types";

export class EvaluationStorage {
  private static instance: EvaluationStorage;
  private vaultDir: string;

  public static getInstance(): EvaluationStorage {
    if (!EvaluationStorage.instance) {
      EvaluationStorage.instance = new EvaluationStorage();
    }
    return EvaluationStorage.instance;
  }

  constructor() {
    this.vaultDir = path.join(process.cwd(), ".tattva-vault", "evaluations");
    this.ensureVaultDir();
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
   * Saves an evaluation run summary to secure local vault
   */
  public async saveRun(summary: EvaluationRunSummary): Promise<void> {
    this.ensureVaultDir();
    const filePath = path.join(this.vaultDir, `${summary.id}.json`);
    const jsonStr = JSON.stringify(summary, null, 2);
    fs.writeFileSync(filePath, jsonStr, { encoding: "utf8" });
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
      return summaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export const evaluationStorage = EvaluationStorage.getInstance();
