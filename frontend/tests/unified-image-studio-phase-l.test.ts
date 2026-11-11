/**
 * TATTVA AI - Unified Image Studio Integration Test Suite (Phase L)
 * Comprehensive verification of the 12 unified services, end-to-end generation workflow,
 * 8-dimension accuracy evaluation, error detection, surgical inpainting correction,
 * super-resolution enhancement, subject consistency, and Supabase workspace storage.
 */

import assert from "node:assert";
import {
  UnifiedImageStudioEngine,
  PromptUnderstandingService,
  RequirementExtractionService,
  ReferenceAnalysisService,
  ModelRoutingService,
  ImageGenerationService,
  ImageEditingService,
  ImageEnhancementService,
  ImageEvaluationService,
  CorrectionService,
  BenchmarkService,
  StorageService,
  JobManagementService,
} from "../app/lib/image-engine/services";
import { resetAllCircuitBreakers } from "../app/lib/image-engine/reliability/circuit-breaker";

export async function runUnifiedImageStudioPhaseLTests(): Promise<void> {
  console.log("\n🚀 Running Phase L: Unified TATTVA AI Image Studio Integration Test Suite...\n");
  resetAllCircuitBreakers();

  const mockValidPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAQMAAAD58POIAAAABlBMVEUAAAD///+l2Z/dAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVRIx+3RsQ0AMAzDwCL5/8wUaIeOBAi6F9k1d120BwAAAAAAAAAA4F8HAAAAAP7gAgz4AGjZ7QW1AAAAAElFTkSuQmCC";

  // ---------------------------------------------------------------------------
  // Test 1: Intelligent Prompt Understanding & Contradiction Detection
  // ---------------------------------------------------------------------------
  console.log("▶ Test 1: Intelligent Prompt Understanding across simple & complex prompts...");
  const simplePrompt = "A lotus flower floating on calm water at twilight";
  const simpleAnalysis = PromptUnderstandingService.understand(simplePrompt);
  assert.strictEqual(simpleAnalysis.structuredSpec.mainSubject.toLowerCase().includes("lotus"), true);
  assert.strictEqual(simpleAnalysis.contradictions.length, 0);

  const complexContradictoryPrompt =
    "A man standing in bright sunshine and pitch black night";
  const complexAnalysis = PromptUnderstandingService.understand(complexContradictoryPrompt);
  assert.strictEqual(complexAnalysis.structuredSpec.mainSubject.toLowerCase().includes("man"), true);
  assert.ok(complexAnalysis.contradictions.length > 0, "Contradiction detection must flag conflicting colors or lighting");
  console.log("  ✔ Test 1: Prompt understanding and contradiction detection verified.");

  // ---------------------------------------------------------------------------
  // Test 2: Requirement Extraction Service (8 Core Dimensions)
  // ---------------------------------------------------------------------------
  console.log("▶ Test 2: 8-Dimension Structured Requirement Checklist Extraction...");
  const requirementSummary = RequirementExtractionService.extractFromSpec(complexAnalysis.structuredSpec);
  assert.ok(requirementSummary.totalCount > 0, "Requirements must be extracted from structured spec");
  assert.ok(requirementSummary.criticalCount > 0, "Critical subject requirement must be identified");
  assert.ok(requirementSummary.categories.object_presence !== undefined);
  assert.ok(requirementSummary.categories.color !== undefined);
  console.log(`  ✔ Test 2: Extracted ${requirementSummary.totalCount} visual requirements across core dimensions.`);

  // ---------------------------------------------------------------------------
  // Test 3: Reference Analysis Service & Visual DNA Extraction
  // ---------------------------------------------------------------------------
  console.log("▶ Test 3: Reference Image Analysis, Intent Classification & Validation...");
  const validCheck = ReferenceAnalysisService.validate(mockValidPng);
  assert.strictEqual(validCheck.isValid, true, "Valid PNG data URI must pass validation");

  const invalidCheck = ReferenceAnalysisService.validate("data:text/plain;base64,aGVsbG8=");
  assert.strictEqual(invalidCheck.isValid, false, "Unsupported MIME type must be rejected");

  const keepCharacterIntent = ReferenceAnalysisService.classifyIntent("Keep the same character but change the background to Mars");
  assert.strictEqual(keepCharacterIntent.intentType, "keep_character");
  assert.ok(keepCharacterIntent.recommendedStrength >= 0.6);
  console.log("  ✔ Test 3: Reference image validation and intent classification verified.");

  // ---------------------------------------------------------------------------
  // Test 4: Model Routing Service & Circuit Breaker Compatibility
  // ---------------------------------------------------------------------------
  console.log("▶ Test 4: Model Routing Service capability matching & fallback chain...");
  const routing = ModelRoutingService.route({
    prompt: "A close-up macro photograph of a diamond ring with laser-sharp reflections",
    quality: "balanced",
  });
  assert.ok(routing.primaryModel, "Must resolve a primary model");
  assert.ok(routing.fallbackChain.length > 0, "Must provide fallback provider chain");

  const providerOrder = ModelRoutingService.resolveProviderOrder("auto", false);
  assert.ok(providerOrder.length > 0, "Resolved provider order must be non-empty");
  console.log(`  ✔ Test 4: Model routing verified. Primary model: ${routing.primaryModel.name} via ${routing.primaryModel.providerId}.`);

  // ---------------------------------------------------------------------------
  // Test 5: Image Generation Service (Verified Accuracy Pipeline)
  // ---------------------------------------------------------------------------
  console.log("▶ Test 5: Multi-Stage Accurate Image Generation & Evaluation...");
  const accurateResult = await ImageGenerationService.generateAccurate({
    prompt: "A red sports car parked in front of a modern glass skyscraper",
    quality: "fast",
    enableAutoCorrection: false,
  });

  assert.ok(accurateResult.finalImage, "Final image must be produced");
  assert.ok(accurateResult.initialImage, "Initial pre-correction image must be preserved");
  assert.ok(accurateResult.requirementsChecklist.length > 0, "Requirements checklist must be populated");
  assert.ok(accurateResult.finalScorecard.overallAccuracy >= 0, "Scorecard overall accuracy must be present");
  console.log(`  ✔ Test 5: Accurate generation verified. Overall accuracy: ${accurateResult.finalScorecard.overallAccuracy}%.`);

  // ---------------------------------------------------------------------------
  // Test 6: Correction Service (Targeted Surgical Inpainting)
  // ---------------------------------------------------------------------------
  console.log("▶ Test 6: Correction Service surgical inpainting on failed requirements...");
  const failedChecklist = [...accurateResult.requirementsChecklist];
  if (failedChecklist.length > 0) {
    failedChecklist[0] = {
      ...failedChecklist[0],
      status: "fail",
      confidence: 0.95,
      detectedEvidence: "Object partially obscured by noise",
    };
  }

  const correctionRes = await CorrectionService.executeCorrection({
    currentImage: accurateResult.finalImage,
    checklist: failedChecklist,
    spec: accurateResult.structuredSpec,
    currentScorecard: {
      ...accurateResult.finalScorecard,
      overallAccuracy: 65,
    },
    maxAttempts: 1,
  });

  assert.ok(correctionRes.correctedImage, "Corrected image must be generated");
  assert.ok(correctionRes.correctionHistory.length > 0, "Correction attempt must be recorded");
  console.log("  ✔ Test 6: Correction Service verified with inpainting history record.");

  // ---------------------------------------------------------------------------
  // Test 7: Image Editing Service (Inpainting, Outpainting, Removal)
  // ---------------------------------------------------------------------------
  console.log("▶ Test 7: Image Editing Service inpainting, outpainting, and background replacement...");
  const editRes = await ImageEditingService.edit({
    image: mockValidPng,
    instruction: "Remove the unwanted tourist in the background",
  });

  assert.ok(editRes.editedImage, "Edited image must be returned");
  assert.strictEqual(editRes.operation, "object_removal");
  assert.ok(editRes.unmaskedPreservedPercent >= 90.0, "Unmasked pixels must be preserved");

  const boxMask = ImageEditingService.createBoxMask(512, 512, { x: 100, y: 100, width: 200, height: 200 });
  assert.ok(
    boxMask.startsWith("data:image/svg+xml;base64,") || boxMask.startsWith("data:image/png;base64,"),
    "Box mask must be valid data URI"
  );
  console.log("  ✔ Test 7: Image editing pipeline and unmasked preservation verified.");

  // ---------------------------------------------------------------------------
  // Test 8: Image Enhancement Service (2x/4x Super-Resolution)
  // ---------------------------------------------------------------------------
  console.log("▶ Test 8: Image Enhancement Service (Super-Resolution & Quality Metrics)...");
  const enhanceRes = await ImageEnhancementService.enhance({
    image: mockValidPng,
    scale: 2,
    task: "general",
  });

  assert.ok(enhanceRes.enhancedImage, "Enhanced image must be produced");
  assert.strictEqual(enhanceRes.scaleFactor, 2, "Enhancement scale must match 2x");
  assert.ok(enhanceRes.metrics.psnr > 0, "PSNR metric must be positive");
  assert.ok(enhanceRes.metrics.ssim >= 0 && enhanceRes.metrics.ssim <= 1, "SSIM must be between 0 and 1");
  console.log("  ✔ Test 8: Super-resolution 2x enhancement and quality metrics verified.");

  // ---------------------------------------------------------------------------
  // Test 9: Independent Visual Evaluation & 8-Dimension Scorecard
  // ---------------------------------------------------------------------------
  console.log("▶ Test 9: Independent Visual Evaluation across 8 dimensions...");
  const evaluationReport = await ImageEvaluationService.evaluate({
    image: mockValidPng,
    checklist: accurateResult.requirementsChecklist,
    spec: accurateResult.structuredSpec,
  });

  assert.ok(evaluationReport.scorecard.overallAccuracy >= 0, "Evaluation overall score must be non-negative");
  assert.ok(evaluationReport.scorecard.objectPresenceScore >= 0);
  assert.ok(evaluationReport.scorecard.attributeAccuracyScore >= 0);
  assert.ok(evaluationReport.scorecard.spatialAccuracyScore >= 0);
  assert.ok(evaluationReport.scorecard.textAccuracyScore >= 0);
  assert.ok(["pass", "borderline", "fail"].includes(evaluationReport.verificationVerdict));
  console.log(`  ✔ Test 9: 8-Dimension evaluation verified with verdict: ${evaluationReport.verificationVerdict}.`);

  // ---------------------------------------------------------------------------
  // Test 10: Benchmark Service & Catalog Integrity
  // ---------------------------------------------------------------------------
  console.log("▶ Test 10: Model Benchmarking Service & 500-Prompt Catalog...");
  const catalog = BenchmarkService.getBenchmarkCatalog();
  assert.strictEqual(catalog.length, 500, "Benchmark catalog must contain exactly 500 standardized prompts");

  const specs = BenchmarkService.getModelSpecs();
  assert.ok(specs.length >= 4, "Must register at least 4 foundation image models");
  console.log("  ✔ Test 10: Benchmark catalog and model specifications verified.");

  // ---------------------------------------------------------------------------
  // Test 11: Storage Service (Supabase & Vault Fallback with Version Trees)
  // ---------------------------------------------------------------------------
  console.log("▶ Test 11: Storage Service persistence, version lineage & isolation...");
  const testUserId = "user_phase_l_test";
  const testWorkspaceId = "workspace_prod_test";

  const savedRecord = await StorageService.persistImage({
    dataUriOrBuffer: mockValidPng,
    prompt: "A mystical forest with glowing fireflies",
    provider: "gemini",
    model: "gemini-2.5-flash-image",
    parameters: { width: 1024, height: 1024, aspectRatio: "1:1", seed: 42, quality: "balanced" },
    accuracyScorecard: accurateResult.finalScorecard,
    userId: testUserId,
    workspaceId: testWorkspaceId,
  });

  assert.ok(savedRecord.id.startsWith("img_"), "Image ID must be formatted");
  assert.ok(savedRecord.url, "Access URL must be generated");
  assert.strictEqual(savedRecord.version, 1, "Initial image version must be 1");

  // Create derived version (e.g. after editing)
  const version2Record = await StorageService.persistImage({
    dataUriOrBuffer: mockValidPng,
    prompt: "A mystical forest with glowing fireflies and moonlight beam",
    provider: "gemini",
    model: "gemini-2.5-flash-image",
    parameters: { width: 1024, height: 1024, aspectRatio: "1:1", seed: 42, quality: "balanced" },
    parentImageId: savedRecord.id,
    operation: "inpaint",
    userId: testUserId,
    workspaceId: testWorkspaceId,
  });

  assert.strictEqual(version2Record.version, 2, "Derived image version must be 2");
  assert.strictEqual(version2Record.parentImageId, savedRecord.id);

  const history = await StorageService.listHistory(testUserId, testWorkspaceId);
  assert.ok(history.length >= 2, "History must contain both versions");
  console.log("  ✔ Test 11: Storage Service persistence and version tree lineage verified.");

  // ---------------------------------------------------------------------------
  // Test 12: Job Management Service Asynchronous Execution & Progress
  // ---------------------------------------------------------------------------
  console.log("▶ Test 12: Job Management Service async queue lifecycle...");
  const job = JobManagementService.enqueueJob({
    prompt: "An astronaut floating above Earth in high orbit",
    quality: "fast",
    userId: testUserId,
  });

  assert.ok(job.id.startsWith("job-") || job.id.startsWith("job_"), "Job ID must be generated");
  assert.ok(job.status === "queued" || job.status === "processing", "Initial job status must be queued or processing");

  const retrieved = JobManagementService.getJobStatus(job.id);
  assert.strictEqual(retrieved?.id, job.id, "Job must be retrievable by ID");

  const telemetry = JobManagementService.getTelemetry();
  assert.ok(telemetry.overallSuccessRate >= 0, "Telemetry success rate must be valid");
  console.log("  ✔ Test 12: Job Management Service async queue and telemetry verified.");

  console.log("\n✨ All 12 Phase L: Unified Image Studio Integration tests PASSED successfully!\n");
}

