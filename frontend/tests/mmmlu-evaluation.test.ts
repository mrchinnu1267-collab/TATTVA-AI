/**
 * TATTVA AI - MMMLU AI Evaluation System Comprehensive Benchmark Suite
 * Automated tests with mocked AI responses (0 API credits consumed)
 * Strictly covers all 12 test requirements + manual live-model test runner.
 *
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: "../.env" });
dotenv.config();

import {
  mmmluCSVLoader,
  mmmluEvaluator,
  evaluationStorage,
  evaluationExporter,
  EvaluationConfig,
  MMMLUQuestion,
  QuestionEvaluationResult,
} from "../app/lib/evaluation/mmmlu";

export async function runMMMLUEvaluationTests() {
  console.log("\n========================================================");
  console.log("🧪 TATTVA MMMLU AI EVALUATION SYSTEM BENCHMARK SUITE");
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

  // ----------------------------------------------------
  // TEST 1: Dataset Loading
  // ----------------------------------------------------
  console.log("--- 1. Dataset Loading (Sample & Full Corpus) ---");
  const samplePath = mmmluCSVLoader.resolveDatasetPath("sample");
  assert(Boolean(samplePath) && samplePath.includes("456"), `Resolved 456-question sample path: ${samplePath}`);

  const { questions: sampleQs, report: sampleReport } = mmmluCSVLoader.loadAndValidateDataset("sample");
  assert(sampleQs.length === 456, `Loaded canonical sample dataset (${sampleQs.length} questions)`);
  assert(sampleReport.isValid === true, "Sample dataset passed RFC-4180 validation");

  const fullPath = mmmluCSVLoader.resolveDatasetPath("full");
  assert(Boolean(fullPath), `Resolved full corpus path: ${fullPath}`);

  const { questions: fullQs } = mmmluCSVLoader.loadAndValidateDataset("full");
  assert(fullQs.length > 1000, `Full corpus loaded successfully (${fullQs.length} questions)`);

  // ----------------------------------------------------
  // TEST 2: Question Selection
  // ----------------------------------------------------
  console.log("\n--- 2. Question Selection (Sizes, Filtering & Seed) ---");
  const sample10 = mmmluCSVLoader.selectQuestions(10, "all");
  assert(sample10.length === 10, "Selected exactly 10 questions");

  const sample25 = mmmluCSVLoader.selectQuestions(25, "all");
  assert(sample25.length === 25, "Selected default 25 questions");

  const sample50 = mmmluCSVLoader.selectQuestions(50, "all");
  assert(sample50.length === 50, "Selected 50 questions");

  const sample100 = mmmluCSVLoader.selectQuestions(100, "all");
  assert(sample100.length === 100, "Selected 100 questions");

  const sample250 = mmmluCSVLoader.selectQuestions(250, "all");
  assert(sample250.length === 250, "Selected 250 questions");

  const sample456 = mmmluCSVLoader.selectQuestions(456, "all");
  assert(sample456.length === 456, "Selected full 456 questions");

  // Subject filtering
  const anatomyQs = mmmluCSVLoader.selectQuestions(25, "anatomy");
  assert(anatomyQs.every((q) => q.subject === "anatomy"), "Subject-filtered selection strictly matches subject");

  // Seed reproducibility (Mulberry32 PRNG)
  const seeded1 = mmmluCSVLoader.selectQuestions(10, "all", 42);
  const seeded2 = mmmluCSVLoader.selectQuestions(10, "all", 42);
  const idsMatch = seeded1.every((q, i) => q.id === seeded2[i].id);
  assert(idsMatch, "Random seed (seed: 42) produces identical reproducible question sequences");

  // ----------------------------------------------------
  // TEST 3: AI Answer Extraction
  // ----------------------------------------------------
  console.log("\n--- 3. AI Answer Extraction ---");
  const cleanJsonRes = mmmluEvaluator.normalizeAnswer('{"answer": "B", "explanation": "Detailed rationale."}');
  assert(cleanJsonRes.answer === "B", "Extracted clean JSON answer 'B'");

  const markdownJsonRes = mmmluEvaluator.normalizeAnswer('```json\n{"answer": "C", "explanation": "Valid reasoning"}\n```');
  assert(markdownJsonRes.answer === "C", "Extracted answer 'C' from markdown code block");

  const hindiPrefixRes = mmmluEvaluator.normalizeAnswer("इस प्रश्न का सही उत्तर है: उत्तर: D");
  assert(hindiPrefixRes.answer === "D", "Extracted answer 'D' from Hindi text prefix");

  const englishPrefixRes = mmmluEvaluator.normalizeAnswer("Based on analysis, the correct answer is Option A.");
  assert(englishPrefixRes.answer === "A", "Extracted answer 'A' from English prose");

  // Double-blind prompt verification
  const testQ: MMMLUQuestion = {
    id: 1,
    question: "प्रकाश का वेग कितना होता है?",
    options: {
      A: "3 x 10^8 m/s",
      B: "3 x 10^6 m/s",
      C: "3 x 10^4 m/s",
      D: "3 x 10^2 m/s",
    },
    answer: "A",
    subject: "physics",
  };
  const modelPrompt = mmmluEvaluator.buildModelPrompt(testQ);
  assert(!modelPrompt.includes('"answer": "A"'), "Double-blind check: ground truth answer NOT in model prompt");
  assert(modelPrompt.includes("प्रकाश का वेग"), "Hindi question text retained");
  assert(modelPrompt.includes("3 x 10^8 m/s"), "Option A present in prompt");

  // ----------------------------------------------------
  // TEST 4: Valid Answer Normalization
  // ----------------------------------------------------
  console.log("\n--- 4. Valid Answer Normalization ---");
  assert(mmmluEvaluator.normalizeAnswer('{"answer": "a"}').answer === "A", "Normalized lowercase 'a' to 'A'");
  assert(mmmluEvaluator.normalizeAnswer('{"answer": "b"}').answer === "B", "Normalized lowercase 'b' to 'B'");
  assert(mmmluEvaluator.normalizeAnswer('{"answer": "c"}').answer === "C", "Normalized lowercase 'c' to 'C'");
  assert(mmmluEvaluator.normalizeAnswer('{"answer": "d"}').answer === "D", "Normalized lowercase 'd' to 'D'");

  // ----------------------------------------------------
  // TEST 5: Correct Answer Comparison
  // ----------------------------------------------------
  console.log("\n--- 5. Correct Answer Comparison ---");
  const correctMockResult = await mmmluEvaluator.evaluateSingleQuestion(
    testQ,
    { provider: "gemini", model: "gemini-3.6-flash", sampleSize: 10 },
    async () => ({ text: '{"answer": "A", "explanation": "Correct scientific value"}' })
  );
  assert(correctMockResult.isCorrect === true, "Model answer 'A' matching expected 'A' marked isCorrect=true");
  assert(correctMockResult.status === "correct", "Status is 'correct'");
  assert(correctMockResult.aiAnswer === "A", "AI answer recorded as 'A'");

  // ----------------------------------------------------
  // TEST 6: Incorrect Answer Comparison
  // ----------------------------------------------------
  console.log("\n--- 6. Incorrect Answer Comparison ---");
  const incorrectMockResult = await mmmluEvaluator.evaluateSingleQuestion(
    testQ,
    { provider: "gemini", model: "gemini-3.6-flash", sampleSize: 10 },
    async () => ({ text: '{"answer": "B", "explanation": "Incorrect value"}' })
  );
  assert(incorrectMockResult.isCorrect === false, "Model answer 'B' differing from expected 'A' marked isCorrect=false");
  assert(incorrectMockResult.status === "incorrect", "Status is 'incorrect'");
  assert(incorrectMockResult.aiAnswer === "B", "AI answer recorded as 'B'");

  // ----------------------------------------------------
  // TEST 7: Invalid Model Response
  // ----------------------------------------------------
  console.log("\n--- 7. Invalid Model Response ---");
  const invalidMockResult = await mmmluEvaluator.evaluateSingleQuestion(
    testQ,
    { provider: "gemini", model: "gemini-3.6-flash", sampleSize: 10 },
    async () => ({ text: "I do not have enough information to answer this question accurately." })
  );
  assert(invalidMockResult.aiAnswer === "INVALID", "Uncommittal output parsed as 'INVALID'");
  assert(invalidMockResult.status === "invalid_response", "Status is 'invalid_response'");
  assert(invalidMockResult.isCorrect === false, "Invalid answer is not marked correct");

  // ----------------------------------------------------
  // TEST 8: API Failure Segregation
  // ----------------------------------------------------
  console.log("\n--- 8. API Failure Segregation ---");
  const apiErrorMockResult = await mmmluEvaluator.evaluateSingleQuestion(
    testQ,
    { provider: "gemini", model: "gemini-3.6-flash", sampleSize: 10, maxRetries: 0 },
    async () => {
      throw new Error("HTTP 429: Rate limit exceeded");
    }
  );
  assert(apiErrorMockResult.status === "api_error", "API failure marked status='api_error'");
  assert(apiErrorMockResult.aiAnswer === "ERROR", "aiAnswer is 'ERROR'");
  assert(Boolean(apiErrorMockResult.error?.includes("429")), "Error message captured");

  // ----------------------------------------------------
  // TEST 9: Retry Handling with Exponential Backoff
  // ----------------------------------------------------
  console.log("\n--- 9. Retry Handling with Exponential Backoff ---");
  let callAttempts = 0;
  const retryMockResult = await mmmluEvaluator.evaluateSingleQuestion(
    testQ,
    { provider: "gemini", model: "gemini-3.6-flash", sampleSize: 10, maxRetries: 2 },
    async () => {
      callAttempts++;
      if (callAttempts === 1) {
        throw new Error("Temporary network timeout");
      }
      return { text: '{"answer": "A", "explanation": "Recovered on retry"}' };
    }
  );
  assert(callAttempts === 2, `Evaluator retried transient failure (total attempts: ${callAttempts})`);
  assert(retryMockResult.status === "correct", "Succeeded on retry with correct status");
  assert(retryMockResult.aiAnswer === "A", "Recovered answer 'A'");

  // ----------------------------------------------------
  // TEST 10: Accuracy Calculations
  // ----------------------------------------------------
  console.log("\n--- 10. Accuracy Calculations ---");
  const mockConfig: EvaluationConfig = {
    provider: "gemini",
    model: "mock-eval-model",
    sampleSize: 10,
    concurrency: 1,
    dataset: "sample",
  };

  let mockIndex = 0;
  const mockRun = await mmmluEvaluator.runEvaluation(mockConfig, {
    mockHandler: async (_prompt, q) => {
      mockIndex++;
      if (mockIndex <= 7) {
        return { text: `{"answer": "${q.answer}"}` }; // 7 Correct
      } else if (mockIndex <= 9) {
        const wrongLetter = q.answer === "A" ? "B" : "A";
        return { text: `{"answer": "${wrongLetter}"}` }; // 2 Incorrect
      } else {
        return { text: "No answer provided" }; // 1 Invalid
      }
    },
  });

  assert(mockRun.totalQuestions === 10, "10 questions evaluated");
  assert(mockRun.correctAnswers === 7, "7 correct answers recorded");
  assert(mockRun.incorrectAnswers === 2, "2 incorrect answers recorded");
  assert(mockRun.invalidResponses === 1, "1 invalid response recorded");
  assert(mockRun.validAttempts === 9, "Valid attempts = 9 (7 correct + 2 incorrect)");
  const expectedAcc = Math.round((7 / 9) * 10000) / 100;
  assert(mockRun.accuracy === expectedAcc, `Accuracy calculation matches formula: ${mockRun.accuracy}% === ${expectedAcc}%`);
  assert(mockRun.averageResponseTimeMs >= 0, "Average response time metric generated");

  // ----------------------------------------------------
  // TEST 11: Evaluation Cancellation
  // ----------------------------------------------------
  console.log("\n--- 11. Evaluation Cancellation ---");
  const cancelConfig: EvaluationConfig = {
    provider: "gemini",
    model: "mock-eval-model",
    sampleSize: 50,
    concurrency: 1,
    dataset: "sample",
  };

  const cancelRunId = "eval_cancel_test_" + Date.now();
  let processedBeforeCancel = 0;

  const evaluationPromise = mmmluEvaluator.runEvaluation(cancelConfig, {
    runId: cancelRunId,
    mockHandler: async () => {
      processedBeforeCancel++;
      if (processedBeforeCancel === 3) {
        // Trigger cancellation after 3 items
        mmmluEvaluator.stopEvaluation(cancelRunId);
      }
      return { text: '{"answer": "A"}' };
    },
  });

  const cancelledSummary = await evaluationPromise;
  assert(cancelledSummary.attemptedQuestions < 50, `Evaluation cleanly cancelled at question ${cancelledSummary.attemptedQuestions}/50`);
  assert(cancelledSummary.status === "cancelled", "Run status recorded as 'cancelled'");

  // ----------------------------------------------------
  // TEST 12: Database & Local Vault Persistence
  // ----------------------------------------------------
  console.log("\n--- 12. Database & Vault Persistence ---");
  await evaluationStorage.saveRun(mockRun);

  const retrievedRun = await evaluationStorage.getRun(mockRun.id);
  assert(retrievedRun !== null, "Successfully retrieved run from storage by ID");
  assert(retrievedRun?.id === mockRun.id, "Stored run ID matches");
  assert(retrievedRun?.accuracy === mockRun.accuracy, "Stored accuracy matches");
  assert(retrievedRun?.results.length === 10, "Complete results array persisted");

  const runList = await evaluationStorage.listRuns();
  assert(runList.some((r) => r.id === mockRun.id), "Saved run appears in listRuns()");

  // Exporters check
  const csvReport = evaluationExporter.generateCSV(mockRun);
  assert(csvReport.includes("# TATTVA AI - MMMLU Benchmark Evaluation Report"), "CSV includes metadata header");
  assert(csvReport.includes('"Expected Answer","AI Answer"') || csvReport.includes("Expected Answer,AI Answer"), "CSV contains data table headers");

  const jsonReport = evaluationExporter.generateJSON(mockRun);
  const parsedJson = JSON.parse(jsonReport);
  assert(parsedJson.id === mockRun.id, "JSON export is valid parseable format");

  const pdfReport = evaluationExporter.generatePDF(mockRun);
  assert(Buffer.isBuffer(pdfReport), "PDF exporter produces valid Buffer");
  assert(pdfReport.slice(0, 5).toString("utf8").startsWith("%PDF"), "PDF starts with %PDF magic bytes");

  // Clean up
  await evaluationStorage.deleteRun(mockRun.id);

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log("\n========================================================");
  console.log(`🎯 BENCHMARK RESULTS: ${passed}/${total} Tests Passed (${Math.round((passed / total) * 100)}%)`);
  console.log("========================================================\n");

  if (passed !== total) {
    throw new Error(`MMMLU Evaluation test suite failed: ${total - passed} failures`);
  }
}

/**
 * Optional manual test against a live configured model (Gemini 2.5 Flash)
 */
