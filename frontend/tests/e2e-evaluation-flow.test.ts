/**
 * TATTVA AI - End-to-End System Verification & E2E Benchmark Test
 * Conducts a 10-question mocked evaluation validating the complete 9-stage lifecycle:
 * 1. Evaluation initialization
 * 2. Dataset loading (MMMLU Hindi)
 * 3. Model interface question delivery
 * 4. Double-blind expected-answer privacy verification
 * 5. Multi-tier answer extraction and scoring
 * 6. Progress event emissions
 * 7. Storage persistence (Vault + DB format)
 * 8. Summary statistics generation
 * 9. Report export generation (CSV, JSON, PDF)
 *
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { mmmluCSVLoader } from "../app/lib/evaluation/mmmlu/csv-loader";
import { mmmluEvaluator } from "../app/lib/evaluation/mmmlu/evaluator";
import { evaluationStorage } from "../app/lib/evaluation/mmmlu/storage";
import { evaluationExporter } from "../app/lib/evaluation/mmmlu/export";
import { EvaluationConfig, EvaluationLiveProgress } from "../app/lib/evaluation/mmmlu/types";

export async function runE2EVerificationTest() {
  console.log("\n========================================================");
  console.log("🔬 TATTVA COMPLETE END-TO-END SYSTEM VERIFICATION");
  console.log("========================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
    }
  }

  // 1. Stage 1: Evaluation Initialization & Config Verification
  console.log("--- Stage 1: Evaluation Configuration ---");
  const runId = `e2e_verify_${Date.now()}`;
  const config: EvaluationConfig = {
    dataset: "sample",
    provider: "gemini",
    model: "gemini-2.5-flash",
    sampleSize: 10,
    subject: "all",
    concurrency: 2,
    seed: 12345, // Fixed seed for reproducible E2E verification
  };
  assert(Boolean(runId), `Initialized evaluation session: ${runId}`);
  assert(config.sampleSize === 10, "Configured exactly 10 questions for end-to-end audit");

  // 2. Stage 2: Questions Loading
  console.log("--- Stage 2: Dataset Loading & Selection ---");
  const datasetPath = mmmluCSVLoader.resolveDatasetPath("sample");
  assert(Boolean(datasetPath) && datasetPath.endsWith(".csv"), `Resolved canonical dataset: ${datasetPath}`);

  const selectedQuestions = mmmluCSVLoader.selectQuestions(10, "all", 12345, "sample");
  assert(selectedQuestions.length === 10, `Loaded exactly 10 questions (${selectedQuestions.length})`);
  assert(selectedQuestions.every((q) => q.question && q.options && q.answer), "Every question possesses text, 4 options, and server-side ground truth");

  // 3. Stage 3 & 4: Model Interface Delivery & Double-Blind Privacy Check
  console.log("--- Stage 3 & 4: Model Interface & Double-Blind Verification ---");
  const receivedPrompts: string[] = [];
  let doubleBlindViolations = 0;

  // Track progress updates
  const progressEvents: EvaluationLiveProgress[] = [];

  // Mock handler simulating model with controlled accuracy (70% accuracy)
  let callCount = 0;
  const mockHandler = async (prompt: string, q: any) => {
    callCount++;
    receivedPrompts.push(prompt);

    // Double-blind verification check: ground truth answer MUST NOT be in prompt
    if (prompt.includes(`Answer: ${q.answer}`) || prompt.includes(`"answer": "${q.answer}"`)) {
      doubleBlindViolations++;
    }

    // Return correct answer for 7 out of 10 questions
    const isHit = callCount <= 7;
    const chosenAnswer = isHit ? q.answer : (q.answer === "A" ? "B" : "A");

    return {
      text: JSON.stringify({
        answer: chosenAnswer,
        confidence: 0.92,
        explanation: `E2E automated explanation for Q${q.id}`,
      }),
    };
  };

  // 4. Stage 5 & 6: Execution, Progress Streaming & Scoring
  console.log("--- Stage 5 & 6: Execution, Progress Streaming & Scoring ---");
  const runSummary = await mmmluEvaluator.runEvaluation(config, {
    runId,
    mockHandler,
    onProgress: (p) => {
      progressEvents.push({ ...p });
    },
  });

  assert(receivedPrompts.length === 10, `Model interface received all 10 questions (${receivedPrompts.length})`);
  assert(doubleBlindViolations === 0, "Double-blind check PASSED: ground truth answer was NEVER included in prompts");
  assert(progressEvents.length === 11, `Emitted 11 progress events (initial 0% + 10 questions)`);
  assert(progressEvents[0].currentIndex === 0, "Initial progress event indicates currentIndex 0 starting status");
  assert(progressEvents[progressEvents.length - 1].currentIndex === 10, "Final progress event indicates currentIndex 10 complete status");

  // 5. Stage 7: Metrics & Score Calculation
  console.log("--- Stage 7: Accuracy & Metrics Calculation ---");
  assert(runSummary.totalQuestions === 10, "Summary total questions is 10");
  assert(runSummary.correctAnswers === 7, `Correct answers matches expectation: ${runSummary.correctAnswers}/10`);
  assert(runSummary.incorrectAnswers === 3, `Incorrect answers matches expectation: ${runSummary.incorrectAnswers}/10`);
  assert(runSummary.accuracy === 70, `Calculated accuracy is exactly 70.00% (${runSummary.accuracy}%)`);
  assert(runSummary.results.length === 10, `Persisted 10 individual question results`);

  // 6. Stage 8: Storage Persistence & Vault Save
  console.log("--- Stage 8: Database & Storage Persistence ---");
  await evaluationStorage.saveRun(runSummary);
  const reloadedRun = await evaluationStorage.getRun(runId);
  assert(Boolean(reloadedRun && reloadedRun.id === runId), `Successfully retrieved run from storage: ${reloadedRun?.id}`);
  assert(reloadedRun?.accuracy === 70, `Storage preserved accuracy: ${reloadedRun?.accuracy}%`);
  assert(reloadedRun?.results?.length === 10, `Storage preserved all 10 question results`);

  // 7. Stage 9: Report Generation & Export
  console.log("--- Stage 9: Export Generation (CSV, JSON, PDF) ---");
  const csvData = evaluationExporter.generateCSV(runSummary);
  assert(csvData.includes("TATTVA AI - MMMLU Benchmark Evaluation Report"), "CSV export contains report header");
  assert(csvData.includes("Question ID"), "CSV contains data table headers");

  const jsonData = evaluationExporter.generateJSON(runSummary);
  const parsedJSON = JSON.parse(jsonData);
  assert(parsedJSON.id === runId && parsedJSON.accuracy === 70, "JSON export is valid parseable payload");

  const pdfBuffer = await evaluationExporter.generatePDF(runSummary);
  assert(Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 500, `PDF export generated valid buffer (${pdfBuffer.length} bytes)`);
  assert(pdfBuffer.toString("latin1", 0, 4) === "%PDF", "PDF starts with valid %PDF magic bytes");

  // Summary
  console.log("\n========================================================");
  console.log(`🏁 E2E VERIFICATION RESULTS: ${passed}/${total} STAGES PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("========================================================\n");

  if (passed !== total) {
    throw new Error(`E2E Verification failed: ${total - passed} assertion failure(s)`);
  }
  return { passed, total, runSummary };
}

if (require.main === module || process.argv.includes("--run")) {
  runE2EVerificationTest().catch((err) => {
    console.error("E2E Test execution failed:", err);
    process.exit(1);
  });
}
