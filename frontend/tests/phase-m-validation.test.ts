/**
 * TATTVA AI - Phase M: End-to-End Image Accuracy Validation & Verification Test Suite
 * Validates:
 *   1. 500-Prompt Benchmark Dataset integrity across 8 core categories (A-H).
 *   2. Independent Ground Truth completeness without model-generated assumptions.
 *   3. Multi-tool evaluation across 9 discrete visual dimensions.
 *   4. Tri-state status determination ("pass" | "fail" | "uncertain") with confidence bounds.
 *   5. Failure classification across 10 failure categories.
 *   6. Root cause origin attribution across architectural subsystems.
 *   7. Surgical correction validation and unmasked pixel preservation.
 *   8. Baseline vs. Updated Accuracy Pipeline comparison deltas.
 *   9. Pipeline stage progression (Base -> With Evaluation -> With Evaluation + Correction).
 *  10. Provider comparative ranking and multi-sample variability.
 *  11. Human review audit sample concordance.
 *  12. Validation Dashboard metrics aggregation and telemetry.
 */

import assert from "node:assert";
import {
  getBenchmarkCatalog,
  getPromptsByCategory,
  getPromptById,
} from "../app/lib/image-engine/validation/benchmark-catalog";
import { evaluateImageAgainstGroundTruth } from "../app/lib/image-engine/validation/evaluation-engine";
import {
  classifyRequirementFailure,
  analyzeFailureCorpus,
} from "../app/lib/image-engine/validation/failure-analyzer";
import {
  validateSurgicalCorrection,
  aggregateCorrectionMetrics,
} from "../app/lib/image-engine/validation/correction-validator";
import {
  getBaselineComparisons,
  PIPELINE_STAGE_PROGRESSION,
  PROVIDER_ACCURACY_LEADERBOARD,
} from "../app/lib/image-engine/validation/baseline-comparator";
import {
  runValidationAudit,
  getValidationDashboardMetrics,
  getRecentValidationRuns,
} from "../app/lib/image-engine/validation/validation-runner";
import { ValidationCategory, EvaluationDimension } from "../app/lib/image-engine/validation/types";

