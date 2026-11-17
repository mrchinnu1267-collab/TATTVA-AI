/**
 * TATTVA AI - Self-Improvement & Verified Experience Engine
 * Records verified solutions, maintains benchmark datasets, and reinforces successful reasoning
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import fs from "fs";
import path from "path";
import { ExperienceRecord, ExperienceStatus, TaskIntent } from "./types";
import { cosineSimilarity, generateTextEmbedding } from "../embeddings";

const DATA_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", ".tattva_memory_data")
    : path.join(process.cwd(), ".tattva_memory_data");
const EXPERIENCE_FILE = path.join(DATA_DIR, "experience_knowledge.json");

function ensureExperienceDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // ignore
  }
}

export class ExperienceEngine {
  private static instance: ExperienceEngine;
  private records: ExperienceRecord[] = [];

  private constructor() {
    this.loadRecords();
  }

  public static getInstance(): ExperienceEngine {
    if (!ExperienceEngine.instance) {
      ExperienceEngine.instance = new ExperienceEngine();
    }
    return ExperienceEngine.instance;
  }

  private loadRecords() {
    try {
      ensureExperienceDir();
      if (fs.existsSync(EXPERIENCE_FILE)) {
        const raw = fs.readFileSync(EXPERIENCE_FILE, "utf-8");
        this.records = JSON.parse(raw);
      }
    } catch {
      this.records = [];
    }
  }

  private saveRecords() {
    try {
      ensureExperienceDir();
      fs.writeFileSync(EXPERIENCE_FILE, JSON.stringify(this.records, null, 2), "utf-8");
    } catch {
      // ignore
    }
  }

  /**
   * Records a problem-solving attempt with verification results and strict user/workspace isolation
   */
  public async recordExperience(entry: {
    userId?: string;
    workspaceId?: string;
    isPublic?: boolean;
    taskType: TaskIntent;
    problemStatement: string;
    attemptedSolution: string;
    passedVerification: boolean;
    testResults?: string;
    humanRating?: "positive" | "negative";
    keyLearnings?: string[];
  }): Promise<ExperienceRecord> {
    const status: ExperienceStatus = entry.humanRating === "positive"
      ? "human_approved"
      : entry.passedVerification
      ? "verified"
      : "failed";

    const record: ExperienceRecord = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: entry.userId,
      workspaceId: entry.workspaceId,
      isPublic: Boolean(entry.isPublic),
      taskType: entry.taskType,
      problemStatement: entry.problemStatement,
      attemptedSolution: entry.attemptedSolution,
      verificationOutcome: {
        passed: entry.passedVerification,
        testResults: entry.testResults,
      },
      humanRating: entry.humanRating,
      status,
      keyLearnings: entry.keyLearnings || [],
      createdAt: Date.now(),
    };

    this.records.push(record);
    this.saveRecords();
    return record;
  }

  /**
   * Retrieves relevant verified problem-solving cases to guide reasoning,
   * strictly enforcing multi-tenant user and workspace boundary isolation.
   */
  public async retrieveRelevantExperiences(
    problemStatement: string,
    taskType?: TaskIntent,
    limit: number = 3,
    filter?: { userId?: string; workspaceId?: string }
  ): Promise<ExperienceRecord[]> {
    // Filter only verified or human_approved experiences belonging strictly to this user/workspace or system public
    const candidates = this.records.filter((r) => {
      if (r.status !== "verified" && r.status !== "human_approved") return false;
      if (taskType && r.taskType !== taskType) return false;

      // Public / system experiences are universally accessible
      if (r.isPublic || (!r.userId && !r.workspaceId)) return true;

      // Workspace match
      if (filter?.workspaceId && r.workspaceId && r.workspaceId === filter.workspaceId) {
        return true;
      }

      // User match
      if (filter?.userId && r.userId && r.userId === filter.userId) {
        return true;
      }

      // Deny access if owned by a different user/workspace
      return false;
    });

    if (candidates.length === 0) return [];

    try {
      const queryEmb = await generateTextEmbedding(problemStatement);
      if (!queryEmb) {
        const queryTerms = problemStatement.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
        const scored = candidates.map((rec) => {
          const recText = (rec.problemStatement + " " + rec.attemptedSolution).toLowerCase();
          const matchCount = queryTerms.filter((term) => recText.includes(term)).length;
          return { rec, score: matchCount };
        });
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, limit).map((s) => s.rec);
      }

      const scored: Array<{ record: ExperienceRecord; score: number }> = [];

      for (const rec of candidates) {
        const recEmb = await generateTextEmbedding(rec.problemStatement);
        const sim = recEmb ? cosineSimilarity(queryEmb, recEmb) : 0.5;
        scored.push({ record: rec, score: sim });
      }

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit).map((s) => s.record);
    } catch {
      // Fallback: simple text keyword match
      const queryTerms = problemStatement.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
      const scored = candidates.map((rec) => {
        const recText = (rec.problemStatement + " " + rec.attemptedSolution).toLowerCase();
        const matchCount = queryTerms.filter((term) => recText.includes(term)).length;
        return { rec, score: matchCount };
      });
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit).map((s) => s.rec);
    }
  }

  /**
   * Exports high-quality verified dataset in standard JSONL format
   */
  public exportDatasetJSONL(): string {
    const approved = this.records.filter(
      (r) => r.status === "verified" || r.status === "human_approved"
    );

    return approved
      .map((r) =>
        JSON.stringify({
          instruction: `Task (${r.taskType}): ${r.problemStatement}`,
          input: "",
          output: r.attemptedSolution,
          metadata: {
            status: r.status,
            humanRating: r.humanRating,
            keyLearnings: r.keyLearnings,
          },
        })
      )
      .join("\n");
  }

  public getSummaryStats() {
    return {
      total: this.records.length,
      humanApproved: this.records.filter((r) => r.status === "human_approved").length,
      verified: this.records.filter((r) => r.status === "verified").length,
      failed: this.records.filter((r) => r.status === "failed").length,
      unverified: this.records.filter((r) => r.status === "unverified").length,
    };
  }
}

export const experienceEngine = ExperienceEngine.getInstance();
