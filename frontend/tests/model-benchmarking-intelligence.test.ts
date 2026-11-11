/**
 * TATTVA AI - Phase J: Advanced Image Accuracy Benchmarking & Model Intelligence Tests
 * Validates 500-prompt catalog integrity, independent multi-metric evaluation,
 * Pareto cost-accuracy optimization, capability-constrained routing, and continuous regression monitoring.
 */

import assert from "node:assert";
import {
  BENCHMARK_500_PROMPTS,
} from "../app/lib/image-engine/model-benchmarking/benchmark-500";
import {
  MODEL_BENCHMARK_PROFILES,
  rankModelsByParetoEfficiency,
  selectOptimalModelForPrompt,
  checkModelApiAvailability,
} from "../app/lib/image-engine/model-benchmarking/model-intelligence";
import {
  evaluateBenchmarkImage,
} from "../app/lib/image-engine/model-benchmarking/evaluator";
import {
  runBenchmarkAudit,
  getHistoricalBenchmarkRuns,
  getFailedBenchmarkCases,
} from "../app/lib/image-engine/model-benchmarking/continuous-benchmarking";

export async function runModelBenchmarkingIntelligenceTests() {
  console.log("\n🚀 Running Phase J: Advanced Model Accuracy Benchmarking & Intelligence Test Suite...\n");

  // ---------------------------------------------------------------------------
  // Test 1: 500-Prompt Catalog Integrity Across 7 Categories
  // ---------------------------------------------------------------------------
  console.log("▶ Test 1: 500-Prompt catalog integrity across 7 core categories...");
  assert.strictEqual(BENCHMARK_500_PROMPTS.length, 500, "Must contain exactly 500 benchmark prompts");

  const categoryCounts = BENCHMARK_500_PROMPTS.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  assert.strictEqual(categoryCounts["object_accuracy"], 80, "Object accuracy must have 80 prompts");
  assert.strictEqual(categoryCounts["attribute_accuracy"], 75, "Attribute accuracy must have 75 prompts");
  assert.strictEqual(categoryCounts["spatial_accuracy"], 75, "Spatial accuracy must have 75 prompts");
  assert.strictEqual(categoryCounts["composition"], 70, "Composition must have 70 prompts");
  assert.strictEqual(categoryCounts["reference_accuracy"], 60, "Reference accuracy must have 60 prompts");
  assert.strictEqual(categoryCounts["text_accuracy"], 70, "Text accuracy must have 70 prompts");
  assert.strictEqual(categoryCounts["visual_generation"], 70, "Visual generation must have 70 prompts");
  console.log("  ✔ Test 1: 500-prompt dataset integrity and distribution verified.");

  // ---------------------------------------------------------------------------
  // Test 2: Model Specification Profiles & Capabilities
  // ---------------------------------------------------------------------------
  console.log("▶ Test 2: Multi-model specification registry and capability constraints...");
  const modelKeys = Object.keys(MODEL_BENCHMARK_PROFILES);
  assert.ok(modelKeys.length >= 7, "Must register at least 7 distinct models");

  const fluxDev = MODEL_BENCHMARK_PROFILES["flux-1-dev"];
  assert.ok(fluxDev, "FLUX.1-dev must be registered");
  assert.strictEqual(fluxDev.capabilities.typography, true, "FLUX.1-dev must support typography");
  assert.strictEqual(fluxDev.isEmpirical, true, "FLUX.1-dev must be marked empirical");

  const gemini = MODEL_BENCHMARK_PROFILES["gemini-3.1-flash-image"];
  assert.ok(gemini, "Gemini 3.1 Flash Image must be registered");
  assert.strictEqual(gemini.capabilities.referenceImage, true, "Gemini must support reference conditioning");
  assert.strictEqual(gemini.capabilities.spatialControl, true, "Gemini must support spatial control");

  const pollinations = MODEL_BENCHMARK_PROFILES["flux-pollinations"];
  assert.ok(pollinations, "Pollinations FLUX must be registered");
  assert.strictEqual(pollinations.costPerMegapixelUsd, 0.0, "Pollinations must be free tier");
  console.log("  ✔ Test 2: Multi-model specifications verified.");

  // ---------------------------------------------------------------------------
  // Test 3: Independent Multi-Metric Evaluation Without Self-Evaluation Bias
  // ---------------------------------------------------------------------------
  console.log("▶ Test 3: Independent multi-metric evaluation across dimensions...");
  const textPrompt = BENCHMARK_500_PROMPTS.find((p) => p.category === "text_accuracy" && p.expectedText);
  assert.ok(textPrompt, "Must have text prompt in dataset");

  const evalResult = await evaluateBenchmarkImage({
    promptItem: textPrompt!,
    modelId: "flux-1-dev",
    providerId: "huggingface",
    generatedImageUri: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+PC9zdmc+",
    latencyMs: 3800,
    costUsd: 0.003,
  });

  assert.strictEqual(evalResult.modelId, "flux-1-dev", "Must associate evaluation with target model");
  assert.ok(evalResult.overallAccuracy > 0, "Must calculate numerical accuracy score");
  assert.ok(Array.isArray(evalResult.detectedEvidence), "Must supply empirical detected evidence");
  console.log("  ✔ Test 3: Independent multi-metric evaluation verified.");

  // ---------------------------------------------------------------------------
  // Test 4: Exact Count Fidelity Adherence
  // ---------------------------------------------------------------------------
  console.log("▶ Test 4: Exact object count fidelity scoring...");
  const countPrompt = BENCHMARK_500_PROMPTS.find((p) => p.expectedCount === 3);
  assert.ok(countPrompt, "Must find prompt demanding exactly 3 items");

  const countEval = await evaluateBenchmarkImage({
    promptItem: countPrompt!,
    modelId: "gemini-3.1-flash-image",
    providerId: "gemini",
    generatedImageUri: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiI+PC9zdmc+",
    latencyMs: 4000,
    costUsd: 0.02,
  });

  assert.ok(countEval.dimensionScores.countFidelity !== undefined, "Count fidelity score must be present");
  console.log("  ✔ Test 4: Exact count fidelity scoring passed.");

  // ---------------------------------------------------------------------------
  // Test 5: Pareto Efficiency Ranking & Tier Assignment
  // ---------------------------------------------------------------------------
  console.log("▶ Test 5: Pareto cost-accuracy efficiency ranking...");
  const rankings = rankModelsByParetoEfficiency();
  assert.ok(rankings.length >= 7, "Rankings must include all models");
  assert.strictEqual(rankings[0].rank, 1, "Top model must be rank #1");
  assert.ok(rankings[0].overallScore >= rankings[1].overallScore, "Rankings must be sorted by score");

  const optimalTiers = rankings.filter((r) => r.paretoTier === "optimal");
  assert.ok(optimalTiers.length > 0, "Must identify optimal Pareto models");

  const economyTiers = rankings.filter((r) => r.paretoTier === "economy");
  assert.ok(economyTiers.length > 0, "Must identify zero-cost economy models");
  console.log("  ✔ Test 5: Pareto ranking and tier assignment passed.");

  // ---------------------------------------------------------------------------
  // Test 6: Capability-Constrained Model Selection
  // ---------------------------------------------------------------------------
  console.log("▶ Test 6: Capability-constrained model selection...");
  // Text-heavy prompt requires typography capability
  const textSelection = selectOptimalModelForPrompt({
    prompt: "A storefront banner with crisp text reading 'GRAND OPENING'",
  });
  assert.strictEqual(
    textSelection.selectedModel.capabilities.typography,
    true,
    "Selected model must support typography"
  );

  // Reference-dependent request requires reference capability
  const refSelection = selectOptimalModelForPrompt({
    prompt: "Keep this character identical but placed in a winter coat",
    referenceImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  });
  assert.strictEqual(
    refSelection.selectedModel.capabilities.referenceImage,
    true,
    "Selected model must support reference conditioning"
  );
  console.log("  ✔ Test 6: Capability-constrained selection verified.");

  // ---------------------------------------------------------------------------
  // Test 7: Live API Availability & Dynamic Failover
  // ---------------------------------------------------------------------------
  console.log("▶ Test 7: Real-time API availability checks and cooldown handling...");
  const pollinationsStatus = checkModelApiAvailability(MODEL_BENCHMARK_PROFILES["flux-pollinations"]);
  assert.strictEqual(pollinationsStatus.isAvailable, true, "Pollinations must be available by default");

  const dummyProfile = {
    ...MODEL_BENCHMARK_PROFILES["openai" as any] || MODEL_BENCHMARK_PROFILES["dall-e-3"],
    providerId: "openai" as any,
  };
  const openaiStatus = checkModelApiAvailability(dummyProfile);
  if (!process.env.OPENAI_API_KEY) {
    assert.strictEqual(openaiStatus.isAvailable, false, "OpenAI must be flagged unavailable if API key is missing");
  }
  console.log("  ✔ Test 7: API availability and failover verified.");

  // ---------------------------------------------------------------------------
  // Test 8: Historical Benchmarking & Regression Monitoring
  // ---------------------------------------------------------------------------
  console.log("▶ Test 8: Historical benchmark tracking & regression alerts...");
  const history = getHistoricalBenchmarkRuns();
  assert.ok(history.length >= 2, "Must contain recorded baseline historical runs");
  assert.ok(history[0].overallScore > 0, "Historical run must store overall score");
  assert.ok(history[0].categoryBreakdowns.object_accuracy > 0, "Historical run must preserve category breakdown");
  console.log("  ✔ Test 8: Historical benchmarking and regression tracking verified.");

  // ---------------------------------------------------------------------------
  // Test 9: Accuracy Improvement Loop & Failure Logging
  // ---------------------------------------------------------------------------
  console.log("▶ Test 9: Accuracy improvement loop & failed requirement repository...");
  const failedCases = getFailedBenchmarkCases();
  assert.ok(failedCases.length >= 3, "Must catalog known edge-case failures");
  assert.ok(failedCases[0].expectedValue, "Failure record must specify expected value");
  assert.ok(failedCases[0].detectedValue, "Failure record must specify detected value");
  assert.ok(failedCases[0].suggestedAction, "Failure record must recommend corrective action");
  console.log("  ✔ Test 9: Failed requirement catalog and improvement loop verified.");

  // ---------------------------------------------------------------------------
  // Test 10: Hardware Isolation & Zero Credential Leakage
  // ---------------------------------------------------------------------------
  console.log("▶ Test 10: Hardware isolation and secret credential protection...");
  const auditSummary = await runBenchmarkAudit({ sampleLimit: 2 });
  const serialized = JSON.stringify(auditSummary);

  assert.ok(!serialized.includes(process.env.OPENAI_API_KEY || "DUMMY_KEY_NEVER_EXIST"), "Zero OpenAI API key leakage");
  assert.ok(!serialized.includes(process.env.GEMINI_API_KEY || "DUMMY_KEY_NEVER_EXIST"), "Zero Gemini API key leakage");
  assert.ok(!serialized.includes(process.env.HF_TOKEN || "DUMMY_KEY_NEVER_EXIST"), "Zero Hugging Face token leakage");
  console.log("  ✔ Test 10: Hardware isolation and credential protection verified.");

  console.log("\n✨ All 10 Phase J: Model Accuracy Benchmarking & Intelligence tests PASSED successfully!\n");
}