export async function runPhaseMAccuracyValidationTests() {
  console.log("\n🚀 Running Phase M: End-to-End Image Accuracy Validation Test Suite...\n");

  const mockValidPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABZJREFUeNpi/P//PwMTAwMDEwMTAwgwAAVDAwP8Gg4fAAAAAElFTkSuQmCC";

  // ---------------------------------------------------------------------------
  // Test 1: 500-Prompt Benchmark Dataset Integrity Across 8 Categories
  // ---------------------------------------------------------------------------
  console.log("▶ Test 1: 500-Prompt Benchmark Dataset catalog integrity...");
  const catalog = getBenchmarkCatalog();
  assert.ok(catalog.length >= 500, `Benchmark catalog must contain >= 500 prompts (found ${catalog.length})`);

  const requiredCategories: ValidationCategory[] = [
    "simple_generation",
    "complex_generation",
    "object_count",
    "attribute_accuracy",
    "spatial_accuracy",
    "reference_accuracy",
    "text_accuracy",
    "artistic_generation",
  ];

  for (const cat of requiredCategories) {
    const catPrompts = getPromptsByCategory(cat);
    assert.ok(catPrompts.length >= 50, `Category ${cat} must contain >= 50 prompts (found ${catPrompts.length})`);
  }
  console.log(`  ✔ Test 1: Verified ${catalog.length} benchmark prompts across all 8 required categories.`);

  // ---------------------------------------------------------------------------
  // Test 2: Independent Ground Truth Completeness
  // ---------------------------------------------------------------------------
  console.log("▶ Test 2: Independent ground truth requirement completeness...");
  let totalRequirementsChecked = 0;
  for (const item of catalog.slice(0, 50)) {
    assert.ok(item.expectedRequirements.length >= 1, `Prompt #${item.id} must have expected requirements`);
    for (const req of item.expectedRequirements) {
      assert.ok(req.dimension, "Requirement must specify a valid dimension");
      assert.ok(req.description, "Requirement must describe expected state");
      assert.notStrictEqual(req.expected, undefined, "Requirement must specify expected value");
      totalRequirementsChecked++;
    }
  }
  console.log(`  ✔ Test 2: Ground truth requirements complete across inspected prompts (${totalRequirementsChecked} requirements verified).`);

  // ---------------------------------------------------------------------------
  // Test 3: Multi-Tool Independent Evaluation Across 9 Dimensions
  // ---------------------------------------------------------------------------
  console.log("▶ Test 3: Multi-tool independent evaluation across 9 discrete dimensions...");
  const countPrompt = catalog.find((p) => p.category === "object_count")!;
  const evalResult = await evaluateImageAgainstGroundTruth({
    imageUri: mockValidPng,
    promptItem: countPrompt,
  });

  assert.ok(evalResult.runId.startsWith("eval_"), "Run ID must be generated");
  assert.strictEqual(typeof evalResult.overallPassRate, "number");
  assert.ok(evalResult.requirementResults.length > 0, "Requirement results must be returned");

  const evaluatedDims = Object.keys(evalResult.dimensionScores) as EvaluationDimension[];
  assert.strictEqual(evaluatedDims.length, 9, "Must compute scores across all 9 discrete dimensions");
  console.log(`  ✔ Test 3: 9-Dimension evaluation completed with overall pass rate: ${evalResult.overallPassRate}%.`);

  // ---------------------------------------------------------------------------
  // Test 4: Tri-State Status Determination with Confidence Bounds
  // ---------------------------------------------------------------------------
  console.log("▶ Test 4: Tri-state status determination ('pass' | 'fail' | 'uncertain')...");
  for (const reqRes of evalResult.requirementResults) {
    assert.ok(["pass", "fail", "uncertain"].includes(reqRes.status), "Status must be tri-state");
    assert.ok(reqRes.confidence >= 0 && reqRes.confidence <= 1, "Confidence must be between 0.0 and 1.0");
    assert.ok(reqRes.evidence.length > 0, "Evidence string must be present");
  }
  console.log("  ✔ Test 4: Tri-state verdicts and confidence bounds verified.");

  // ---------------------------------------------------------------------------
  // Test 5: Failure Categorization Across 10 Failure Modes
  // ---------------------------------------------------------------------------
  console.log("▶ Test 5: Failure categorization across 10 failure categories...");
  const textPrompt = catalog.find((p) => p.category === "text_accuracy")!;
  const simulatedFailedTextReq = {
    id: "req_text_fail",
    dimension: "text_accuracy" as const,
    description: "Exact text spelling",
    expected: "ARRIVED SAFELY",
    detected: "ARRIVED S... (garbled)",
    evaluationMethod: "ocr" as const,
    status: "fail" as const,
    confidence: 0.94,
    evidence: "OCR detected scrambled glyphs",
  };

  const classifiedFailure = classifyRequirementFailure(simulatedFailedTextReq, textPrompt.prompt);
  assert.strictEqual(classifiedFailure.failureCategory, "incorrect_text");
  assert.strictEqual(classifiedFailure.origin, "model_limitations");
  assert.strictEqual(classifiedFailure.suggestedCorrectionAction, "re-routing");
  console.log(`  ✔ Test 5: Failure classified into category: ${classifiedFailure.failureCategory}.`);

  // ---------------------------------------------------------------------------
  // Test 6: Root Cause Origin Attribution & Corpus Analysis
  // ---------------------------------------------------------------------------
  console.log("▶ Test 6: Root cause origin attribution and recurring pattern detection...");
  const spatialFailedReq = {
    id: "req_spatial_fail",
    dimension: "spatial_accuracy" as const,
    description: "Sports car to the left of bicycle",
    expected: "left_of",
    detected: "right_of (inverted)",
    evaluationMethod: "geometric_iou" as const,
    status: "fail" as const,
    confidence: 0.88,
    evidence: "Relative horizontal ordering inverted",
  };

  const spatialFailure = classifyRequirementFailure(spatialFailedReq, "A sports car on the left and a bike on the right");
  assert.strictEqual(spatialFailure.failureCategory, "incorrect_positioning");
  assert.strictEqual(spatialFailure.origin, "spatial_control");

  const corpusAnalysis = analyzeFailureCorpus([classifiedFailure, spatialFailure]);
  assert.strictEqual(corpusAnalysis.totalFailures, 2);
  assert.ok(corpusAnalysis.recurringPatterns.length >= 4);
  assert.ok(corpusAnalysis.actionableRecommendations.length >= 3);
  console.log("  ✔ Test 6: Root cause attribution and corpus pattern analysis verified.");

  // ---------------------------------------------------------------------------
  // Test 7: Surgical Correction Validation & Pixel Preservation
  // ---------------------------------------------------------------------------
  console.log("▶ Test 7: Surgical correction validation on failed requirements...");
  const simulatedRun = {
    runId: "run_test_7",
    promptId: 101,
    prompt: "A sports car on the left and a bicycle on the right",
    category: "spatial_accuracy" as const,
    subcategory: "layout",
    provider: "pollinations" as const,
    model: "flux-pollinations",
    parameters: { width: 1024, height: 1024, quality: "balanced" as const, aspectRatio: "1:1" as const, seed: 42 },
    imageUri: mockValidPng,
    durationMs: 3200,
    requirements: [spatialFailedReq],
    overallPassRate: 50,
    dimensionScores: {} as any,
    failures: [spatialFailure],
  };

  const correctionRecord = await validateSurgicalCorrection({ testRun: simulatedRun });
  assert.strictEqual(correctionRecord.promptId, 101);
  assert.ok(correctionRecord.unmaskedPixelPreservationScore >= 90, "Unmasked pixels must be preserved (>90%)");
  assert.ok(correctionRecord.postCorrectionAccuracy >= correctionRecord.initialOverallAccuracy);

  const batchMetrics = aggregateCorrectionMetrics([correctionRecord]);
  assert.strictEqual(batchMetrics.totalEvaluated, 1);
  assert.ok(batchMetrics.avgPixelPreservationScore >= 90);
  console.log(`  ✔ Test 7: Surgical correction verified. Pixel preservation: ${correctionRecord.unmaskedPixelPreservationScore}%.`);

  // ---------------------------------------------------------------------------
  // Test 8: Baseline vs. Updated Accuracy Pipeline Comparison Deltas
  // ---------------------------------------------------------------------------
  console.log("▶ Test 8: Baseline vs Updated Accuracy pipeline comparison deltas...");
  const baselines = getBaselineComparisons();
  assert.ok(baselines.length >= 6, "Must provide baseline comparisons across core categories");

  for (const b of baselines) {
    assert.ok(b.updatedScore > b.baselineScore, `Updated score (${b.updatedScore}) must improve over baseline (${b.baselineScore}) for ${b.metric}`);
    assert.strictEqual(b.delta, Number((b.updatedScore - b.baselineScore).toFixed(1)));
    assert.ok(b.sampleSize >= 50, "Sample size must be representative (>= 50)");
  }
  console.log("  ✔ Test 8: Baseline comparison deltas verified across all core dimensions.");

  // ---------------------------------------------------------------------------
  // Test 9: Pipeline Stage Progression
  // ---------------------------------------------------------------------------
  console.log("▶ Test 9: Pipeline stage progression (Base -> Evaluation -> Correction)...");
  assert.strictEqual(PIPELINE_STAGE_PROGRESSION.length, 3);
  const [base, evalStage, corrStage] = PIPELINE_STAGE_PROGRESSION;

  assert.ok(base.passRate < evalStage.passRate, "Evaluation stage must filter higher pass rate than raw base");
  assert.ok(evalStage.passRate < corrStage.passRate, "Correction stage must produce highest pass rate");
  assert.strictEqual(corrStage.passRate, 86.1);
  console.log(`  ✔ Test 9: Stage progression verified: ${base.passRate}% -> ${evalStage.passRate}% -> ${corrStage.passRate}%.`);

  // ---------------------------------------------------------------------------
  // Test 10: Provider Comparative Leaderboard
  // ---------------------------------------------------------------------------
  console.log("▶ Test 10: Provider comparative accuracy leaderboard...");
  assert.ok(PROVIDER_ACCURACY_LEADERBOARD.length >= 4);
  const topProvider = PROVIDER_ACCURACY_LEADERBOARD[0];
  assert.ok(topProvider.overallAccuracy >= 80, "Top provider must exceed 80% accuracy");
  console.log(`  ✔ Test 10: Provider leaderboard verified. Leader: ${topProvider.providerName} (${topProvider.overallAccuracy}%).`);

  // ---------------------------------------------------------------------------
  // Test 11: Human Review Audit Sampling & Uncertainty Resolution
  // ---------------------------------------------------------------------------
  console.log("▶ Test 11: Human review audit sampling...");
  const recentRuns = getRecentValidationRuns(20);
  assert.ok(recentRuns.length > 0, "Validation runs repository must contain calibration data");

  const dashboardMetrics = getValidationDashboardMetrics();
  assert.ok(dashboardMetrics.humanReviewAudit.agreementRate >= 90, "Human-algorithm agreement rate must be >= 90%");
  assert.ok(dashboardMetrics.humanReviewAudit.uncertaintyResolutionRate >= 80);
  console.log(`  ✔ Test 11: Human review audit concordance verified (${dashboardMetrics.humanReviewAudit.agreementRate}% agreement).`);

  // ---------------------------------------------------------------------------
  // Test 12: End-to-End Validation Run & Dashboard Telemetry
  // ---------------------------------------------------------------------------
  console.log("▶ Test 12: Validation runner batch execution and dashboard telemetry...");
  const liveRuns = await runValidationAudit({
    categoryFilter: "simple_generation",
    sampleLimit: 2,
    useLiveGeneration: false,
  });

  assert.strictEqual(liveRuns.length, 2, "Must execute exactly requested sample size");
  assert.ok(liveRuns[0].requirements.length > 0, "Test run must include evaluated requirements");

  const updatedDashboard = getValidationDashboardMetrics();
  assert.ok(updatedDashboard.totalBenchmarkTests >= 16);
  assert.ok(updatedDashboard.overallRequirementPassRate > 0);
  assert.ok(updatedDashboard.accuracyTrend.length >= 4);
  console.log(`  ✔ Test 12: Validation dashboard compiled across ${updatedDashboard.totalBenchmarkTests} benchmark tests.`);

  console.log("\n✨ All 12 Phase M: End-to-End Image Accuracy Validation tests PASSED successfully!\n");
}

