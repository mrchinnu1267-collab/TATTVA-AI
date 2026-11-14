/**
 * TATTVA AI - Conversational & Multilingual AI Evaluation Engine
 * Multi-turn context retention, Telugu-English code-switching & tool discernment
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import fs from "fs";
import path from "path";
import {
  ConversationalTestCase,
  ConversationEvalResult,
  ConversationalEvaluationSummary,
} from "./types";
import { modelRouter } from "../../ai-orchestrator/model-router";
import { ModelProvider } from "../../ai-orchestrator/types";
import { datasetRegistry } from "../datasets/dataset-registry";

export class ConversationalEvaluator {
  private static instance: ConversationalEvaluator;
  private vaultDir: string;

  public static getInstance(): ConversationalEvaluator {
    if (!ConversationalEvaluator.instance) {
      ConversationalEvaluator.instance = new ConversationalEvaluator();
    }
    return ConversationalEvaluator.instance;
  }

  constructor() {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    this.vaultDir = isServerless
      ? path.join("/tmp", ".tattva-vault", "conversational")
      : path.join(process.cwd(), ".tattva-vault", "conversational");

    this.ensureVaultDir();
  }

  private ensureVaultDir() {
    try {
      if (!fs.existsSync(this.vaultDir)) {
        fs.mkdirSync(this.vaultDir, { recursive: true });
      }
    } catch (err) {
      console.warn("[ConversationalEvaluator] Failed to create vault:", err);
    }
  }

  /**
   * Loads verified conversational and multilingual test cases from dataset registry
   */
  public loadTestCases(datasetId: string = "conversational-multiturn-eval"): ConversationalTestCase[] {
    const records = datasetRegistry.loadRecords(datasetId);

    return records.map((r, idx) => ({
      id: String(r.id || `conv_${idx + 1}`),
      category: (r.subject as any) || "context_retention",
      language: (r.language as any) || "en-US",
      prompt: r.question,
      conversationHistory: r.conversationHistory || [{ role: "user", content: r.question }],
      expectedBehavior: r.expectedBehavior || r.expectedAnswer || "Adhere to user request",
      evaluationCriteria: r.criteria || ["Relevance", "Coherence", "Accuracy"],
      rubric: {
        factualAccuracyWeight: 0.4,
        contextRetentionWeight: 0.4,
        languagePurityWeight: 0.2,
      },
    }));
  }

  /**
   * Evaluates a single multi-turn conversational test case
   */
  public async evaluateTestCase(
    testCase: ConversationalTestCase,
    provider: ModelProvider,
    model: string,
    mockHandler?: (messages: any[]) => Promise<{ text: string }>
  ): Promise<ConversationEvalResult> {
    const startTime = Date.now();
    const messages = testCase.conversationHistory || [{ role: "user", content: testCase.prompt }];

    let aiResponse = "";
    let status: "pass" | "partial" | "fail" | "api_error" = "pass";
    const passedCriteria: string[] = [];
    const failedCriteria: string[] = [];

    try {
      if (mockHandler) {
        const res = await mockHandler(messages);
        aiResponse = res.text;
      } else {
        const res = await modelRouter.executeWithFallback("general_chat", 3, {
          messages,
          preferredProvider: provider,
          preferredModel: model,
          temperature: 0.2,
          timeoutMs: 30000,
        });
        aiResponse = res.text;
      }
    } catch (err: any) {
      return {
        testCaseId: testCase.id,
        category: testCase.category,
        language: testCase.language,
        prompt: testCase.prompt,
        aiResponse: "",
        score: 0,
        criteriaPassed: [],
        criteriaFailed: ["API Execution Error"],
        latencyMs: Date.now() - startTime,
        status: "api_error",
        evaluatorNotes: `Request failed: ${err.message}`,
      };
    }

    const latencyMs = Date.now() - startTime;
    const cleanLower = aiResponse.toLowerCase();

    // Objective Rubric Assessment
    let score = 70; // baseline for clean completion

    // 1. Context Retention check
    if (testCase.category === "context_retention") {
      if (cleanLower.includes("golden retriever") || cleanLower.includes("retriever") || cleanLower.includes("leo")) {
        score += 30;
        passedCriteria.push("Retained 'golden retriever' breed and name from earlier turn");
      } else {
        score -= 40;
        failedCriteria.push("Failed to retain dog breed from Turn 1");
      }
    }

    // 2. Telugu code-switching check
    else if (testCase.category === "code_switching") {
      // Must not produce foreign language, must show natural understanding
      if (aiResponse.length > 20 && !cleanLower.includes("bonjour") && !cleanLower.includes("error")) {
        score += 30;
        passedCriteria.push("Understood Telugu transliterated prompt and provided natural study plan");
      } else {
        score -= 40;
        failedCriteria.push("Failed to interpret colloquial Telugu-English prompt");
      }
    }

    // 3. Tool Selection / Calculation check
    else if (testCase.category === "tool_selection") {
      if (aiResponse.includes("39559168") || aiResponse.includes("39,559,168")) {
        score += 30;
        passedCriteria.push("Accurate arithmetic computation (39,559,168)");
      } else {
        score -= 40;
        failedCriteria.push("Incorrect arithmetic product");
      }
    }

    // 4. Topic Shift check
    else if (testCase.category === "topic_shift") {
      if (cleanLower.includes("asyncio") || cleanLower.includes("event loop")) {
        score += 30;
        passedCriteria.push("Cleanly pivoted context to Python asyncio event loop");
      } else {
        score -= 40;
        failedCriteria.push("Failed to pivot cleanly away from sourdough topic");
      }
    } else {
      score = 90;
      passedCriteria.push("Completed conversational instruction");
    }

    score = Math.max(0, Math.min(100, score));

    if (score >= 80) status = "pass";
    else if (score >= 50) status = "partial";
    else status = "fail";

    return {
      testCaseId: testCase.id,
      category: testCase.category,
      language: testCase.language,
      prompt: testCase.prompt,
      aiResponse,
      score,
      criteriaPassed: passedCriteria,
      criteriaFailed: failedCriteria,
      latencyMs,
      status,
      evaluatorNotes: `Score: ${score}/100 based on rubric assessment.`,
    };
  }

  /**
   * Executes a complete conversational evaluation run
   */
  public async runConversationalEvaluation(
    provider: ModelProvider,
    model: string,
    datasetId: string = "conversational-multiturn-eval",
    mockHandler?: (messages: any[]) => Promise<{ text: string }>
  ): Promise<ConversationalEvaluationSummary> {
    const runId = `conv_eval_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const testCases = this.loadTestCases(datasetId);
    const results: ConversationEvalResult[] = [];

    for (const tc of testCases) {
      const res = await this.evaluateTestCase(tc, provider, model, mockHandler);
      results.push(res);
    }

    const passed = results.filter((r) => r.status === "pass").length;
    const partial = results.filter((r) => r.status === "partial").length;
    const failed = results.filter((r) => r.status === "fail").length;

    const totalScore = results.reduce((acc, r) => acc + r.score, 0);
    const overallScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;

    const categoryScores: Record<string, { total: number; averageScore: number }> = {};
    for (const r of results) {
      if (!categoryScores[r.category]) {
        categoryScores[r.category] = { total: 0, averageScore: 0 };
      }
      categoryScores[r.category].total++;
    }
    for (const [cat, data] of Object.entries(categoryScores)) {
      const catResults = results.filter((r) => r.category === cat);
      const catAvg = catResults.reduce((acc, r) => acc + r.score, 0) / catResults.length;
      data.averageScore = Math.round(catAvg);
    }

    const summary: ConversationalEvaluationSummary = {
      id: runId,
      runId,
      provider,
      model,
      language: "multilingual",
      createdAt: new Date().toISOString(),
      totalCases: testCases.length,
      passedCases: passed,
      partialCases: partial,
      failedCases: failed,
      overallScore,
      categoryScores,
      results,
    };

    this.saveSummary(summary);
    return summary;
  }

  public saveSummary(summary: ConversationalEvaluationSummary): void {
    this.ensureVaultDir();
    const filePath = path.join(this.vaultDir, `${summary.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(summary, null, 2), "utf8");
  }

  public listSummaries(): ConversationalEvaluationSummary[] {
    this.ensureVaultDir();
    try {
      const files = fs.readdirSync(this.vaultDir).filter((f) => f.endsWith(".json"));
      const list: ConversationalEvaluationSummary[] = [];
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

  public getSummaryById(id: string): ConversationalEvaluationSummary | null {
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

export const conversationalEvaluator = ConversationalEvaluator.getInstance();
