/**
 * Automated Verification Harness: Unified Model Registry & Dynamic Execution Planner
 * Tests capability scoring, multi-modal validation, circuit breakers, Kahn's algorithm execution tiers,
 * acyclic checks, dynamic input binding, risk assessment, and checkpoint recovery.
 */

import assert from "node:assert/strict";
import { modelRegistry } from "../app/lib/ai-orchestrator/model-registry.ts";
import { dynamicExecutionPlanner } from "../app/lib/agent-engine/execution-planner.ts";

console.log("\n================================================================================");
console.log("  TATTVA AI: UNIFIED MODEL REGISTRY & DYNAMIC EXECUTION PLANNER VERIFICATION");
console.log("================================================================================\n");

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  [PASS] Test ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] Test ${total}: ${name}`);
      console.error("         Error:", err.message);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 1: UNIFIED MODEL REGISTRY
  // --------------------------------------------------------------------------
  console.log("\n--- Suite 1: Unified Model Registry & Multi-Modal Catalog ---");

  test("Model Catalog is populated with multi-provider fleet", () => {
    const snapshot = modelRegistry.getSnapshot();
    assert.ok(snapshot.totalModels >= 10, `Expected at least 10 models, got ${snapshot.totalModels}`);
    assert.ok(snapshot.providers.includes("gemini"), "Catalog must include gemini provider");
    assert.ok(snapshot.providers.includes("anthropic"), "Catalog must include anthropic provider");
    assert.ok(snapshot.providers.includes("openai"), "Catalog must include openai provider");
    assert.ok(snapshot.providers.includes("openrouter"), "Catalog must include openrouter provider");
    assert.ok(snapshot.providers.includes("tattva"), "Catalog must include tattva native provider");
  });

  test("Modality Filtering identifies vision and image generation models", () => {
    const visionModels = modelRegistry.listModels({ inputModality: "image" });
    assert.ok(visionModels.length > 0, "Must have models supporting image input");
    assert.ok(visionModels.some((m) => m.id.includes("gemini")), "Gemini models must support vision input");

    const imageGenModels = modelRegistry.listModels({ outputModality: "image" });
    assert.ok(imageGenModels.length > 0, "Must have models generating images");
    assert.ok(imageGenModels.some((m) => m.id.includes("flux")), "Flux models must support image output");
  });

  test("Dynamic Capability Scorer selects appropriate model for reasoning", () => {
    const selected = modelRegistry.selectBestModel({
      taskIntent: "reasoning",
      requiresReasoning: true,
    });
    assert.ok(selected, "Must select a model for reasoning");
    assert.ok(
      selected.supportsReasoning,
      `Selected model (${selected.id}) must have supportsReasoning=true`
    );
  });

  test("Dynamic Capability Scorer strictly enforces modality requirements", () => {
    const selected = modelRegistry.selectBestModel({
      taskIntent: "image_generation",
      requiredOutputModalities: ["image"],
    });
    assert.ok(selected.outputModalities.includes("image"), "Must select an image generation model");
    assert.ok(!selected.id.includes("gpt-4o-mini"), "Text-only model must not be selected for image generation");
  });

  test("Dynamic Capability Scorer disqualifies models exceeding context window limit", () => {
    const scored = modelRegistry.scoreModels({
      taskIntent: "general_chat",
      estimatedTokens: 150000, // 150k tokens
    });

    // GPT-4o has 128k context, so 150k must disqualify it
    const gpt4o = scored.find((s) => s.model.id === "gpt-4o");
    assert.ok(gpt4o?.disqualified, "GPT-4o (128k) must be disqualified for 150k token context");

    // Gemini 2.5 Flash has 1M context, so it must not be disqualified
    const geminiFlash = scored.find((s) => s.model.id === "gemini-2.5-flash");
    assert.ok(!geminiFlash?.disqualified, "Gemini Flash (1M) must fit 150k token context");
  });

  test("Circuit Breaker trips after consecutive failures and recovers on success", () => {
    const testModelId = "tattva-code-v1";
    // Baseline healthy
    assert.strictEqual(modelRegistry.isModelHealthy(testModelId), true);

    // Record 3 consecutive failures
    modelRegistry.recordExecution(testModelId, 500, false, "Connection timeout 1");
    modelRegistry.recordExecution(testModelId, 500, false, "Connection timeout 2");
    modelRegistry.recordExecution(testModelId, 500, false, "Connection timeout 3");

    // Must be unhealthy now
    assert.strictEqual(
      modelRegistry.isModelHealthy(testModelId),
      false,
      "Model must be flagged unhealthy after 3 consecutive failures"
    );

    // Record success -> recovery
    modelRegistry.recordExecution(testModelId, 120, true);
    assert.strictEqual(
      modelRegistry.isModelHealthy(testModelId),
      true,
      "Model must recover to healthy state after successful execution"
    );
  });

  test("Fallback Chain returns multi-provider resilience list", () => {
    const chain = modelRegistry.resolveFallbackChain({
      taskIntent: "coding",
      requiresTools: true,
    }, 4);

    assert.ok(chain.length >= 2, "Fallback chain must contain at least 2 candidate models");
    // Ensure diverse providers in chain
    const providers = new Set(chain.map((m) => m.provider));
    assert.ok(providers.size >= 2, "Fallback chain should include diverse providers for fault tolerance");
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 2: DYNAMIC EXECUTION PLANNER
  // --------------------------------------------------------------------------
  console.log("\n--- Suite 2: Dynamic Execution Planner & Dependency Graph ---");

  test("Goal Decomposition generates structured DAG for spreadsheet analysis", () => {
    const dag = dynamicExecutionPlanner.planGoal(
      "Analyze sales spreadsheet dataset, compute statistics, and create presentation report with charts"
    );

    assert.ok(dag.planId.startsWith("plan_"), "Plan ID must be generated");
    assert.strictEqual(dag.isAcyclic, true, "Generated plan must be acyclic");
    assert.ok(dag.totalNodes >= 3, `Expected at least 3 nodes, got ${dag.totalNodes}`);
    assert.ok(dag.nodes["step_1_ingest"], "Must include step_1_ingest node");
    assert.ok(dag.nodes["step_2_stats"], "Must include step_2_stats node");
    assert.ok(dag.nodes["step_2_chart"], "Must include step_2_chart node");
    assert.ok(dag.nodes["step_3_synthesis"], "Must include step_3_synthesis node");
  });

  test("Kahn's Algorithm computes parallel execution tiers", () => {
    const dag = dynamicExecutionPlanner.planGoal(
      "Analyze CSV dataset, compute stats, and create charts"
    );

    assert.ok(dag.executionTiers.length >= 3, "Plan should have at least 3 sequential tiers");
    // Tier 0 should be step_1_ingest
    assert.deepStrictEqual(dag.executionTiers[0], ["step_1_ingest"]);

    // Tier 1 should contain BOTH step_2_stats AND step_2_chart (parallel execution!)
    const tier1 = dag.executionTiers[1];
    assert.ok(tier1.includes("step_2_stats"), "Tier 1 must include step_2_stats");
    assert.ok(tier1.includes("step_2_chart"), "Tier 1 must include step_2_chart");
    assert.strictEqual(tier1.length, 2, "Tier 1 must allow both independent step 2 tasks to run in parallel");

    // Tier 2 should be step_3_synthesis (depends on both step 2 tasks)
    assert.deepStrictEqual(dag.executionTiers[2], ["step_3_synthesis"]);
  });

  test("Cycle Detection identifies cyclic graph and handles gracefully", () => {
    const cyclicNodes = {
      node_a: {
        id: "node_a",
        stepNumber: 1,
        title: "Node A",
        description: "Node A desc",
        assignedAgent: "planning",
        dependencies: ["node_b"], // Cycle: A -> B -> A
        status: "PENDING",
        requiresApproval: false,
      },
      node_b: {
        id: "node_b",
        stepNumber: 2,
        title: "Node B",
        description: "Node B desc",
        assignedAgent: "programming",
        dependencies: ["node_a"],
        status: "PENDING",
        requiresApproval: false,
      },
    };

    const { isAcyclic, tiers } = dynamicExecutionPlanner.computeExecutionTiers(cyclicNodes);
    assert.strictEqual(isAcyclic, false, "Kahn's algorithm must flag graph with cycle as not acyclic");
    assert.ok(tiers.length > 0, "Must return fallback linear tiers to prevent permanent deadlock");
  });

  test("Dynamic Input Binding resolves upstream output templates", () => {
    const targetNode = {
      id: "step_3_synthesis",
      stepNumber: 3,
      title: "Synthesize",
      description: "Compile",
      assignedAgent: "document",
      dependencies: ["step_1_ingest", "step_2_stats"],
      status: "PENDING",
      requiresApproval: false,
      toolParameters: { title: "Executive Report" },
      inputBindings: {
        datasetSummary: "{{step_1_ingest.output.rowCount}}",
        metrics: "{{step_2_stats.output.mean}}",
      },
    };

    const completedNodes = {
      step_1_ingest: {
        id: "step_1_ingest",
        stepNumber: 1,
        title: "Ingest",
        description: "",
        assignedAgent: "data_analysis",
        dependencies: [],
        status: "COMPLETED",
        requiresApproval: false,
        output: { rowCount: 15420, columns: ["id", "revenue", "quarter"] },
      },
      step_2_stats: {
        id: "step_2_stats",
        stepNumber: 2,
        title: "Stats",
        description: "",
        assignedAgent: "mathematics",
        dependencies: ["step_1_ingest"],
        status: "COMPLETED",
        requiresApproval: false,
        output: { mean: 98.4, stdDev: 12.1 },
      },
    };

    const resolved = dynamicExecutionPlanner.resolveInputBindings(targetNode, completedNodes);
    assert.strictEqual(resolved.title, "Executive Report", "Preserves static tool parameters");
    assert.strictEqual(resolved.datasetSummary, 15420, "Resolves nested property {{step_1_ingest.output.rowCount}}");
    assert.strictEqual(resolved.metrics, 98.4, "Resolves nested property {{step_2_stats.output.mean}}");
  });

  test("Risk Assessment flags destructive database commands for human approval", () => {
    const dangerousDag = dynamicExecutionPlanner.planGoal(
      "Clean up old databases: DROP TABLE legacy_users and delete all records"
    );

    assert.strictEqual(
      dangerousDag.requiresApproval,
      true,
      "Dangerous operation must require human approval"
    );
    assert.ok(
      dangerousDag.approvalReasons.some((r) => r.includes("database alteration")),
      "Must state database alteration approval reason"
    );
  });

  test("Checkpoint Serialization and Deserialization maintains state integrity", () => {
    const dag = dynamicExecutionPlanner.planGoal("Research AI safety protocols and draft whitepaper");
    dag.nodes["step_1_search_a"].status = "COMPLETED";
    dag.nodes["step_1_search_a"].output = { results: ["Safety standard ISO-42001"] };

    // Save checkpoint
    const checkpoint = dynamicExecutionPlanner.saveCheckpoint(dag);
    assert.ok(checkpoint.checkpointId.startsWith("chk_"));
    assert.strictEqual(checkpoint.completedCount, 1);

    // Restore from serialized state
    const restored = dynamicExecutionPlanner.restoreCheckpoint(checkpoint.serializedState);
    assert.strictEqual(restored.planId, dag.planId);
    assert.strictEqual(restored.nodes["step_1_search_a"].status, "COMPLETED");
    assert.deepStrictEqual(
      restored.nodes["step_1_search_a"].output,
      { results: ["Safety standard ISO-42001"] }
    );
  });

  console.log(`\n================================================================================`);
  console.log(`  ALL ${passed} / ${total} TESTS PASSED (100% SUCCESS)`);
  console.log(`================================================================================\n`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
