import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { gsm8kEvaluator } from "../app/lib/evaluation/gsm8k/gsm8k-evaluator";

async function main() {
  console.log("================================================================================");
  console.log("  TATTVA AI - REAL-MODEL EMPIRICAL GSM8K EVALUATION (50 QUESTIONS)");
  console.log("================================================================================");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("FATAL: GEMINI_API_KEY is not set in environment or .env.local");
    process.exit(1);
  }

  console.log(`Model Target:       gemini-3.5-flash-lite`);
  console.log(`Dataset:            gsm8k-evaluation (Parquet, 1,319 test records)`);
  console.log(`Sample Size:        50 questions (deterministic seed: 42)`);
  console.log(`Mode:               LIVE API INFERENCE (mockInference: false)`);
  console.log(`Started At:         ${new Date().toISOString()}`);
  console.log("--------------------------------------------------------------------------------\n");

  const startTime = Date.now();
  const summary = await gsm8kEvaluator.runEvaluation({
    modelId: "gemini-3.5-flash-lite",
    questionCount: 50,
    seed: 42,
    mockInference: false,
    temperature: 0.1,
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n================================================================================");
  console.log("  EVALUATION COMPLETE - EMPIRICAL RESULTS SUMMARY");
  console.log("================================================================================");
  console.log(`Run ID:                 ${summary.runId}`);
  console.log(`Total Questions:        ${summary.totalQuestions}`);
  console.log(`Correct Answers:        ${summary.correctAnswers}`);
  console.log(`Incorrect Answers:      ${summary.incorrectAnswers}`);
  console.log(`Invalid Responses:      ${summary.invalidResponses}`);
  console.log(`Failed API Requests:    ${summary.failedRequests}`);
  console.log(`Empirical Accuracy:     ${summary.accuracy}%`);
  console.log(`Valid Completion Rate:  ${summary.validCompletionRate}%`);
  console.log(`Avg Latency / Question: ${summary.avgResponseTimeMs} ms`);
  console.log(`Total Wall Clock Time:  ${durationSec} s`);
  console.log("--------------------------------------------------------------------------------");
  console.log("Topic Breakdown:");
  for (const [topic, metrics] of Object.entries(summary.topicBreakdown)) {
    console.log(`  - ${topic.padEnd(25)}: ${metrics.correct}/${metrics.total} (${metrics.accuracy}%) | avg latency: ${metrics.avgLatencyMs}ms`);
  }
  console.log("================================================================================\n");

  // Save the full run details for reporting
  const outPath = path.resolve(__dirname, "../docs/gsm8k_50_eval_empirical_results.json");
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(`Full detailed run results written to: ${outPath}`);
}

main().catch((err) => {
  console.error("Evaluation failed with error:", err);
  process.exit(1);
});
