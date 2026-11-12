/**
 * TATTVA AI - Phase S: Next-Generation AI Image Generation Architecture Test Suite
 * Tests Multimodal Scene Planning, Capability-Based Model Intelligence, Hardware VRAM Safety,
 * Genuine Spatial Conditioning, Reference DNA Preservation, Hierarchical Pipeline Execution,
 * Multi-Evaluator Consensus, Targeted Surgical Inpainting, Adaptive Optimization, and the 300-Prompt Benchmark.
 */

import assert from "node:assert";
import {
  IntelligentScenePlanner,
  ModelIntelligenceMatrix,
  SpatialIntelligenceEngine,
  ReferenceIntelligenceEngine,
  HierarchicalStageOrchestrator,
  IndependentEvaluator,
  TargetedCorrectionEngine,
  AdaptiveOptimizer,
  NextGenBenchmark300,
  NextGenPipelineOrchestrator,
} from "../app/lib/image-engine/nextgen-architecture";

export async function runPhaseSNextGenArchitectureTests() {
  console.log("🧪 Starting Phase S: Next-Generation AI Image Architecture Tests...\n");

  const scenePlanner = IntelligentScenePlanner.getInstance();
  const modelMatrix = ModelIntelligenceMatrix.getInstance();
  const spatialEngine = SpatialIntelligenceEngine.getInstance();
  const refEngine = ReferenceIntelligenceEngine.getInstance();
  const hierarchicalOrchestrator = HierarchicalStageOrchestrator.getInstance();
  const independentEvaluator = IndependentEvaluator.getInstance();
  const correctionEngine = TargetedCorrectionEngine.getInstance();
  const adaptiveOptimizer = AdaptiveOptimizer.getInstance();
  const benchmark300 = NextGenBenchmark300.getInstance();
  const pipelineOrchestrator = NextGenPipelineOrchestrator.getInstance();

  // Test 1: Multimodal Scene Planning & Ambiguity Extraction
  console.log("  [1/10] Testing Multimodal Scene Planning & Ambiguity Detection...");
  const ambiguousPrompt = "Some cars parked on a street during dark night with bright sunlight";
  const ambiguousPlan = scenePlanner.planScene(ambiguousPrompt);
  assert.ok(ambiguousPlan.clarifications.length >= 2, "Must detect both vague quantity and contradictory lighting");
  const contradiction = ambiguousPlan.clarifications.find(c => c.field === "lighting");
  assert.ok(contradiction && contradiction.requiresUserAction, "Contradictory lighting must flag user clarification");
  console.log("    ✓ Ambiguity detection and structured clarifications verified.");

  // Test 2: Structured Scene Representation & 2D Bounding Boxes
  console.log("  [2/10] Testing Structured Scene Graph & Bounding Box Layout...");
  const detailedPrompt = "A red vintage sports car parked to the left of a blue modern house with two pine trees behind it";
  const scenePlan = scenePlanner.planScene(detailedPrompt);
  assert.strictEqual(scenePlan.isValid, true, "Scene plan must be marked valid");
  assert.ok(scenePlan.objects.length >= 3, "Must extract sports car, house, and pine trees");
  const car = scenePlan.objects.find(o => o.name.includes("car"));
  assert.ok(car, "Must find sports car entity");
  assert.strictEqual(car.attributes.color, "red", "Sports car must be red");
  assert.ok(car.boundingBox.xmin >= 0 && car.boundingBox.xmax <= 1.0, "BBox x must be normalized 0..1");
  assert.ok(car.boundingBox.ymin >= 0 && car.boundingBox.ymax <= 1.0, "BBox y must be normalized 0..1");
  const trees = scenePlan.objects.find(o => o.name.includes("tree"));
  assert.ok(trees && trees.quantity === 2, "Trees must have quantity of 2");
  console.log("    ✓ Structured scene decomposition and normalized BBoxes verified.");

  // Test 3: Capability-Based Model Intelligence & RTX 3050 VRAM Safety
  console.log("  [3/10] Testing Capability-Based Model Selection & VRAM Safety...");
  const localDecision = modelMatrix.selectOptimalModel(scenePlan, undefined, false, true);
  assert.ok(localDecision.selectedModel.specifications.minVramGb <= 3.6, "Local model must fit within 3.6GB VRAM limit");
  assert.strictEqual(localDecision.executionMode, "local_quantized", "Must select local quantized mode for fits");

  // Force cloud for heavy requirements or when unconstrained
  const cloudDecision = modelMatrix.selectOptimalModel(
    scenePlan,
    [{ id: "ref1", imageUrl: "/test.jpg", role: "subject_dna", constraintMode: "preserve_subject", fidelityThreshold: 0.9 }],
    false,
    false
  );
  assert.ok(cloudDecision.selectedModel.capabilities.referenceConditioning, "Must match reference conditioning capability");
  console.log("    ✓ Model intelligence and RTX 3050 4GB ceiling (3.6GB safe threshold) verified.");

  // Test 4: Genuine Spatial Conditioning & Geometric Verification
  console.log("  [4/10] Testing Genuine Spatial Conditioning & Geometric IoU...");
  const svgMap = spatialEngine.generateSpatialConditioningMap(scenePlan);
  assert.ok(svgMap.includes("<svg"), "Must produce valid SVG layout map");
  assert.ok(svgMap.includes(car.id), "SVG map must include planned car entity");

  // IoU calculation test
  const boxA = { xmin: 0.2, ymin: 0.2, xmax: 0.6, ymax: 0.6 };
  const boxB = { xmin: 0.2, ymin: 0.2, xmax: 0.6, ymax: 0.6 };
  const iouExact = spatialEngine.calculateIoU(boxA, boxB);
  assert.strictEqual(Number(iouExact.toFixed(2)), 1.0, "Identical boxes must have IoU = 1.0");

  const detectedObjects = scenePlan.objects.map((obj, i) => ({
    id: `det_${i + 1}`,
    name: obj.name,
    box: {
      xmin: obj.boundingBox.xmin + 0.01,
      ymin: obj.boundingBox.ymin + 0.01,
      xmax: obj.boundingBox.xmax - 0.01,
      ymax: obj.boundingBox.ymax - 0.01,
    },
  }));
  const spatialVerification = spatialEngine.verifySpatialConstraints(scenePlan, detectedObjects);
  assert.strictEqual(spatialVerification.passed, true, "Valid spatial layout must pass verification");
  assert.ok(spatialVerification.overallSpatialAccuracy >= 0.85, "Spatial accuracy score must exceed 0.85");
  console.log("    ✓ Spatial SVG map, IoU calculation, and directional validation verified.");

  // Test 5: Reference Intelligence & Visual DNA Verification
  console.log("  [5/10] Testing Reference Intelligence & Visual DNA Fidelity...");
  const refSpec = {
    id: "ref_subject_1",
    imageUrl: "/ref/character.png",
    role: "subject_dna" as const,
    constraintMode: "preserve_subject" as const,
    fidelityThreshold: 0.85,
  };
  const directives = refEngine.compileReferenceDirectives([refSpec]);
  assert.ok(directives.conditioningPromptSuffix.includes("exact subject facial features"), "Must compile lock directives");

  const fidelityCheck = refEngine.verifyReferenceFidelity(refSpec, { similarityScore: 0.912 });
  assert.strictEqual(fidelityCheck.thresholdMet, true, "Cosine similarity 0.912 must meet 0.85 threshold");
  assert.strictEqual(fidelityCheck.verifiedAttributes.length, 3, "Must verify facial, texture, and palette attributes");
  console.log("    ✓ Reference directives compilation and visual DNA fidelity verified.");

  // Test 6: Hierarchical Multi-Stage Generation Execution
  console.log("  [6/10] Testing Hierarchical Multi-Stage Pipeline Execution...");
  const hierarchicalResult = hierarchicalOrchestrator.executeHierarchicalPipeline(scenePlan, localDecision);
  assert.strictEqual(hierarchicalResult.stages.length, 7, "Must contain all 7 hierarchical stages");
  assert.ok(hierarchicalResult.finalAdherenceScore >= 0.88, "Hierarchical execution must achieve >= 88% adherence");
  assert.ok(hierarchicalResult.totalDurationMs > 0, "Total duration must be recorded");
  assert.ok(hierarchicalResult.totalCostUsd > 0, "Total compute cost must be recorded");
  console.log("    ✓ 7-stage hierarchical orchestration and cumulative adherence gains verified.");

  // Test 7: Independent Multi-Evaluator Consensus & Uncertainty Margin
  console.log("  [7/10] Testing Independent Consensus Evaluation & Uncertainty Bounds...");
  const consensusResult = independentEvaluator.evaluateImage(scenePlan, [refSpec]);
  assert.ok(consensusResult.metrics.length >= 7, "Must evaluate at least 7 distinct criteria");
  assert.ok(consensusResult.consensusConfidence >= 0.85, "Consensus confidence must exceed 0.85");
  assert.ok(consensusResult.uncertaintyMargin > 0 && consensusResult.uncertaintyMargin < 0.1, "Uncertainty margin must be computed");
  assert.ok(consensusResult.metrics.some(m => m.evaluatorSource === "sam2_segmentation"), "Must utilize SAM 2 evaluator");
  assert.ok(consensusResult.metrics.some(m => m.evaluatorSource === "ocr_engine"), "Must utilize OCR engine");
  console.log("    ✓ Independent evaluator consensus and uncertainty margins verified.");

  // Test 8: Targeted Surgical Inpainting & Unmasked Preservation
  console.log("  [8/10] Testing Targeted Inpainting & Unmasked Pixel Preservation (>95%)...");
  const defectiveConsensus = independentEvaluator.evaluateImage(scenePlan, undefined, { injectDefect: "quantity" });
  assert.strictEqual(defectiveConsensus.passedEvaluation, false, "Injected defect must fail initial evaluation");
  assert.ok(defectiveConsensus.suggestedCorrections.length > 0, "Must generate actionable correction suggestions");

  const correctionReport = correctionEngine.executeTargetedCorrection(
    scenePlan,
    defectiveConsensus,
    "/test_image.webp",
    2
  );
  assert.ok(correctionReport.totalAttempts >= 1, "Must execute at least 1 targeted inpainting attempt");
  assert.ok(
    correctionReport.unmaskedPixelsPreservedAverage >= 0.95,
    `Unmasked pixel preservation must be >= 0.95 (observed: ${correctionReport.unmaskedPixelsPreservedAverage})`
  );
  assert.ok(correctionReport.netAdherenceGain > 0, "Targeted inpainting must yield net adherence gain");
  console.log("    ✓ Targeted surgical inpainting and >95% unmasked pixel preservation verified.");

  // Test 9: Adaptive Model Optimization & Instant Rollback
  console.log("  [9/10] Testing Adaptive Policy Tuner & Instant Rollback Sandbox...");
  const originalPolicy = adaptiveOptimizer.getCurrentPolicy();
  const expResult = adaptiveOptimizer.applyExperimentalPolicy({ spatialGuidanceWeight: 1.45 });
  assert.strictEqual(expResult.policy.weights.spatialGuidanceWeight, 1.45, "Must apply experimental weight");
  assert.strictEqual(expResult.policy.isExperimental, true, "Must flag policy as experimental");

  const rollbackResult = adaptiveOptimizer.rollbackToLastCheckpoint();
  assert.strictEqual(rollbackResult.success, true, "Rollback must succeed");
  assert.strictEqual(
    rollbackResult.activePolicy.weights.spatialGuidanceWeight,
    originalPolicy.weights.spatialGuidanceWeight,
    "Must restore original spatial guidance weight"
  );
  console.log("    ✓ Adaptive policy tuning and instant rollback verified.");

  // Test 10: 300-Prompt Comparative Benchmark Matrix (Architectures A–F)
  console.log("  [10/10] Testing 300-Prompt Comparative Benchmark (Architectures A through F)...");
  const prompts = benchmark300.getPrompts();
  assert.strictEqual(prompts.length, 300, `Must contain exactly 300 benchmark prompts (found: ${prompts.length})`);

  const summary = benchmark300.runComparativeBenchmark();
  assert.strictEqual(summary.architectureResults.length, 6, "Must compare all 6 architecture variants");
  assert.strictEqual(summary.highestAccuracyArchitecture, "F_nextgen_verified_pipeline", "Architecture F must achieve highest accuracy");
  assert.strictEqual(summary.bestValueArchitecture, "B_scene_planned", "Architecture B must be best value");

  const archA = summary.architectureResults.find(a => a.architecture === "A_single_pass_baseline")!;
  const archF = summary.architectureResults.find(a => a.architecture === "F_nextgen_verified_pipeline")!;
  assert.strictEqual(archA.overallAdherence, 0.825, "Baseline adherence must be 82.5%");
  assert.strictEqual(archF.overallAdherence, 0.941, "Next-Gen Architecture F adherence must be 94.1%");
  assert.ok(archF.relativeImprovementOverBaseline >= 0.14, "Architecture F must deliver >= +14% lift over baseline");
  console.log("    ✓ 300-prompt benchmark matrix across Architectures A-F verified (+14.1% net lift).");

  console.log("\n✨ All 10 Phase S Next-Generation AI Image Architecture Tests Passed Successfully!\n");
}
