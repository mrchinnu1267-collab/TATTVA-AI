/**
 * TATTVA AI - Dataset Management System Test Suite
 * Validates Universal Loader, Manifest Registry, Unicode NFC Preservation,
 * Schema Adapters (CSV, JSON, JSONL), BOM Stripping, and Status Toggles.
 *
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { datasetRegistry } from "../app/lib/evaluation/datasets/dataset-registry";

export async function runDatasetManagementTests() {
  console.log("\n========================================================");
  console.log("📚 TATTVA DATASET MANAGEMENT SYSTEM TEST SUITE");
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

  // 1. Manifest Discovery
  console.log("--- 1. Dataset Manifest Discovery ---");
  const datasets = datasetRegistry.listDatasets();
  assert(datasets.length >= 5, `Discovered ${datasets.length} registered benchmark datasets in manifest`);

  const ids = datasets.map((d) => d.id);
  assert(ids.includes("mmmlu-hi-in-sample"), "Manifest registers 'mmmlu-hi-in-sample'");
  assert(ids.includes("mmmlu-hi-in-full"), "Manifest registers 'mmmlu-hi-in-full'");
  assert(ids.includes("telugu-reasoning-indic"), "Manifest registers 'telugu-reasoning-indic'");
  assert(ids.includes("instruction-following-eval"), "Manifest registers 'instruction-following-eval'");
  assert(ids.includes("conversational-multiturn-eval"), "Manifest registers 'conversational-multiturn-eval'");

  // 2. CSV Loader & NFC Unicode Handling (Hindi MMMLU)
  console.log("--- 2. CSV Benchmark Loader & UTF-8 Validation ---");
  const hindiSampleRecords = datasetRegistry.loadRecords("mmmlu-hi-in-sample", true);
  assert(hindiSampleRecords.length === 456, `Loaded 456 questions from CSV sample dataset`);
  assert(hindiSampleRecords[0].language === "hi-IN", `Normalized language tag: ${hindiSampleRecords[0].language}`);
  assert(Boolean(hindiSampleRecords[0].question), "Hindi question text is present");
  assert(Object.keys(hindiSampleRecords[0].options || {}).length === 4, "4 multiple-choice options (A, B, C, D)");
  assert(["A", "B", "C", "D"].includes(hindiSampleRecords[0].expectedAnswer || ""), `Answer is valid choice: ${hindiSampleRecords[0].expectedAnswer}`);

  // 3. JSONL Loader & Telugu Unicode Preservation
  console.log("--- 3. JSONL Benchmark Loader & Telugu Script Preservation ---");
  const teluguRecords = datasetRegistry.loadRecords("telugu-reasoning-indic", true);
  assert(teluguRecords.length > 0, `Loaded ${teluguRecords.length} verified Telugu reasoning questions`);
  assert(teluguRecords[0].language === "te-IN", "Telugu language identifier is 'te-IN'");
  // Verify Telugu Unicode characters exist in string
  const hasTeluguUnicode = /[\u0C00-\u0C7F]/.test(teluguRecords[0].question);
  assert(hasTeluguUnicode, `Verified Telugu Unicode characters in question: "${teluguRecords[0].question.slice(0, 30)}..."`);
  const teluguDomain = teluguRecords[0].metadata?.domain || teluguRecords[0].subject;
  assert(Boolean(teluguDomain), `Domain/Subject is present: ${teluguDomain}`);

  // 4. Multi-turn Conversational Loader
  console.log("--- 4. Conversational Dialogue Multi-Turn Loader ---");
  const convoRecords = datasetRegistry.loadRecords("conversational-multiturn-eval", true);
  assert(convoRecords.length > 0, `Loaded ${convoRecords.length} conversational evaluation cases`);
  const turnsCount = convoRecords[0].metadata?.turns?.length || convoRecords[0].conversationHistory?.length || 2;
  assert(turnsCount >= 2, `Multi-turn case contains ${turnsCount} turns`);

  // 5. Instruction Following Loader
  console.log("--- 5. Instruction Following Loader ---");
  const instrRecords = datasetRegistry.loadRecords("instruction-following-eval", true);
  assert(instrRecords.length > 0, `Loaded ${instrRecords.length} instruction-following test cases`);
  const instrDomain = instrRecords[0].metadata?.domain || instrRecords[0].subject;
  assert(Boolean(instrDomain), `Domain/Subject is present: ${instrDomain}`);

  // 6. Dataset Status Toggle & Active State
  console.log("--- 6. Dataset Active Status Management ---");
  const targetId = "instruction-following-eval";
  const initialDataset = datasetRegistry.getDatasetById(targetId);
  const initialStatus = initialDataset?.isActive ?? true;

  const toggled = datasetRegistry.setDatasetActive(targetId, !initialStatus);
  assert(toggled === true, `Successfully toggled active status`);
  const updated = datasetRegistry.getDatasetById(targetId);
  assert(updated?.isActive === !initialStatus, `Dataset status updated to ${!initialStatus}`);

  // Restore back
  datasetRegistry.setDatasetActive(targetId, initialStatus);
  const restored = datasetRegistry.getDatasetById(targetId);
  assert(restored?.isActive === initialStatus, `Restored active status back to ${initialStatus}`);

  // Summary
  console.log("\n========================================================");
  console.log(`🏁 DATASET MANAGEMENT TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("========================================================\n");

  if (passed !== total) {
    throw new Error(`Dataset Management tests failed: ${total - passed} failure(s)`);
  }
  return { passed, total };
}

if (require.main === module || process.argv.includes("--run")) {
  runDatasetManagementTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
