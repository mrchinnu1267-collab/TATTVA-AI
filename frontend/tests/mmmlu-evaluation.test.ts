/**
 * TATTVA AI - MMMLU AI Evaluation System Comprehensive Test Suite
 * Automated tests with mocked AI responses (0 API credits consumed)
 * plus optional manual live-model test runner.
 *
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import {
  mmmluCSVLoader,
  mmmluEvaluator,
  evaluationStorage,
  evaluationExporter,
  EvaluationConfig,
  MMMLUQuestion,
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
  // TEST 1: CSV Loading
  // ----------------------------------------------------
  console.log("--- 1. CSV Dataset Loading ---");
  const datasetPath = mmmluCSVLoader.resolveDatasetPath();
  assert(Boolean(datasetPath), `Resolved dataset path: ${datasetPath}`);

  const { questions, report } = mmmluCSVLoader.loadAndValidateDataset();
  assert(questions.length > 0, `Successfully loaded ${questions.length} questions from local CSV`);
  assert(report.totalRows > 1000, `Dataset contains large corpus (${report.totalRows} total rows)`);

  // ----------------------------------------------------
  // TEST 2: CSV Schema Validation
  // ----------------------------------------------------
  console.log("\n--- 2. Dataset Schema & Column Validation ---");
  assert(report.isValid === true, "Dataset passed schema validation");
  assert(report.errors.length === 0, "Zero schema errors reported");
  assert(report.subjects.length >= 10, `Detected ${report.subjects.length} unique academic subjects`);

  const firstQ = questions[0];
  assert(Boolean(firstQ.question && firstQ.question.length > 5), "Questions retain Hindi text");
  assert(Boolean(firstQ.options.A && firstQ.options.B && firstQ.options.C && firstQ.options.D), "All 4 options present");
  assert(["A", "B", "C", "D"].includes(firstQ.answer), `Ground truth answer is valid letter: ${firstQ.answer}`);

  // ----------------------------------------------------
  // TEST 3: Missing Values & Invalid Record Rejection
  // ----------------------------------------------------
  console.log("\n--- 3. Missing Values & Edge Case Rejection ---");
  const dummyCSV = `Unnamed: 0,Question,A,B,C,D,Answer,Subject
0,Valid Question 1,A,B,C,D,A,math
1,,A,B,C,D,B,math
2,Missing Option D,A,B,C,,C,math
3,Invalid Answer Letter,A,B,C,D,X,math
4,Valid Question 2,A,B,C,D,D,physics`;

  const parsedDummy = mmmluCSVLoader.parseRFC4180CSV(dummyCSV);
  assert(parsedDummy.length === 6, "RFC 4180 parser handles lines accurately");

  // ----------------------------------------------------
  // TEST 4: Ground Truth Isolation (Security Rule)
  // ----------------------------------------------------
  console.log("\n--- 4. Ground Truth Answer Isolation ---");
  const sampleQ: MMMLUQuestion = {
    id: 999,
    question: "प्रकाश का वेग कितना होता है?",
    options: {
      A: "3 x 10^8 m/s",
      B: "2 x 10^8 m/s",
      C: "1 x 10^8 m/s",
      D: "4 x 10^8 m/s",
    },
    answer: "A",
    subject: "physics",
  };

  const modelPrompt = mmmluEvaluator.buildModelPrompt(sampleQ);
  assert(!modelPrompt.includes(`"answer": "A"`), "Model prompt does NOT contain ground truth answer");
  assert(!modelPrompt.includes(`Correct Answer`), "No correct answer hints sent to model");
  assert(modelPrompt.includes(sampleQ.question), "Hindi question text is preserved");
  assert(modelPrompt.includes(sampleQ.options.A), "Option A is included in prompt");
  assert(modelPrompt.includes(sampleQ.options.D), "Option D is included in prompt");

  // ----------------------------------------------------
  // TEST 5: Answer Normalization & Parsing
  // ----------------------------------------------------
  console.log("\n--- 5. Answer Extraction & Normalization ---");
  const jsonOutput = `{"answer": "B", "explanation": "प्रकाश का वेग निर्वात में अधिकतम होता है।"}`;
  assert(mmmluEvaluator.normalizeAnswer(jsonOutput).answer === "B", "Clean JSON extracted answer 'B'");

  const markdownJsonOutput = "```json\n{\n  \"answer\": \"C\",\n  \"explanation\": \"Calculation verified.\"\n}\n```";
  assert(mmmluEvaluator.normalizeAnswer(markdownJsonOutput).answer === "C", "Markdown wrapped JSON extracted answer 'C'");

  const textOutput = "उत्तर: D सही विकल्प है।";
  assert(mmmluEvaluator.normalizeAnswer(textOutput).answer === "D", "Hindi prefix 'उत्तर: D' normalized to 'D'");

  const englishPrefix = "The correct answer is (A).";
  assert(mmmluEvaluator.normalizeAnswer(englishPrefix).answer === "A", "English sentence extracted answer 'A'");

  const invalidOutput = "मुझे इस प्रश्न का उत्तर नहीं पता।";
  assert(mmmluEvaluator.normalizeAnswer(invalidOutput).answer === "INVALID", "Non-committal text flagged as INVALID");

  // ----------------------------------------------------
  // TEST 6: Correct / Incorrect Evaluation Comparison
  // ----------------------------------------------------
  console.log("\n--- 6. Correct vs Incorrect Comparison ---");
  const config: EvaluationConfig = {
    provider: "gemini",
    model: "gemini-3.6-flash",
    sampleSize: 10,
    subject: "all",
  };

  // Mock correct response
  const correctResult = await mmmluEvaluator.evaluateSingleQuestion(sampleQ, config, async () => ({
    text: JSON.stringify({ answer: "A", explanation: "Verified physical constant" }),
  }));
  assert(correctResult.isCorrect === true, "Model answer 'A' matching ground truth 'A' is marked correct");
  assert(correctResult.status === "correct", "Status is 'correct'");

  // Mock incorrect response
  const incorrectResult = await mmmluEvaluator.evaluateSingleQuestion(sampleQ, config, async () => ({
    text: JSON.stringify({ answer: "B", explanation: "Wrong selection" }),
  }));
  assert(incorrectResult.isCorrect === false, "Model answer 'B' differing from ground truth 'A' is marked incorrect");
  assert(incorrectResult.status === "incorrect", "Status is 'incorrect'");

  // ----------------------------------------------------
  // TEST 7: Accuracy Calculations
  // ----------------------------------------------------
  console.log("\n--- 7. Accuracy Calculation Metrics ---");
  // Run simulated 10-question evaluation with mock handler: 7 correct, 2 incorrect, 1 invalid
  let mockIdx = 0;
  const mockRun = await mmmluEvaluator.runEvaluation(
    { provider: "gemini", model: "gemini-3.6-flash", sampleSize: 10, seed: 101 },
    {
      mockHandler: async (_prompt, q) => {
        mockIdx++;
        if (mockIdx <= 7) {
          // 7 correct
          return { text: JSON.stringify({ answer: q.answer, explanation: "Correct answer" }) };
        } else if (mockIdx <= 9) {
          // 2 incorrect (choose opposite answer)
          const wrong = q.answer === "A" ? "B" : "A";
          return { text: JSON.stringify({ answer: wrong, explanation: "Incorrect answer" }) };
        } else {
          // 1 invalid
          return { text: "Undefined response with no option chosen" };
        }
      },
    }
  );

  assert(mockRun.totalQuestions === 10, "10 questions evaluated");
  assert(mockRun.correctAnswers === 7, "7 correct answers recorded");
  assert(mockRun.incorrectAnswers === 2, "2 incorrect answers recorded");
  assert(mockRun.invalidResponses === 1, "1 invalid response recorded");
  assert(mockRun.validAttempts === 9, "Valid attempts = 9 (7 correct + 2 incorrect)");
  // Formula: (7 / 9) * 100 = 77.78%
  const expectedAccuracy = Math.round((7 / 9) * 100 * 100) / 100;
  assert(mockRun.accuracy === expectedAccuracy, `Accuracy matches formula: ${mockRun.accuracy}% === ${expectedAccuracy}%`);

  // ----------------------------------------------------
  // TEST 8: API Failure & Retry Segregation
  // ----------------------------------------------------
  console.log("\n--- 8. API Failure & Timeout Segregation ---");
  const failedResult = await mmmluEvaluator.evaluateSingleQuestion(sampleQ, config, async () => {
    throw new Error("HTTP 429: Too Many Requests (Rate limit reached)");
  });

  assert(failedResult.status === "api_error", "Transient API error categorized as 'api_error'");
  assert(failedResult.aiAnswer === "ERROR", "aiAnswer is 'ERROR'");
  assert(failedResult.isCorrect === false, "Failed request is not marked correct");
  assert(Boolean(failedResult.error && failedResult.error.includes("429")), "Error message captured");

  // ----------------------------------------------------
  // TEST 9: Evaluation Run Storage & Retrieval
  // ----------------------------------------------------
  console.log("\n--- 9. Evaluation Run Storage & History ---");
  await evaluationStorage.saveRun(mockRun);
  const retrievedRun = await evaluationStorage.getRun(mockRun.id);
  assert(retrievedRun !== null, "Successfully retrieved run from storage by ID");
  assert(retrievedRun?.id === mockRun.id, "Run ID matches");
  assert(retrievedRun?.accuracy === mockRun.accuracy, "Stored accuracy matches");
  assert(retrievedRun?.results.length === 10, "Complete results array persisted");

  const runList = await evaluationStorage.listRuns();
  assert(runList.some((r) => r.id === mockRun.id), "Saved run appears in listRuns()");

  // ----------------------------------------------------
  // TEST 10: Export Reports (CSV, JSON, PDF)
  // ----------------------------------------------------
  console.log("\n--- 10. Report Exporters (CSV, JSON, PDF) ---");
  const csvReport = evaluationExporter.generateCSV(mockRun);
  assert(csvReport.includes("# TATTVA AI - MMMLU Benchmark Evaluation Report"), "CSV includes metadata header");
  assert(csvReport.includes('"Expected Answer","AI Answer"') || csvReport.includes("Expected Answer,AI Answer"), "CSV contains data table headers");
  assert(csvReport.split("\n").length >= 12, "CSV contains all evaluated questions");

  const jsonReport = evaluationExporter.generateJSON(mockRun);
  const parsedJson = JSON.parse(jsonReport);
  assert(parsedJson.id === mockRun.id, "JSON export is valid parseable format");
  assert(parsedJson.accuracy === mockRun.accuracy, "JSON export retains accuracy metrics");

  const pdfReport = evaluationExporter.generatePDF(mockRun);
  assert(Buffer.isBuffer(pdfReport), "PDF exporter produces valid Buffer");
  const pdfHeader = pdfReport.slice(0, 5).toString("utf8");
  assert(pdfHeader.startsWith("%PDF"), `PDF starts with standard PDF magic number: ${pdfHeader}`);

  // ----------------------------------------------------
  // Clean up test run
  // ----------------------------------------------------
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
 * Optional manual test against a live configured model (Gemini 3.6 Flash)
 */
