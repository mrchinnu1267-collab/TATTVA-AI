/**
 * TATTVA AI - Complete GSM8K Mathematical Intelligence Test Suite (Phase 13)
 * Validates 15 core capabilities:
 * 1. Parquet loading
 * 2. Schema validation
 * 3. Dataset registry
 * 4. Training/evaluation separation
 * 5. Mathematical answer extraction
 * 6. Numeric normalization
 * 7. Correct answer comparison
 * 8. Incorrect answer comparison
 * 9. Invalid responses
 * 10. API failures
 * 11. Accuracy calculations
 * 12. Result persistence
 * 13. Model comparison
 * 14. Fine-tuning data conversion
 * 15. Evaluation leakage prevention
 *
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { datasetRegistry } from "../app/lib/evaluation/datasets/dataset-registry";
import { parquetDatasetLoader } from "../app/lib/evaluation/datasets/parquet-loader";
import { mathAnswerExtractor } from "../app/lib/evaluation/gsm8k/math-answer-extractor";
import { mathTopicClassifier } from "../app/lib/evaluation/gsm8k/math-topic-classifier";
import { gsm8kEvaluator } from "../app/lib/evaluation/gsm8k/gsm8k-evaluator";
import { gsm8kModelComparator } from "../app/lib/evaluation/gsm8k/model-comparator";
import { gsm8kFineTuningPipeline } from "../app/lib/evaluation/gsm8k/fine-tuning-pipeline";
import path from "path";
import fs from "fs";

export async function runGsm8kMathematicalIntelligenceTests() {
  console.log("\n========================================================");
  console.log("🧮 TATTVA AI - COMPLETE GSM8K MATHEMATICAL INTELLIGENCE");
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

  // 1. Parquet Loading
  console.log("--- 1. Parquet Loading ---");
  const root = datasetRegistry.resolveCanonicalDatasetsRoot();
  const trainPath = path.join(root, "training/mathematics/gsm8k/train-00000-of-00001.parquet");
  const evalPath = path.join(root, "evaluation/mathematics/gsm8k/test-00000-of-00001.parquet");

  assert(fs.existsSync(trainPath), `Train parquet exists at ${trainPath}`);
  assert(fs.existsSync(evalPath), `Eval parquet exists at ${evalPath}`);
  const evalRecords = await parquetDatasetLoader.readParquetRecords(evalPath, "gsm8k-evaluation");
  assert(evalRecords.length === 1319, `Loaded 1,319 evaluation records from Parquet`);

  // 2. Schema Validation
  console.log("\n--- 2. Schema Validation ---");
  const trainMeta = parquetDatasetLoader.inspectParquetFile(trainPath);
  const evalMeta = parquetDatasetLoader.inspectParquetFile(evalPath);
  assert(trainMeta.columns.some((c) => c.name === "question"), "Train contains question column");
  assert(trainMeta.columns.some((c) => c.name === "answer"), "Train contains answer column");
  assert(evalMeta.columns.some((c) => c.name === "question"), "Eval contains question column");
  assert(evalMeta.columns.some((c) => c.name === "answer"), "Eval contains answer column");

  // 3. Dataset Registry Integration
  console.log("\n--- 3. Dataset Registry Integration ---");
  const regTrain = datasetRegistry.getDatasetById("gsm8k-train");
  const regEval = datasetRegistry.getDatasetById("gsm8k-evaluation");
  assert(Boolean(regTrain), "gsm8k-train registered in manifest");
  assert(Boolean(regEval), "gsm8k-evaluation registered in manifest");
  assert(regTrain?.format === "parquet", "Training format is parquet");
  assert(regEval?.format === "parquet", "Evaluation format is parquet");

  // 4. Training / Evaluation Separation
  console.log("\n--- 4. Training / Evaluation Separation ---");
  assert(regTrain?.datasetType === "training", "gsm8k-train datasetType is 'training'");
  assert(regEval?.datasetType === "evaluation", "gsm8k-evaluation datasetType is 'evaluation'");
  assert(regTrain?.relativePath !== regEval?.relativePath, "Distinct physical paths verified");

  // 5. Mathematical Answer Extraction
  console.log("\n--- 5. Mathematical Answer Extraction ---");
  // Test JSON extraction
  const jsonResp = '{"answer": "42", "explanation": "21 times 2 is 42."}';
  const jsonExt = mathAnswerExtractor.extractAnswer(jsonResp);
  assert(jsonExt.extractedAnswer === "42", `Extracted from JSON: ${jsonExt.extractedAnswer}`);
  assert(jsonExt.normalizedNumericValue === 42, "Normalized JSON numeric value is 42");

  // Test Markdown JSON code fence
  const mdJson = '```json\n{"answer": "$1,250", "explanation": "Total is 1250."}\n```';
  const mdExt = mathAnswerExtractor.extractAnswer(mdJson);
  assert(mdExt.normalizedNumericValue === 1250, "Extracted from Markdown JSON block: 1250");

  // Test LaTeX boxed
  const latexResp = "The area is \\boxed{75} square units.";
  const latexExt = mathAnswerExtractor.extractAnswer(latexResp);
  assert(latexExt.normalizedNumericValue === 75, "Extracted from LaTeX \\boxed{75}");

  // Test natural language delimiter ####
  const hashResp = "First add 10, then add 5.\n#### 15";
  const hashExt = mathAnswerExtractor.extractAnswer(hashResp);
  assert(hashExt.normalizedNumericValue === 15, "Extracted from '#### 15'");

  // 6. Numeric Normalization
  console.log("\n--- 6. Numeric Normalization ---");
  assert(mathAnswerExtractor.normalizeNumericValue("$1,500.00") === 1500, "Normalizes '$1,500.00' to 1500");
  assert(mathAnswerExtractor.normalizeNumericValue("-25") === -25, "Normalizes negative '-25'");
  assert(mathAnswerExtractor.normalizeNumericValue("3/4") === 0.75, "Normalizes fraction '3/4' to 0.75");
  assert(mathAnswerExtractor.normalizeNumericValue("  48.0  ") === 48, "Normalizes decimal '48.0' to 48");

  // 7. Correct Answer Comparison
  console.log("\n--- 7. Correct Answer Comparison ---");
  const comp1 = mathAnswerExtractor.compareAnswers("18", '{"answer": "18", "explanation": "done"}');
  assert(comp1.isCorrect === true, "Exact integer match (18 === 18)");

  const comp2 = mathAnswerExtractor.compareAnswers("2500", "The final cost is $2,500.");
  assert(comp2.isCorrect === true, "Normalized currency with commas matches (2500 === $2,500)");

  // 8. Incorrect Answer Comparison (Anti-Hallucination)
  console.log("\n--- 8. Incorrect Answer Comparison ---");
  const comp3 = mathAnswerExtractor.compareAnswers("18", '{"answer": "20", "explanation": "I calculated 18 earlier but total is 20"}');
  assert(comp3.isCorrect === false, "Incorrect answer detected (18 !== 20, rejects explanation mention of 18)");

  // 9. Invalid Responses
  console.log("\n--- 9. Invalid Responses ---");
  const comp4 = mathAnswerExtractor.compareAnswers("50", "I cannot solve this problem due to missing information.");
  assert(comp4.isInvalid === true, "Flagged as invalid when no number provided");
  assert(comp4.isCorrect === false, "Invalid response scored as not correct");

  // 10. API Failures Handling
  console.log("\n--- 10. API Failures Handling ---");
  // Evaluator handles failures gracefully without crashing
  const failedComp = mathAnswerExtractor.compareAnswers("100", "");
  assert(failedComp.isInvalid === true, "Empty response marked invalid");

  // 11. Accuracy Calculations
  console.log("\n--- 11. Accuracy Calculations ---");
  const evalRun = await gsm8kEvaluator.runEvaluation({
    modelId: "gemini-2.5-flash",
    questionCount: 5,
    seed: 42,
    mockInference: true,
  });
  assert(evalRun.totalQuestions === 5, `Run evaluated 5 questions`);
  assert(evalRun.accuracy === 100, `Mock accuracy calculated: ${evalRun.accuracy}%`);
  assert(evalRun.status === "completed", "Run completed successfully");

  // 12. Result Persistence
  console.log("\n--- 12. Result Persistence ---");
  const history = gsm8kEvaluator.getHistory();
  assert(history.length >= 1, `History persists ${history.length} evaluation runs`);
  assert(history.some((h) => h.runId === evalRun.runId), "Current run persisted in history vault");

  // 13. Model Comparison
  console.log("\n--- 13. Model Comparison ---");
  const comparison = await gsm8kModelComparator.compareModels(
    ["gemini-2.5-flash", "gemini-2.5-pro"],
    5,
    42,
    true
  );
  assert(comparison.models.length === 2, "Compared 2 models");
  assert(comparison.questionCount === 5, "Compared across 5 identical questions");
  assert(comparison.consensusScore >= 0, `Consensus score calculated: ${comparison.consensusScore}%`);

  // 14. Fine-Tuning Data Conversion
  console.log("\n--- 14. Fine-Tuning Data Conversion ---");
  const alpacaSamples = await gsm8kFineTuningPipeline.prepareSftDataset("gsm8k-train", "alpaca", 5);
  assert(alpacaSamples.length === 5, "Generated 5 Alpaca SFT samples");
  assert(Boolean(alpacaSamples[0].instruction), "Alpaca instruction field present");
  assert(Boolean(alpacaSamples[0].input), "Alpaca input problem present");
  assert(Boolean(alpacaSamples[0].output), "Alpaca output solution present");

  const chatmlSamples = await gsm8kFineTuningPipeline.prepareSftDataset("gsm8k-train", "chatml", 5);
  assert(chatmlSamples.length === 5, "Generated 5 ChatML SFT samples");
  assert(chatmlSamples[0].messages?.length === 3, "ChatML contains system, user, assistant messages");

  const readiness = gsm8kFineTuningPipeline.assessTrainingReadiness();
  assert(readiness.isReady === true, "Training pipeline assessed as ready");
  assert(readiness.trainingSamplesCount === 7473, "7,473 training samples validated for SFT");

  // 15. Evaluation Leakage Prevention
  console.log("\n--- 15. Evaluation Leakage Prevention ---");
  let leakageBlocked = false;
  try {
    await gsm8kFineTuningPipeline.prepareSftDataset("gsm8k-evaluation", "alpaca", 5);
  } catch (err: any) {
    leakageBlocked = true;
    assert(
      err.message.includes("gsm8k-evaluation") &&
        (err.message.includes("prohibited") || err.message.includes("Security violation") || err.message.includes("NEVER enter")),
      `Leakage blocked: ${err.message}`
    );
  }
  assert(leakageBlocked, "Evaluation dataset ingestion strictly blocked from fine-tuning pipeline");

  // Answer masking check
  const maskedRecord = datasetRegistry.maskEvaluationAnswers(evalRecords[0]);
  assert(maskedRecord.expectedAnswer === "[PROTECTED_EVALUATION_ANSWER]", "Answer key successfully masked");

  console.log("\n========================================================");
  console.log(`✅ ALL ${passed} / ${total} GSM8K MATHEMATICAL INTELLIGENCE TESTS PASSED!`);
  console.log("========================================================\n");
  return { passed, total };
}

// Direct execution entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  runGsm8kMathematicalIntelligenceTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
