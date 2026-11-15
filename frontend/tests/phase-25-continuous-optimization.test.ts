/**
 * TATTVA AI - PHASE 25: CONTINUOUS OPTIMIZATION TEST SUITE
 * Validates latency optimization, intelligent routing, RAG context compression,
 * quality preservation, and anti-regression verification gates.
 *
 * Authored by: kotapati Gowtham Chowdary
 */

import { routingOptimizer } from "../app/lib/optimization-engine/routing-optimizer";
import { ragOptimizer } from "../app/lib/optimization-engine/rag-optimizer";
import { regressionVerifier } from "../app/lib/optimization-engine/regression-verifier";
import { RAGChunk } from "../app/lib/ai-orchestrator/types";

let testsRun = 0;
let testsPassed = 0;

function assert(condition: boolean, message: string) {
  testsRun++;
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  testsPassed++;
  console.log(`  ✅ [PASS] ${message}`);
}

async function runPhase25Tests() {
  console.log("\n========================================================");
  console.log("⚡ TATTVA PHASE 25: CONTINUOUS OPTIMIZATION TEST SUITE");
  console.log("========================================================\n");

  // ----------------------------------------------------
  // TEST SECTION 1: MODEL ROUTING & LATENCY OPTIMIZATION
  // ----------------------------------------------------
  console.log("--- 1. Model Routing & Latency Optimization ---");

  // Low complexity greeting / casual QA
  const lowComplexityRoute = routingOptimizer.optimizeRoute("conversational", 2);
  assert(lowComplexityRoute.selectedModel === "gemini-3.5-flash-lite", "Routed casual task to ultra-low-latency model");
  assert(lowComplexityRoute.estimatedLatencyMs <= 200, `Estimated latency is fast: ${lowComplexityRoute.estimatedLatencyMs}ms`);
  assert(lowComplexityRoute.costPer1kTokens < 0.0001, "Achieved lowest token cost tier");

  // High complexity multi-step coding
  const highComplexityRoute = routingOptimizer.optimizeRoute("coding", 9);
  assert(highComplexityRoute.selectedModel === "gemini-3.6-flash", "Routed deep coding task to frontier reasoning model");
  assert(highComplexityRoute.tier === "frontier_reasoning", "Assigned frontier reasoning tier");

  // ----------------------------------------------------
  // TEST SECTION 2: RAG CONTEXT COMPRESSION & TOKEN REDUCTION
  // ----------------------------------------------------
  console.log("\n--- 2. RAG Retrieval Context Compression ---");

  const mockChunks: RAGChunk[] = [
    {
      id: "chunk_opt_1",
      documentId: "doc_opt_1",
      documentName: "Kubernetes_Config.md",
      content:
        "Kubernetes clusters orchestrate containers across worker nodes. This is general filler text. Pods communicate via virtual network overlays. More redundant background text that does not answer specific query. The ingress controller binds to port 443 with TLS termination certificates.",
      chunkIndex: 0,
      sectionTitle: "Networking & Ingress",
    },
    {
      id: "chunk_opt_2",
      documentId: "doc_opt_1",
      documentName: "Kubernetes_Config.md",
      content:
        "Resource limits prevent noisy neighbor problems. CPU quotas throttle container execution. Memory limits trigger OOM killer if exceeded. The default limit is 512MiB per replica.",
      chunkIndex: 1,
      sectionTitle: "Resource Quotas",
    },
  ];

  const compressionResult = ragOptimizer.compressContext(mockChunks, "ingress controller port 443 TLS");

  assert(compressionResult.compressedContext.length > 0, "Generated compressed context");
  assert(compressionResult.compressedContext.includes("port 443"), "Preserved high-relevance ingress port sentence");
  assert(compressionResult.preservedCitations === 2, "Preserved all source citations");
  assert(compressionResult.tokenReductionPercentage > 0, `Achieved token reduction: ${compressionResult.tokenReductionPercentage}%`);

  // ----------------------------------------------------
  // TEST SECTION 3: ANTI-REGRESSION VERIFICATION GATES
  // ----------------------------------------------------
  console.log("\n--- 3. Anti-Regression Verification Gates ---");

  // Case A: Optimization causes accuracy drop > 1% (MUST FAIL)
  const regressedAttempt = regressionVerifier.verifyOptimization({
    dimension: "latency",
    baselineAccuracy: 95.5,
    candidateAccuracy: 93.0, // 2.5% drop
    baselineLatencyMs: 400,
    candidateLatencyMs: 150,
    constraintsSatisfied: true,
  });
  assert(regressedAttempt.passed === false, "Rejected optimization that sacrificed accuracy (> 1% drop)");
  assert(regressedAttempt.result.qualityPreserved === false, "Marked quality as degraded");

  // Case B: Optimization violates constraints (MUST FAIL)
  const constraintFailedAttempt = regressionVerifier.verifyOptimization({
    dimension: "token_cost",
    baselineAccuracy: 95.0,
    candidateAccuracy: 95.0,
    baselineLatencyMs: 300,
    candidateLatencyMs: 180,
    constraintsSatisfied: false, // Violated format or negative constraint
  });
  assert(constraintFailedAttempt.passed === false, "Rejected optimization that violated user constraints");

  // Case C: Legitimate optimization preserving 100% quality (MUST PASS)
  const certifiedOptimization = regressionVerifier.verifyOptimization({
    dimension: "latency",
    baselineAccuracy: 95.0,
    candidateAccuracy: 95.2, // Improved/maintained accuracy
    baselineLatencyMs: 420,
    candidateLatencyMs: 210, // 2x speedup
    constraintsSatisfied: true,
  });
  assert(certifiedOptimization.passed === true, "Certified legitimate optimization (210ms speedup with zero quality degradation)");
  assert(certifiedOptimization.result.qualityPreserved === true, "Quality verified preserved");

  console.log("\n========================================================");
  console.log(`🏁 PHASE 25 TEST RESULTS: ${testsPassed}/${testsRun} PASSED (${Math.round((testsPassed / testsRun) * 100)}%)`);
  console.log("========================================================\n");
}

runPhase25Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