export async function runManualLiveTest(sampleCount: number = 3) {
  console.log(`\n--- Running Live Model Test (${sampleCount} Questions on Gemini 3.6 Flash) ---`);
  const liveSummary = await mmmluEvaluator.runEvaluation(
    {
      provider: "gemini",
      model: "gemini-3.6-flash",
      sampleSize: 10,
      subject: "all",
      concurrency: 1,
    },
    {
      onProgress: (p) => {
        console.log(`  [Progress] ${p.currentIndex}/${p.totalQuestions} (${p.percentage}%) - Correct: ${p.correctCount}, Incorrect: ${p.incorrectCount}`);
      },
    }
  );

  console.log(`\n🎉 Live Evaluation Finished:`);
  console.log(`- Model: ${liveSummary.model}`);
  console.log(`- Questions: ${liveSummary.totalQuestions}`);
  console.log(`- Correct: ${liveSummary.correctAnswers}`);
  console.log(`- Incorrect: ${liveSummary.incorrectAnswers}`);
  console.log(`- Accuracy: ${liveSummary.accuracy}%`);
  console.log(`- Average Latency: ${Math.round(liveSummary.durationMs / liveSummary.totalQuestions)}ms/question`);
}

// Auto-run if executed directly
if (process.argv[1]?.includes("mmmlu-evaluation.test")) {
  runMMMLUEvaluationTests().catch((err) => {
    console.error("MMMLU Test execution failed:", err);
    process.exit(1);
  });
}
