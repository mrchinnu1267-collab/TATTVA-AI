/**
 * TATTVA AI - Model Comparison & Benchmark Arena Test Suite
 * Validates Fair Side-by-Side Benchmarking, Deterministic Seed Parity,
 * Winner Calculation, Consensus Agreement Scores, and Storage Persistence.
 *
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { modelComparator } from "../app/lib/evaluation/comparison/model-comparator";
import { ModelComparisonConfig } from "../app/lib/evaluation/comparison/types";

export async function runModelComparisonTests() {
  console.log("\n========================================================");
  console.log("⚔️ TATTVA MODEL BENCHMARK ARENA & COMPARISON TEST SUITE");
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

  // 1. Fair Benchmark Execution with Identical Seed & Mock Handlers
  console.log("--- 1. Fair Head-to-Head Arena Execution (Mock Handlers) ---");
  const config: ModelComparisonConfig = {
    comparisonName: "Gemini 2.5 Flash vs Gemini 3.6 Flash Indic Arena",
    targets: [
      { provider: "gemini", model: "gemini-2.5-flash" },
      { provider: "gemini", model: "gemini-3.6-flash" },
    ],
    sampleSize: 10,
    seed: 42,
    concurrency: 1, // Sequential for exact count predictability
  };

  // Mock handlers: Model A gets 80% correct, Model B gets 60% correct
  let qIdxA = 0;
  let qIdxB = 0;
  const mockHandlers = {
    "gemini:gemini-2.5-flash": async (_prompt: string, q: any) => {
      qIdxA++;
      const ans = qIdxA <= 8 ? q.answer : (q.answer === "A" ? "B" : "A");
      return { text: `{"answer": "${ans}", "confidence": 0.95, "reasoning": "Model A reasoning"}` };
    },
    "gemini:gemini-3.6-flash": async (_prompt: string, q: any) => {
      qIdxB++;
      const ans = qIdxB <= 6 ? q.answer : (q.answer === "A" ? "B" : "A");
      return { text: `{"answer": "${ans}", "confidence": 0.88, "reasoning": "Model B reasoning"}` };
    },
  };

  const report = await modelComparator.executeComparison(config, { mockHandlers });

  assert(Boolean(report.id), `Generated comparison report ID: ${report.id}`);
  assert(report.sampleSize === 10, `Evaluated exactly 10 questions (sampleSize: ${report.sampleSize})`);
  assert(report.models.length === 2, `Comparison contains 2 model evaluation scores`);

  const modelA = report.models.find((m) => m.model === "gemini-2.5-flash");
  const modelB = report.models.find((m) => m.model === "gemini-3.6-flash");

  assert(Boolean(modelA && modelB), "Both target models scored in report");
  assert(modelA!.accuracy === 80, `Model A accuracy correctly calculated: ${modelA!.accuracy}%`);
  assert(modelB!.accuracy === 60, `Model B accuracy correctly calculated: ${modelB!.accuracy}%`);

  // 2. Winner Determination
  console.log("--- 2. Winner Determination & Delta Metrics ---");
  assert(report.winnerModel?.model === "gemini-2.5-flash", `Declared correct winner: ${report.winnerModel?.model}`);
  assert(report.winnerModel?.accuracy === 80, `Winner accuracy is: ${report.winnerModel?.accuracy}%`);

  // 3. Question Deltas & Agreement Consensus
  console.log("--- 3. Question Deltas & Consensus Scoring ---");
  assert(report.questionDeltas.length === 10, `Recorded 10 question comparison deltas`);
  assert(report.fairBenchmarkConditionMet === true, "Fair benchmark condition strictly verified");

  // Check first delta structure
  const delta0 = report.questionDeltas[0];
  assert(Boolean(delta0.question), "Question delta preserves question text");
  assert(Boolean(delta0.modelAnswers["gemini:gemini-2.5-flash"]), "Model A answer present in delta");
  assert(Boolean(delta0.modelAnswers["gemini:gemini-3.6-flash"]), "Model B answer present in delta");

  // 4. Persistence & Retrieval
  console.log("--- 4. Comparison Vault Persistence & Retrieval ---");
  const retrieved = modelComparator.getComparisonById(report.id);
  assert(Boolean(retrieved && retrieved.id === report.id), `Successfully retrieved report from vault: ${retrieved?.id}`);

  const history = modelComparator.listComparisons();
  assert(history.length >= 1, `Comparison history list contains ${history.length} records`);

  // Summary
  console.log("\n========================================================");
  console.log(`🏁 MODEL COMPARISON TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("========================================================\n");

  if (passed !== total) {
    throw new Error(`Model Comparison tests failed: ${total - passed} failure(s)`);
  }
  return { passed, total };
}

if (require.main === module || process.argv.includes("--run")) {
  runModelComparisonTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