export async function runManualLiveTest(sampleCount: number = 3) {
  console.log(`\n========================================================`);
  console.log(`🚀 MANUAL LIVE-MODEL EVALUATION (3 Questions on Gemini)`);
  console.log(`========================================================\n`);

  try {
    const liveSummary = await mmmluEvaluator.runEvaluation(
      {
        provider: "gemini",
        model: "gemini-2.5-flash",
        sampleSize: sampleCount,
        subject: "all",
        concurrency: 1,
        dataset: "sample",
      },
      {
        onProgress: (p) => {
          console.log(`  [Progress] ${p.currentIndex}/${p.totalQuestions} (${p.percentage}%) - Correct: ${p.correctCount}, Incorrect: ${p.incorrectCount}, Model: ${p.currentModel}`);
        },
      }
    );

    console.log(`\n🎉 Live Evaluation Completed Successfully:`);
    console.log(`- Run ID          : ${liveSummary.id}`);
    console.log(`- Model           : ${liveSummary.model} (${liveSummary.provider})`);
    console.log(`- Total Questions : ${liveSummary.totalQuestions}`);
    console.log(`- Attempted       : ${liveSummary.attemptedQuestions}`);
    console.log(`- Correct Answers : ${liveSummary.correctAnswers}`);
    console.log(`- Incorrect       : ${liveSummary.incorrectAnswers}`);
    console.log(`- Overall Accuracy: ${liveSummary.accuracy}%`);
    console.log(`- Total Duration  : ${liveSummary.durationMs}ms`);
    console.log(`- Avg Response Time: ${liveSummary.averageResponseTimeMs}ms/question`);

    await evaluationStorage.saveRun(liveSummary);
    console.log(`- Stored in Vault : .tattva-vault/evaluations/${liveSummary.id}.json\n`);
    return liveSummary;
  } catch (err: any) {
    console.error("❌ Live evaluation execution failed:", err.message);
    throw err;
  }
}

// Auto-run if executed directly
if (process.argv[1]?.includes("mmmlu-evaluation.test")) {
  const isLive = process.argv.includes("--live");
  if (isLive) {
    runManualLiveTest().catch((err) => {
      console.error("Live test failed:", err);
      process.exit(1);
    });
  } else {
    runMMMLUEvaluationTests().catch((err) => {
      console.error("MMMLU Test execution failed:", err);
      process.exit(1);
    });
  }
}
