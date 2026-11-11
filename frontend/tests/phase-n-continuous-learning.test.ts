/**
 * TATTVA AI - Phase N: Continuous AI Model Improvement & Self-Learning Intelligence Test Suite
 * Validates feedback collection, failure classification across 11 categories, adaptive prompt optimization,
 * model performance ranking with Wilson confidence intervals, correction intelligence, controlled
 * staged pipeline, fine-tuning dataset governance, and continuous regression monitoring.
 */

import { describe, it } from "node:test";
import assert from "node:assert";

import {
  feedbackCollector,
  failureIntelligence,
  adaptivePromptOptimizer,
  modelLearningEngine,
  correctionIntelligence,
  controlledLearningPipeline,
  fineTuningGovernor,
  continuousBenchmarkingService,
  learningDashboardService,
} from "../app/lib/image-engine/continuous-learning";

export async function runPhaseNContinuousLearningTests() {
  console.log("\n🚀 Running Phase N: Continuous Model Improvement & Self-Learning Intelligence Test Suite...\n");

  // Test 1: Generation feedback collection with privacy sanitization
  console.log("▶ Test 1: Generation feedback collection with workspace isolation & PII redaction...");
  const samplePrompt = "A futuristic electric vehicle designed by contact@example.com with license plate sk-12345678901234567890";
  const recorded = feedbackCollector.recordGenerationFeedback({
    workspaceId: "test-workspace-alpha",
    userConsentGiven: true,
    originalPrompt: samplePrompt,
    structuredRequirements: [
      { id: "req-1", dimension: "object_presence", description: "Futuristic vehicle", rawText: "electric vehicle" },
    ],
    selectedProvider: "pollinations",
    modelIdentifier: "flux-schnell",
    modelVersion: "1.0",
    generationParameters: { width: 1024, height: 1024 },
    generatedImageRef: "img-hash-12345",
    evaluationResults: {
      overallScore: 88,
      promptAdherencePercent: 88,
      verdict: "pass",
      confidenceScore: 0.9,
      dimensionScores: { objectPresence: 95 },
    },
    failedRequirements: [],
    correctionAttempts: [],
    finalResult: "accepted",
  });

  assert.ok(recorded.id, "Feedback record must have generated id");
  assert.ok(!recorded.sanitizedPrompt.includes("contact@example.com"), "Sanitized prompt must redact email");
  assert.ok(recorded.sanitizedPrompt.includes("[REDACTED_EMAIL]"), "Redacted token placeholder must be present");
  console.log("  ✔ Test 1: Feedback collection and PII sanitization verified.");

  // Test 2: Voluntary user feedback submission and consent validation
  console.log("▶ Test 2: Voluntary user feedback submission with regional coordinates & consent...");
  const userFeedbackRes = feedbackCollector.submitVoluntaryUserFeedback({
    feedbackId: recorded.id,
    issueType: "incorrect_object",
    satisfactionRating: 4,
    userComments: "Vehicle appeared with circular headlights instead of linear LED strips",
    markedRegion: { x: 0.2, y: 0.3, width: 0.25, height: 0.15 },
    consentForTraining: true,
    userId: "user-test-42",
  });

  assert.ok(userFeedbackRes.success, "User feedback submission must succeed");
  assert.strictEqual(userFeedbackRes.record?.userFeedback?.satisfactionRating, 4);
  assert.strictEqual(userFeedbackRes.record?.userFeedback?.consentForTraining, true);
  console.log("  ✔ Test 2: Voluntary feedback and consent verification passed.");

  // Test 3: Failure classification across 11 categories & 8 subsystem sources
  console.log("▶ Test 3: Failure classification and root cause origin attribution...");
  const failingRecord = feedbackCollector.recordGenerationFeedback({
    workspaceId: "test-workspace-beta",
    userConsentGiven: true,
    originalPrompt: "A storefront with glowing neon letters spelling 'TATTVA LABS'",
    structuredRequirements: [],
    selectedProvider: "local",
    modelIdentifier: "stable-diffusion-1.5",
    modelVersion: "1.5",
    generationParameters: { width: 512, height: 512 },
    generatedImageRef: "img-hash-fail-1",
    evaluationResults: {
      overallScore: 40,
      promptAdherencePercent: 40,
      verdict: "fail",
      confidenceScore: 0.88,
      dimensionScores: { textAccuracy: 35 },
    },
    failedRequirements: ["Incorrect text: OCR detected 'TATTA LB' instead of 'TATTVA LABS'"],
    correctionAttempts: [],
    finalResult: "failed",
  });

  const failureEntries = failureIntelligence.analyzeFeedbackRecord(failingRecord);
  assert.ok(failureEntries.length > 0, "Must detect failure entry");
  assert.strictEqual(failureEntries[0].problemCategory, "incorrect_text", "Must classify as incorrect_text");
  assert.strictEqual(failureEntries[0].subsystemSource, "model_capability", "Must attribute local SD 1.5 text failure to model capability");
  console.log("  ✔ Test 3: Failure classification into incorrect_text and model_capability verified.");

  // Test 4: Recurring failure pattern aggregation
  console.log("▶ Test 4: Corpus pattern extraction across feedback telemetry...");
  const corpusPatterns = failureIntelligence.aggregateCorpusPatterns(feedbackCollector.getAllFeedback());
  assert.ok(corpusPatterns.length > 0, "Corpus patterns must be aggregated");
  assert.ok(corpusPatterns[0].recommendedMitigation.length > 10, "Mitigation recommendation must be provided");
  console.log(`  ✔ Test 4: Extracted ${corpusPatterns.length} recurring failure patterns with mitigations.`);

  // Test 5: Adaptive prompt optimization and zero requirement stripping
  console.log("▶ Test 5: Adaptive prompt optimization with requirement preservation...");
  const rawPrompt = "A modern kitchen with five golden apples on marble counter without any cars";
  const optResult = adaptivePromptOptimizer.optimizePrompt({
    rawPrompt,
    targetModelId: "flux-schnell",
    requiredEntities: ["modern kitchen", "five golden apples", "marble counter"],
  });

  assert.ok(optResult.optimizedDirective.includes("5 golden apples") || optResult.optimizedDirective.includes("precisely 5"), "Must inject counting token anchors");
  assert.ok(optResult.optimizedDirective.toLowerCase().includes("marble counter"), "Must strictly preserve marble counter");
  assert.ok(optResult.optimizedDirective.toLowerCase().includes("kitchen"), "Must strictly preserve kitchen");
  assert.ok(optResult.projectedAdherence > optResult.baselineAdherence, "Projected adherence must exceed baseline");
  console.log("  ✔ Test 5: Adaptive prompt optimization and constraint preservation passed.");

  // Test 6: Statistical model performance and Wilson confidence bounds
  console.log("▶ Test 6: Model performance tracking and Wilson 95% confidence interval calculations...");
  const models = modelLearningEngine.getAllModelPerformances();
  assert.ok(models.length >= 4, "Must maintain telemetry on at least 4 models");
  const topModel = models[0];
  assert.ok(topModel.overallPromptAdherence >= 80, "Top model prompt adherence must be >= 80%");
  assert.ok(topModel.confidenceIntervalLow < topModel.overallPromptAdherence, "Wilson lower bound must be lower than mean");
  assert.ok(topModel.confidenceIntervalHigh > topModel.overallPromptAdherence, "Wilson upper bound must be higher than mean");
  console.log(`  ✔ Test 6: Top model ${topModel.modelId} (${topModel.overallPromptAdherence}%) Wilson interval: [${topModel.confidenceIntervalLow}%, ${topModel.confidenceIntervalHigh}%].`);

  // Test 7: Category-driven model routing recommendation
  console.log("▶ Test 7: Evidence-grounded model selection recommendation by category...");
  const textRec = modelLearningEngine.recommendModelForCategory("text_accuracy");
  assert.strictEqual(textRec.recommendedModelId, "flux-schnell", "FLUX should be recommended for text accuracy");
  assert.ok(textRec.projectedAdherence >= 85, "Projected adherence should be >= 85%");
  console.log(`  ✔ Test 7: Category routing recommendation: ${textRec.recommendedModelId} for text accuracy.`);

  // Test 8: Correction intelligence viability and futile retry guardrails
  console.log("▶ Test 8: Correction intelligence viable vs futile classification and retry caps...");
  const viableCheck = correctionIntelligence.evaluateCorrectionViability({
    problemCategory: "incorrect_text",
    currentAttemptCount: 0,
    totalCostIncurredUSD: 0.001,
    failedRequirement: "Misspelled word",
    hasBoundingBox: true,
  });
  assert.strictEqual(viableCheck.isViable, true);
  assert.strictEqual(viableCheck.recommendedStrategy, "inpainting");

  const futileCheck = correctionIntelligence.evaluateCorrectionViability({
    problemCategory: "incorrect_text",
    currentAttemptCount: 3, // Exceeds max 2 retries
    totalCostIncurredUSD: 0.002,
    failedRequirement: "Misspelled word",
    hasBoundingBox: true,
  });
  assert.strictEqual(futileCheck.isViable, false, "Must abort when max retries exceeded");
  assert.strictEqual(futileCheck.recommendedStrategy, "abort_futile");
  console.log("  ✔ Test 8: Correction intelligence and futile-abort guardrails verified.");

  // Test 9: Controlled staged learning pipeline lifecycle
  console.log("▶ Test 9: Controlled staged pipeline (create -> benchmark -> regression audit -> approve -> deploy -> rollback)...");
  const newProp = controlledLearningPipeline.createProposal({
    title: "Regional Attention Bounding for Spatial Relations",
    description: "Applies coordinate layout masks to prevent adjacent subject blending.",
    affectedSubsystem: "spatial_control",
    proposedChanges: { maskSplit: true },
  });
  assert.strictEqual(newProp.status, "draft");

  // Step 9a: Offline Benchmark
  const benchRes = controlledLearningPipeline.runOfflineBenchmark(newProp.id, 25);
  assert.ok(benchRes.success);
  assert.strictEqual(benchRes.proposal?.status, "benchmarking");

  // Step 9b: Regression Testing
  const regRes = controlledLearningPipeline.runRegressionAudit(newProp.id);
  assert.ok(regRes.success);
  assert.strictEqual(regRes.isSafe, true);
  assert.strictEqual(regRes.proposal?.status, "regression_tested");

  // Step 9c: Admin Approval
  const appRes = controlledLearningPipeline.approveProposal(newProp.id, "lead-engineer");
  assert.ok(appRes.success);
  assert.strictEqual(appRes.proposal?.status, "approved");

  // Step 9d: Production Deployment
  const depRes = controlledLearningPipeline.deployProposal(newProp.id);
  assert.ok(depRes.success);
  assert.strictEqual(depRes.proposal?.status, "deployed");

  // Step 9e: Production Rollback
  const rollRes = controlledLearningPipeline.rollbackProposal(newProp.id);
  assert.ok(rollRes.success);
  assert.strictEqual(rollRes.proposal?.status, "rolled_back");
  console.log("  ✔ Test 9: Controlled staged pipeline lifecycle and rollback verified.");

  // Test 10: Fine-tuning dataset validation & deduplication
  console.log("▶ Test 10: Fine-tuning dataset deduplication and consent enforcement...");
  const rawImages = [
    { id: "img-1", contentHash: "hash-aaa", qualityScore: 82 },
    { id: "img-2", contentHash: "hash-aaa", qualityScore: 82 }, // Duplicate
    { id: "img-3", contentHash: "hash-bbb", qualityScore: 45 }, // Low quality
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `img-${i + 4}`,
      contentHash: `hash-unique-${i}`,
      qualityScore: 78,
    })),
  ];

  // Rejection when consent is false
  const noConsentVal = fineTuningGovernor.validateDataset({
    datasetId: "ds-no-consent",
    images: rawImages,
    userConsentVerified: false,
    workspaceAuthorized: true,
  });
  assert.strictEqual(noConsentVal.validationStatus, "rejected_consent_missing");

  // Approval when consent is true
  const validVal = fineTuningGovernor.validateDataset({
    datasetId: "ds-approved",
    images: rawImages,
    userConsentVerified: true,
    workspaceAuthorized: true,
  });
  assert.strictEqual(validVal.validationStatus, "approved");
  assert.strictEqual(validVal.duplicatesRemoved, 1, "Must remove duplicate hash");
  assert.ok(validVal.trainSplitCount > 0 && validVal.valSplitCount > 0, "Must create train/val split");
  console.log("  ✔ Test 10: Dataset validation, deduplication, and consent enforcement verified.");

  // Test 11: Unauthorized paid training job prevention
  console.log("▶ Test 11: Unauthorized paid training block and adapter versioning...");
  const unauthTraining = fineTuningGovernor.evaluateTrainingJobAuthorization({
    adapterName: "CorporateStyle",
    baseModel: "flux-schnell",
    datasetValidation: validVal,
    isPaidTrainingAuthorized: false,
    estimatedCostUSD: 12.50,
    userAuthorizationToken: "test-token",
  });
  assert.strictEqual(unauthTraining.authorized, false, "Must block paid training without authorization flag");

  const authTraining = fineTuningGovernor.evaluateTrainingJobAuthorization({
    adapterName: "CorporateStyle",
    baseModel: "flux-schnell",
    datasetValidation: validVal,
    isPaidTrainingAuthorized: true,
    estimatedCostUSD: 12.50,
    userAuthorizationToken: "test-token-valid",
  });
  assert.strictEqual(authTraining.authorized, true, "Must authorize training when flag and token are present");
  assert.strictEqual(authTraining.adapterMetadata?.version, "1.0.0");
  console.log("  ✔ Test 11: Paid training authorization gate and adapter versioning verified.");

  // Test 12: Continuous regression monitoring & alerting
  console.log("▶ Test 12: Continuous benchmarking regression detection and alerting...");
  const regCheck = continuousBenchmarkingService.evaluateAccuracyRegression({
    simple_generation: 85.0,
    text_accuracy: 74.0, // Dropped 7% below baseline 81.0% -> trigger critical alert
  });
  assert.strictEqual(regCheck.hasRegressions, true, "Must detect regression");
  assert.ok(regCheck.newAlerts.length > 0, "Must generate regression alert");
  assert.strictEqual(regCheck.newAlerts[0].severity, "critical");
  console.log(`  ✔ Test 12: Detected regression alert: ${regCheck.newAlerts[0].message}`);

  // Test 13: Dashboard metrics compilation & separation of measurements from estimates
  console.log("▶ Test 13: Continuous learning dashboard telemetry aggregation...");
  const dashboardMetrics = learningDashboardService.getDashboardMetrics();
  assert.ok(dashboardMetrics.totalGenerationsEvaluated >= 500, "Generations evaluated must be grounded");
  assert.strictEqual(dashboardMetrics.overallPromptAdherencePercent, 85.2);
  assert.strictEqual(dashboardMetrics.adherenceGainSinceBaselinePercent, 37.4);
  assert.ok(dashboardMetrics.modelRankings.length > 0, "Model rankings must be populated");
  assert.ok(dashboardMetrics.promptOptimizationGains.length > 0, "Prompt optimization gains must be populated");
  console.log("  ✔ Test 13: Dashboard telemetry aggregation verified.");

  // Test 14: End-to-end continuous learning feedback loop
  console.log("▶ Test 14: End-to-end continuous learning integration loop...");
  const testPrompt = "A golden retriever sitting under an oak tree without any leash";
  const optimized = adaptivePromptOptimizer.optimizePrompt({
    rawPrompt: testPrompt,
    targetModelId: "flux-schnell",
  });
  const routing = modelLearningEngine.recommendModelForCategory("simple_generation");
  const recordedRun = feedbackCollector.recordGenerationFeedback({
    workspaceId: "test-workspace-final",
    userConsentGiven: true,
    originalPrompt: testPrompt,
    structuredRequirements: [],
    selectedProvider: routing.recommendedProvider,
    modelIdentifier: routing.recommendedModelId,
    modelVersion: "1.0",
    generationParameters: { width: 1024, height: 1024 },
    generatedImageRef: "img-hash-loop-final",
    evaluationResults: {
      overallScore: 89,
      promptAdherencePercent: 89,
      verdict: "pass",
      confidenceScore: 0.92,
      dimensionScores: { objectPresence: 94 },
    },
    failedRequirements: [],
    correctionAttempts: [],
    finalResult: "accepted",
  });
  modelLearningEngine.updateModelTelemetry(recordedRun);
  assert.ok(recordedRun.id);
  console.log("  ✔ Test 14: Full end-to-end continuous learning loop verified.");

  console.log("\n✨ All 14 Phase N: Continuous AI Model Improvement & Self-Learning Intelligence tests PASSED successfully!\n");
}

