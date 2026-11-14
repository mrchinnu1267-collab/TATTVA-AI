/**
 * TATTVA AI - MMMLU Evaluation Engine
 * Executes benchmark questions against real TATTVA AI models, evaluates accuracy, and builds performance metrics
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { modelRouter } from "../../ai-orchestrator/model-router";
import {
  MMMLUQuestion,
  EvaluationConfig,
  QuestionEvaluationResult,
  EvaluationRunSummary,
  EvaluationLiveProgress,
  OptionLetter,
  SubjectAccuracyMetric,
} from "./types";
import { mmmluCSVLoader } from "./csv-loader";

export class MMMLUEvaluator {
  private static instance: MMMLUEvaluator;
  private activeRuns: Map<string, { abortController: AbortController }> = new Map();

  public static getInstance(): MMMLUEvaluator {
    if (!MMMLUEvaluator.instance) {
      MMMLUEvaluator.instance = new MMMLUEvaluator();
    }
    return MMMLUEvaluator.instance;
  }

  /**
   * Builds the isolated question prompt for the AI model
   * SECURITY RULE: Never includes the ground truth answer
   */
  public buildModelPrompt(q: MMMLUQuestion): string {
    return `निम्नलिखित बहुविकल्पीय प्रश्न का उत्तर दें। दिए गए चार विकल्पों (A, B, C, D) में से केवल एक सही उत्तर चुनें।

विषय: ${q.subject}
प्रश्न: ${q.question}

A) ${q.options.A}
B) ${q.options.B}
C) ${q.options.C}
D) ${q.options.D}

निर्देश:
कृपया अपना उत्तर केवल JSON प्रारूप में दें (उत्तर केवल A, B, C, या D होना चाहिए):
{
  "answer": "<OPTION>",
  "explanation": "एक संक्षिप्त विवरण"
}`;
  }

  /**
   * System instruction enforcing JSON response schema
   */
  public getSystemInstruction(): string {
    return `You are an academic benchmark evaluation system. 
You will be provided with academic multiple-choice questions in Hindi.
Carefully analyze the question and select the single best option from A, B, C, or D.
You MUST output your final answer strictly in JSON format as follows:
{
  "answer": "A",
  "explanation": "Brief reasoning in English or Hindi"
}
Do NOT include markdown backticks around the JSON if possible, or use standard \`\`\`json blocks.
The "answer" field MUST be exactly one of: "A", "B", "C", or "D".`;
  }

  /**
   * Normalizes and extracts single option letter (A, B, C, D) from raw model output
   */
  public normalizeAnswer(rawText: string): {
    answer: OptionLetter | "INVALID";
    explanation?: string;
  } {
    if (!rawText || !rawText.trim()) {
      return { answer: "INVALID", explanation: "Empty response from model" };
    }

    const clean = rawText.trim();

    // 1. Attempt JSON parsing
    try {
      // Find JSON object boundaries
      const jsonStart = clean.indexOf("{");
      const jsonEnd = clean.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonStr = clean.slice(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);
        if (parsed.answer && typeof parsed.answer === "string") {
          const letter = parsed.answer.trim().toUpperCase();
          if (["A", "B", "C", "D"].includes(letter)) {
            return {
              answer: letter as OptionLetter,
              explanation: parsed.explanation || undefined,
            };
          }
        }
      }
    } catch {
      // Fall through to regex heuristics
    }

    // 2. Regex heuristic: Match explicit key pattern: "answer": "B"
    const jsonMatch = clean.match(/"answer"\s*:\s*"([ABCD])"/i);
    if (jsonMatch) {
      return { answer: jsonMatch[1].toUpperCase() as OptionLetter };
    }

    // 3. Match patterns like "Answer: B", "उत्तर: B", "Option B", "**B**", "(B)"
    const prefixMatch = clean.match(
      /(?:Answer|उत्तर|Option|विकल्प)\s*[:\-]?\s*[\*\(\[]?([ABCD])[\*\)\]]?\b/i
    );
    if (prefixMatch) {
      return { answer: prefixMatch[1].toUpperCase() as OptionLetter };
    }

    // 4. Match isolated single letter at beginning or end
    const standaloneMatch = clean.match(/^(?:Option\s*)?([ABCD])\b/i);
    if (standaloneMatch) {
      return { answer: standaloneMatch[1].toUpperCase() as OptionLetter };
    }

    // 5. Look for final sentence answer: e.g. "is B." or "correct answer is (B)"
    const endMatch = clean.match(/(?:correct answer is|सही उत्तर है)\s*[:\-]?\s*[\*\(\[]?([ABCD])[\*\)\]]?/i);
    if (endMatch) {
      return { answer: endMatch[1].toUpperCase() as OptionLetter };
    }

    return {
      answer: "INVALID",
      explanation: "Could not cleanly extract option letter (A, B, C, D) from response",
    };
  }

  /**
   * Evaluates a single question with retry handling and latency tracking
   */
  public async evaluateSingleQuestion(
    q: MMMLUQuestion,
    config: EvaluationConfig,
    mockHandler?: (prompt: string, q: MMMLUQuestion) => Promise<{ text: string }>
  ): Promise<QuestionEvaluationResult> {
    const startTime = Date.now();
    const prompt = this.buildModelPrompt(q);
    const systemInstruction = this.getSystemInstruction();

    const maxRetries = config.maxRetries ?? 2;
    let lastError: Error | null = null;
    let rawOutput = "";

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (mockHandler) {
          const res = await mockHandler(prompt, q);
          rawOutput = res.text;
        } else {
          // Live AI Model Call via TATTVA Centralized Model Router
          const result = await modelRouter.executeWithFallback("reasoning", 5, {
            messages: [{ role: "user", content: prompt }],
            systemInstruction,
            preferredModel: config.model,
            preferredProvider: config.provider,
            temperature: 0.1, // low temperature for deterministic evaluation
            timeoutMs: config.timeoutMs ?? 30000,
          });
          rawOutput = result.text;
        }
        break; // Success
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          // Exponential backoff: 500ms, 1000ms
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
        }
      }
    }

    const latencyMs = Date.now() - startTime;

    // Handle complete API failure
    if (!rawOutput && lastError) {
      return {
        questionId: q.id,
        question: q.question,
        subject: q.subject,
        options: q.options,
        expectedAnswer: q.answer,
        aiAnswer: "ERROR",
        status: "api_error",
        isCorrect: false,
        latencyMs,
        error: lastError.message || "Model request failed",
      };
    }

    // Parse model answer
    const { answer, explanation } = this.normalizeAnswer(rawOutput);

    if (answer === "INVALID") {
      return {
        questionId: q.id,
        question: q.question,
        subject: q.subject,
        options: q.options,
        expectedAnswer: q.answer,
        aiAnswer: "INVALID",
        explanation,
        rawResponse: rawOutput,
        status: "invalid_response",
        isCorrect: false,
        latencyMs,
      };
    }

    const isCorrect = answer === q.answer;
    return {
      questionId: q.id,
      question: q.question,
      subject: q.subject,
      options: q.options,
      expectedAnswer: q.answer,
      aiAnswer: answer,
      explanation,
      rawResponse: rawOutput,
      status: isCorrect ? "correct" : "incorrect",
      isCorrect,
      latencyMs,
    };
  }

  /**
   * Executes a full or sampled evaluation run with concurrency control and live progress updates
   */
  public async runEvaluation(
    config: EvaluationConfig,
    options?: {
      onProgress?: (progress: EvaluationLiveProgress) => void;
      mockHandler?: (prompt: string, q: MMMLUQuestion) => Promise<{ text: string }>;
      runId?: string;
    }
  ): Promise<EvaluationRunSummary> {
    const runId = options?.runId || `eval_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const abortController = new AbortController();
    this.activeRuns.set(runId, { abortController });

    const startTime = Date.now();
    const questions = mmmluCSVLoader.selectQuestions(
      config.sampleSize,
      config.subject,
      config.seed,
      config.dataset || "sample"
    );

    const totalQuestions = questions.length;
    const results: QuestionEvaluationResult[] = [];
    const concurrency = Math.min(Math.max(config.concurrency || 2, 1), 5);

    let correctCount = 0;
    let incorrectCount = 0;
    let invalidCount = 0;
    let failedCount = 0;

    const reportProgress = (currentIndex: number, latestResult?: QuestionEvaluationResult) => {
      if (options?.onProgress) {
        options.onProgress({
          runId,
          status: "running",
          currentIndex,
          totalQuestions,
          percentage: Math.round((currentIndex / totalQuestions) * 100),
          correctCount,
          incorrectCount,
          invalidCount,
          failedCount,
          currentModel: config.model,
          currentSubject: latestResult?.subject,
          elapsedMs: Date.now() - startTime,
          latestResult,
        });
      }
    };

    reportProgress(0);

    // Queue-based concurrent worker execution
    let nextIndex = 0;
    const executeWorker = async () => {
      while (nextIndex < totalQuestions) {
        if (abortController.signal.aborted) break;

        const idx = nextIndex++;
        const q = questions[idx];

        const res = await this.evaluateSingleQuestion(q, config, options?.mockHandler);
        results.push(res);

        if (res.status === "correct") correctCount++;
        else if (res.status === "incorrect") incorrectCount++;
        else if (res.status === "invalid_response") invalidCount++;
        else if (res.status === "api_error") failedCount++;

        reportProgress(results.length, res);
      }
    };

    const workers = Array.from({ length: concurrency }, () => executeWorker());
    await Promise.all(workers);

    this.activeRuns.delete(runId);

    const durationMs = Date.now() - startTime;
    const attemptedQuestions = results.length;
    const validAttempts = correctCount + incorrectCount;
    const accuracy = validAttempts > 0 ? (correctCount / validAttempts) * 100 : 0;
    const rawAccuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
    const avgResponseTimeMs =
      results.length > 0
        ? Math.round(
            results.reduce((acc, r) => acc + (r.latencyMs || 0), 0) / results.length
          )
        : 0;

    // Calculate subject-wise metrics
    const subjectMetrics: Record<string, SubjectAccuracyMetric> = {};
    for (const r of results) {
      if (!subjectMetrics[r.subject]) {
        subjectMetrics[r.subject] = {
          subject: r.subject,
          total: 0,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          invalid: 0,
          accuracy: 0,
        };
      }
      const sm = subjectMetrics[r.subject];
      sm.total++;
      sm.attempted++;
      if (r.status === "correct") sm.correct++;
      else if (r.status === "incorrect") sm.incorrect++;
      else if (r.status === "invalid_response") sm.invalid++;

      const smValid = sm.correct + sm.incorrect;
      sm.accuracy = smValid > 0 ? (sm.correct / smValid) * 100 : 0;
    }

    const summary: EvaluationRunSummary = {
      id: runId,
      userId: config.userId,
      status: abortController.signal.aborted ? "cancelled" : "completed",
      datasetName:
        config.dataset === "full"
          ? "OpenAI MMMLU (Full Corpus)"
          : "OpenAI MMMLU (Sample Benchmark)",
      datasetVersion: "Hindi (HI-IN)",
      language: config.language || "hi-IN",
      provider: config.provider,
      model: config.model,
      createdAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs,
      totalDurationMs: durationMs,
      averageResponseTimeMs: avgResponseTimeMs,
      totalQuestions,
      attemptedQuestions,
      validAttempts,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      invalidResponses: invalidCount,
      failedRequests: failedCount,
      accuracy: Math.round(accuracy * 100) / 100,
      rawAccuracy: Math.round(rawAccuracy * 100) / 100,
      subjectAccuracy: subjectMetrics,
      selectedQuestionIds: questions.map((q) => q.id),
      seed: config.seed,
      results,
    };

    return summary;
  }

  /**
   * Aborts an in-progress evaluation run
   */
  public stopEvaluation(runId: string): boolean {
    const run = this.activeRuns.get(runId);
    if (run) {
      run.abortController.abort();
      this.activeRuns.delete(runId);
      return true;
    }
    return false;
  }
}

export const mmmluEvaluator = MMMLUEvaluator.getInstance();
