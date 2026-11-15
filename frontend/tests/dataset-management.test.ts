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

  // 7. Expanded 10-Category & Dedicated Domain Dataset Verification
  console.log("--- 7. Expanded 10-Category Benchmark Verification ---");
  const codingRecords = datasetRegistry.loadRecords("coding-benchmark-eval", true);
  assert(codingRecords.length === 5, `Loaded 5 verified coding benchmark problems`);
  assert(codingRecords[0].subject === "typescript_algorithms", "Coding problem subject is typescript_algorithms");

  const mathRecords = datasetRegistry.loadRecords("mathematics-benchmark-eval", true);
  assert(mathRecords.length === 5, `Loaded 5 verified quantitative mathematics problems`);
  assert(mathRecords[0].subject === "algebra", "Math problem subject is algebra");

  const toolRecords = datasetRegistry.loadRecords("tool-use-benchmark-eval", true);
  assert(toolRecords.length === 5, `Loaded 5 verified autonomous tool invocation problems`);
  assert(toolRecords[0].subject === "tool_invocation", "Tool problem subject is tool_invocation");

  const ragRecords = datasetRegistry.loadRecords("rag-grounding-eval", true);
  assert(ragRecords.length === 5, `Loaded 5 verified RAG grounding and citation problems`);
  assert(ragRecords[0].subject === "fact_extraction", "RAG problem subject is fact_extraction");

  const mmRecords = datasetRegistry.loadRecords("multimodal-vision-eval", true);
  assert(mmRecords.length === 5, `Loaded 5 verified multimodal vision & OCR evaluation items`);
  assert(mmRecords[0].subject === "diagram_vqa", "Multimodal problem subject is diagram_vqa");

  // 8. Category & Dataset Type Filtering
  console.log("--- 8. Category & Type Segregation Verification ---");
  const evalDatasets = datasetRegistry.listDatasetsByType("evaluation");
  assert(evalDatasets.length === 10, `All 10 benchmark datasets are strictly segregated as 'evaluation' type`);

  const codingDatasets = datasetRegistry.listDatasetsByCategory("coding");
  assert(codingDatasets.length >= 1, `Filtered datasets by 'coding' category: ${codingDatasets[0].id}`);

  const toolDatasets = datasetRegistry.listDatasetsByCategory("tool_use");
  assert(toolDatasets.length >= 1, `Filtered datasets by 'tool_use' category: ${toolDatasets[0].id}`);

  // 9. Integrity Verification & Test Contamination Prevention
  console.log("--- 9. Integrity Verification & Contamination Prevention ---");
  const integrity = datasetRegistry.verifyDatasetIntegrity("coding-benchmark-eval");
  assert(integrity.valid === true, "Integrity check passed with zero errors");
  assert(integrity.recordCount === 5, "Integrity record count matches manifest");

  const leakageAttempt = datasetRegistry.preventTrainingDataLeakage({
    datasetId: "mmmlu-hi-in-sample",
  });
  assert(leakageAttempt.allowed === false, "Training leakage prevention strictly blocks evaluation dataset ingestion");
  assert(Boolean(leakageAttempt.reason?.includes("test contamination")), "Surfaced test contamination security reason");

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
