/**
 * TATTVA AI - Phase 27 Long-Term AI Research Automated Test Suite
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 *
 * Verifies:
 * 1. Experiment Tracker (Schema validation, reproducibility gates, filtering, metric aggregation)
 * 2. Knowledge Distillation Engine (Spec validation, loss weighting formulas, CoT trace extraction, PyTorch code generation)
 * 3. SLM Benchmarking Harness (Multi-benchmark evaluation, compression ratio, latency speedup, deployment gates)
 */

import { experimentTracker } from "../app/lib/research-lab/experiment-tracker";
import { distillationEngine } from "../app/lib/research-lab/distillation-engine";
import { slmBenchmarkingHarness } from "../app/lib/research-lab/slm-benchmarking";
import {
  ResearchExperiment,
  DistillationSpec,
  BenchmarkScore,
} from "../app/lib/research-lab/types";

async function runPhase27Tests() {
  console.log("====================================================================");
  console.log("   TATTVA AI - PHASE 27: LONG-TERM AI RESEARCH VERIFICATION");
  console.log("====================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  // ==========================================
  // SECTION 1: Experiment Tracker
  // ==========================================
  console.log("--- 1. Research Experiment Registration & Integrity Gates ---");
  experimentTracker.clear();

  const validExp: ResearchExperiment = {
    id: "exp_indic_distill_001",
    title: "Indic Knowledge Distillation for Telugu/Hindi Reasoning",
    objective: "Distill 70B reasoning capabilities into 3B edge-deployable SLM",
    baseModel: "Qwen/Qwen2.5-3B-Instruct",
    datasetName: "TATTVA-Indic-Reasoning-v1",
    datasetLicensing: "Apache-2.0",
    computeSpec: {
      hardware: "4x NVIDIA A100-SXM4-80GB",
      quantization: "bf16",
      batchSize: 16,
      trainingHours: 8.5,
    },
    methodology: "Knowledge_Distillation",
    empiricalResults: {
      evalAccuracy: 0.812,
      baselineAccuracy: 0.695,
      latencyMs: 145,
      perplexity: 5.42,
      tokenPerSec: 68.5,
    },
    limitations: ["Constrained to 4k context window", "Requires GPU with >= 8GB VRAM"],
    reproducibilitySteps: [
      "Clone repo at commit a973a06",
      "Run python scripts/distill.py --config config/indic_3b.yaml",
      "Evaluate with npx tsx tests/phase-27-ai-research.test.ts",
    ],
    createdAt: new Date().toISOString(),
  };

  const regResult = experimentTracker.registerExperiment(validExp);
  assert(regResult.success, "Successfully registers valid empirical research experiment");

  const invalidExp = {
    ...validExp,
    id: "exp_invalid_002",
    reproducibilitySteps: [], // Empty! Violates reproducibility requirement
  };
  const invalidResult = experimentTracker.registerExperiment(invalidExp as any);
  assert(!invalidResult.success, "Rejects experiment lacking reproducibility steps");

  const invalidAcc = {
    ...validExp,
    id: "exp_invalid_003",
    empiricalResults: { ...validExp.empiricalResults, evalAccuracy: 1.5 }, // > 1.0!
  };
  const invalidAccResult = experimentTracker.registerExperiment(invalidAcc as any);
  assert(!invalidAccResult.success, "Rejects out-of-bounds accuracy (> 1.0)");

  console.log("\n--- 2. Experiment Querying & Metric Aggregation ---");
  const secondExp: ResearchExperiment = {
    ...validExp,
    id: "exp_qlora_002",
    title: "4-bit QLoRA Fine-Tuning for Hindi Medical QA",
    methodology: "QLoRA",
    empiricalResults: {
      evalAccuracy: 0.774,
      baselineAccuracy: 0.651,
      latencyMs: 160,
      tokenPerSec: 62.0,
    },
  };
  experimentTracker.registerExperiment(secondExp);

  const qloraList = experimentTracker.listExperiments("QLoRA");
  assert(qloraList.length === 1 && qloraList[0].id === "exp_qlora_002", "Filters experiments by methodology");

  const summary = experimentTracker.generateLabSummary();
  assert(summary.totalExperiments === 2, "Accurately computes total experiments");
  assert(summary.methodologies["Knowledge_Distillation"] === 1, "Tracks Knowledge_Distillation count");
  assert(summary.methodologies["QLoRA"] === 1, "Tracks QLoRA count");
  assert(summary.averageAccuracyGain > 0.11, "Computes average accuracy gain across experiments");

  // ==========================================
  // SECTION 2: Knowledge Distillation Engine
  // ==========================================
  console.log("\n--- 3. Distillation Specification Validation ---");
  const validDistillSpec: DistillationSpec = {
    id: "distill_spec_70b_to_3b",
    teacherModel: "meta-llama/Llama-3.1-70B-Instruct",
    studentModel: "meta-llama/Llama-3.2-3B-Instruct",
    temperature: 2.5,
    alpha: 0.5,
    reasoningTraceExtraction: true,
    trainingSamples: 25000,
    status: "configured",
  };

  const specValid = distillationEngine.validateSpec(validDistillSpec);
  assert(specValid.valid, "Validates compliant distillation specification");

  const invalidTemp = { ...validDistillSpec, temperature: 0.8 };
  assert(!distillationEngine.validateSpec(invalidTemp).valid, "Rejects temperature <= 1.0 for probability softening");

  const invalidAlpha = { ...validDistillSpec, alpha: 1.5 };
  assert(!distillationEngine.validateSpec(invalidAlpha).valid, "Rejects loss weight alpha outside [0.0, 1.0]");

  console.log("\n--- 4. Theoretical Loss Weight Computation ---");
  // L_total = alpha * L_hard + (1 - alpha) * (T^2) * KL
  // For T = 2.0, alpha = 0.5: effective KL scale = 0.5 * (2^2) = 2.0
  const weights = distillationEngine.computeLossWeights(2.0, 0.5);
  assert(weights.hardLabelWeight === 0.5, "Sets hard label cross-entropy weight to alpha");
  assert(weights.softDistillationWeight === 0.5, "Sets soft distillation weight to (1 - alpha)");
  assert(weights.effectiveKlScale === 2.0, "Computes (1 - alpha) * T^2 accurately");

  console.log("\n--- 5. Chain of Thought Reasoning Trace Extraction ---");
  const cotOutput = `<think>
1. Translate Hindi question: What is the capital of India?
2. Recall geographical knowledge: New Delhi is the national capital.
3. Verify options: Option B corresponds to New Delhi.
</think>
The correct answer is (B) New Delhi.`;

  const extracted = distillationEngine.extractReasoningTrace(cotOutput);
  assert(extracted.hasExplicitReasoning, "Detects explicit reasoning tags");
  assert(extracted.thoughtTrace.includes("Recall geographical knowledge"), "Extracts inner CoT thoughts");
  assert(extracted.finalAnswer.trim() === "The correct answer is (B) New Delhi.", "Extracts clean final answer");

  console.log("\n--- 6. PyTorch Distillation Script Generation ---");
  const script = distillationEngine.generateDistillationScript(validDistillSpec);
  assert(script.includes("class DistillationTrainer:"), "Generates PyTorch DistillationTrainer class");
  assert(script.includes("F.kl_div") || script.includes("nn.KLDivLoss"), "Includes KL Divergence soft loss");
  assert(script.includes("meta-llama/Llama-3.1-70B-Instruct"), "Injects designated teacher model ID");

  // ==========================================
  // SECTION 3: SLM Benchmarking Harness
  // ==========================================
  console.log("\n--- 7. Multi-Benchmark Evaluation & Metrics ---");
  const teacherScores: BenchmarkScore[] = [
    { benchmark: "Indic_MMMLU", sampleCount: 456, accuracy: 0.885, averageLatencyMs: 1200, vramUsageMB: 140000 },
    { benchmark: "GSM8K_Hindi", sampleCount: 500, accuracy: 0.842, averageLatencyMs: 1400, vramUsageMB: 140000 },
    { benchmark: "HumanEval_Python", sampleCount: 164, accuracy: 0.792, averageLatencyMs: 1100, vramUsageMB: 140000 },
    { benchmark: "ARC_Challenge", sampleCount: 200, accuracy: 0.860, averageLatencyMs: 1300, vramUsageMB: 140000 },
  ];

  const studentScores: BenchmarkScore[] = [
    { benchmark: "Indic_MMMLU", sampleCount: 456, accuracy: 0.805, averageLatencyMs: 310, vramUsageMB: 6500 },
    { benchmark: "GSM8K_Hindi", sampleCount: 500, accuracy: 0.748, averageLatencyMs: 340, vramUsageMB: 6500 },
    { benchmark: "HumanEval_Python", sampleCount: 164, accuracy: 0.695, averageLatencyMs: 290, vramUsageMB: 6500 },
    { benchmark: "ARC_Challenge", sampleCount: 200, accuracy: 0.778, averageLatencyMs: 320, vramUsageMB: 6500 },
  ];

  const comparison = slmBenchmarkingHarness.evaluateComparison(
    teacherScores,
    studentScores,
    70, // 70 Billion teacher params
    3   // 3 Billion student params
  );

  assert(comparison.compressionRatio === 23.3, "Computes 23.3x model compression ratio (70B / 3B)");
  assert(comparison.latencySpeedup > 3.5, "Demonstrates > 3.5x inference speedup");
  assert(comparison.accuracyRetention > 88.0, "Achieves > 88% accuracy retention relative to teacher");

  console.log("\n--- 8. Production Readiness Deployment Gate ---");
  const readiness = slmBenchmarkingHarness.assessProductionReadiness(comparison);
  assert(readiness.isDeployable, "Validates student SLM passes all edge deployment gates");
  assert(readiness.reasons.length === 0, "No blocking deployment reasons identified");

  const weakStudentScores: BenchmarkScore[] = [
    { benchmark: "Indic_MMMLU", sampleCount: 456, accuracy: 0.510, averageLatencyMs: 800, vramUsageMB: 6500 },
  ];
  const weakComparison = slmBenchmarkingHarness.evaluateComparison(
    teacherScores.slice(0, 1),
    weakStudentScores,
    70,
    3
  );
  const weakReadiness = slmBenchmarkingHarness.assessProductionReadiness(weakComparison);
  assert(!weakReadiness.isDeployable, "Blocks sub-par SLM failing the 85% accuracy threshold");

  console.log("\n====================================================================");
  console.log(`   PHASE 27 VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log("====================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase27Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
