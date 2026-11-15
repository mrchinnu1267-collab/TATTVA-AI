/**
 * TATTVA AI - GSM8K Mathematics Dataset Integration Test Suite
 * Validates Parquet Reader, Schema Integrity, Record Counts, Unicode,
 * Training/Evaluation Boundary Isolation, and Test Contamination Guards.
 *
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { datasetRegistry } from "../app/lib/evaluation/datasets/dataset-registry";
import { parquetDatasetLoader } from "../app/lib/evaluation/datasets/parquet-loader";
import path from "path";
import fs from "fs";

export async function runGsm8kDatasetIntegrationTests() {
  console.log("\n========================================================");
  console.log("📐 TATTVA AI - GSM8K MATHEMATICS DATASET INTEGRATION");
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
      throw new Error(`Assertion failed: ${testName}${detail ? ` - ${detail}` : ""}`);
    }
  }

  // 1. Training Dataset Discovery
  console.log("--- 1. Training Dataset Discovery ---");
  const trainMeta = datasetRegistry.getDatasetById("gsm8k-train");
  assert(Boolean(trainMeta), "gsm8k-train dataset discovered in manifest");
  assert(trainMeta?.format === "parquet", `Format is 'parquet' (got: ${trainMeta?.format})`);
  assert(trainMeta?.datasetType === "training", `DatasetType is 'training' (got: ${trainMeta?.datasetType})`);
  assert(trainMeta?.categories.includes("mathematics") === true, "Category contains 'mathematics'");

  // 2. Evaluation Dataset Discovery
  console.log("\n--- 2. Evaluation Dataset Discovery ---");
  const evalMeta = datasetRegistry.getDatasetById("gsm8k-evaluation");
  assert(Boolean(evalMeta), "gsm8k-evaluation dataset discovered in manifest");
  assert(evalMeta?.format === "parquet", `Format is 'parquet' (got: ${evalMeta?.format})`);
  assert(evalMeta?.datasetType === "evaluation", `DatasetType is 'evaluation' (got: ${evalMeta?.datasetType})`);
  assert(evalMeta?.categories.includes("mathematics") === true, "Category contains 'mathematics'");

  // 3. Parquet File Reading (Asynchronous & Synchronous)
  console.log("\n--- 3. Parquet File Reading ---");
  const root = datasetRegistry.resolveCanonicalDatasetsRoot();
  const trainPath = path.join(root, trainMeta!.relativePath);
  const evalPath = path.join(root, evalMeta!.relativePath);

  assert(fs.existsSync(trainPath), `Training Parquet file exists at: ${trainPath}`);
  assert(fs.existsSync(evalPath), `Evaluation Parquet file exists at: ${evalPath}`);

  const trainInspection = parquetDatasetLoader.inspectParquetFile(trainPath);
  assert(trainInspection.numRows === 7473, `Train metadata inspects 7,473 rows (got: ${trainInspection.numRows})`);

  const evalInspection = parquetDatasetLoader.inspectParquetFile(evalPath);
  assert(evalInspection.numRows === 1319, `Eval metadata inspects 1,319 rows (got: ${evalInspection.numRows})`);

  // 4. Schema Validation
  console.log("\n--- 4. Schema Validation ---");
  const trainColNames = trainInspection.columns.map((c) => c.name);
  assert(trainColNames.includes("question"), "Train schema includes 'question' column");
  assert(trainColNames.includes("answer"), "Train schema includes 'answer' column");

  const evalColNames = evalInspection.columns.map((c) => c.name);
  assert(evalColNames.includes("question"), "Eval schema includes 'question' column");
  assert(evalColNames.includes("answer"), "Eval schema includes 'answer' column");

  // Read samples asynchronously
  const evalRecords = await parquetDatasetLoader.readParquetRecords(evalPath, "gsm8k-evaluation");
  assert(evalRecords.length === 1319, `Read 1,319 eval records asynchronously`);
  assert(typeof evalRecords[0].question === "string" && evalRecords[0].question.length > 10, "Question is non-empty string");
  assert(Boolean(evalRecords[0].expectedAnswer), `Expected answer is parsed: ${evalRecords[0].expectedAnswer}`);
  assert(Array.isArray(evalRecords[0].metadata?.calculationSteps), "Calculation steps parsed into array");

  // 5. Record Counting & Integrity
  console.log("\n--- 5. Record Counting & Total Integrity ---");
  const trainRecords = await parquetDatasetLoader.readParquetRecords(trainPath, "gsm8k-train");
  assert(trainRecords.length === 7473, `Loaded exactly 7,473 training records`);
  assert(evalRecords.length === 1319, `Loaded exactly 1,319 evaluation records`);
  assert(trainRecords.length + evalRecords.length === 8792, `Total GSM8K corpus equals 8,792 records`);

  // 6. Missing-Value Detection & Unicode Handling
  console.log("\n--- 6. Missing-Value Detection & Solution Formatting ---");
  let trainEmptyQ = 0;
  let trainEmptyA = 0;
  for (const r of trainRecords) {
    if (!r.question || r.question.trim() === "") trainEmptyQ++;
    if (!r.expectedAnswer || r.expectedAnswer.trim() === "") trainEmptyA++;
  }
  assert(trainEmptyQ === 0, `Training set has 0 empty questions`);
  assert(trainEmptyA === 0, `Training set has 0 empty answers`);

  let evalEmptyQ = 0;
  let evalEmptyA = 0;
  for (const r of evalRecords) {
    if (!r.question || r.question.trim() === "") evalEmptyQ++;
    if (!r.expectedAnswer || r.expectedAnswer.trim() === "") evalEmptyA++;
  }
  assert(evalEmptyQ === 0, `Evaluation set has 0 empty questions`);
  assert(evalEmptyA === 0, `Evaluation set has 0 empty answers`);

  // Check Unicode and math solution format
  assert(evalRecords[0].metadata?.fullSolution.includes("####"), "Solution contains '####' delimiter");
  assert(/^\s*-?[\d,]+(?:\.\d+)?\s*$/.test(evalRecords[0].expectedAnswer!), `Final answer is valid numeric format: ${evalRecords[0].expectedAnswer}`);

  // 7. Dataset Registry Integration
  console.log("\n--- 7. Dataset Registry Integration ---");
  const mathDatasets = datasetRegistry.listDatasetsByCategory("mathematics");
  const mathIds = mathDatasets.map((d) => d.id);
  assert(mathIds.includes("gsm8k-train"), "listDatasetsByCategory('mathematics') contains 'gsm8k-train'");
  assert(mathIds.includes("gsm8k-evaluation"), "listDatasetsByCategory('mathematics') contains 'gsm8k-evaluation'");

  // 8. Training/Evaluation Separation
  console.log("\n--- 8. Training/Evaluation Separation ---");
  const trainingDatasets = datasetRegistry.listDatasetsByType("training");
  const evalDatasets = datasetRegistry.listDatasetsByType("evaluation");

  assert(trainingDatasets.some((d) => d.id === "gsm8k-train"), "Training datasets list includes 'gsm8k-train'");
  assert(!trainingDatasets.some((d) => d.id === "gsm8k-evaluation"), "Training datasets list strictly excludes 'gsm8k-evaluation'");
  assert(evalDatasets.some((d) => d.id === "gsm8k-evaluation"), "Evaluation datasets list includes 'gsm8k-evaluation'");
  assert(!evalDatasets.some((d) => d.id === "gsm8k-train"), "Evaluation datasets list strictly excludes 'gsm8k-train'");
  assert(trainMeta!.relativePath !== evalMeta!.relativePath, "Training and evaluation have distinct relative paths");

  // 9. Evaluation Data Contamination Prevention & Answer Masking
  console.log("\n--- 9. Evaluation Contamination Prevention & Answer Masking ---");
  const leakageCheckTrain = datasetRegistry.preventTrainingDataLeakage({ datasetId: "gsm8k-train" });
  assert(leakageCheckTrain.allowed === true, "Training dataset allowed in training pipeline");

  const leakageCheckEval = datasetRegistry.preventTrainingDataLeakage({ datasetId: "gsm8k-evaluation" });
  assert(leakageCheckEval.allowed === false, "Evaluation dataset strictly blocked from training pipeline");
  assert(leakageCheckEval.reason?.includes("Security violation") === true, `Security violation reason reported: ${leakageCheckEval.reason}`);

  // Answer masking test
  const maskedSample = datasetRegistry.maskEvaluationAnswers(evalRecords[0]);
  assert(maskedSample.expectedAnswer === "[PROTECTED_EVALUATION_ANSWER]", "Answer masked in protected record");
  assert(maskedSample.metadata?.fullSolution === "[PROTECTED]", "Full solution masked in protected record");
  assert(maskedSample.question === evalRecords[0].question, "Original question preserved for model prompt");

  // 10. File-Not-Found Handling
  console.log("\n--- 10. File-Not-Found Handling ---");
  let fileNotFoundCaught = false;
  try {
    parquetDatasetLoader.inspectParquetFile("datasets/non_existent_file.parquet");
  } catch (err: any) {
    fileNotFoundCaught = true;
    assert(err.message.includes("Parquet file not found"), `Clean error thrown on missing file: ${err.message}`);
  }
  assert(fileNotFoundCaught, "File-not-found error successfully caught and handled");

  console.log("\n========================================================");
  console.log(`✅ ALL ${passed} / ${total} GSM8K DATASET INTEGRATION TESTS PASSED!`);
  console.log("========================================================\n");
  return { passed, total };
}

// Direct execution entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  runGsm8kDatasetIntegrationTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
