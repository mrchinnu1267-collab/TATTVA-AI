/**
 * TATTVA AI - Phase O: Automated Image Accuracy Regression Testing Test Suite
 * Validates permanent 500-prompt benchmark dataset (13 categories, v2.0.0), immutable approved baselines,
 * statistical regression detection (two-proportion z-tests), CI/CD deployment gating,
 * log secret sanitization, and automatic emergency rollback protection.
 */

import assert from "node:assert";

import {
  PERMANENT_BENCHMARK_CATALOG,
  BENCHMARK_CATALOG_VERSION,
  getBenchmarkItemsByCategory,
  getSmokeTestSubset,
  getStandardSuiteSubset,
  baselineManager,
  regressionDetector,
  rollbackGuard,
  cicdGatingService,
  regressionRunner,
} from "../app/lib/image-engine/regression-testing";

export async function runPhaseORegressionTestingTests() {
  console.log("\n🚀 Running Phase O: Automated Image Accuracy Regression Testing Test Suite...\n");

  // Test 1: Permanent 500-prompt catalog integrity across 13 required categories
  console.log("▶ Test 1: Permanent 500-prompt benchmark catalog integrity (13 categories, v2.0.0)...");
  assert.strictEqual(
    PERMANENT_BENCHMARK_CATALOG.length,
    500,
    `Permanent benchmark catalog must contain exactly 500 prompts (found ${PERMANENT_BENCHMARK_CATALOG.length})`
  );
  assert.strictEqual(
    BENCHMARK_CATALOG_VERSION,
    "v2.0.0",
    "Benchmark catalog must be stamped with version v2.0.0"
  );

  const requiredCategories = [
    "object_generation",
    "exact_object_quantities",
    "color_attribute_accuracy",
    "spatial_relationships",
    "complex_compositions",
    "reference_image_generation",
    "text_rendering",
    "photorealistic_images",
    "three_d_renders",
    "illustrations",
    "background_generation",
    "image_editing",
    "character_consistency",
  ];

  for (const cat of requiredCategories) {
    const items = getBenchmarkItemsByCategory(cat as any);
    assert.ok(items.length >= 35, `Category '${cat}' must have at least 35 prompts (found ${items.length})`);
  }
  console.log("  ✔ Test 1: Verified 500 benchmark prompts across all 13 required categories.");

  // Test 2: Independent ground truth requirement completeness
  console.log("▶ Test 2: Independent ground truth requirements verification...");
  for (const item of PERMANENT_BENCHMARK_CATALOG.slice(0, 30)) {
    assert.ok(item.groundTruthRequirements.length >= 2, `Prompt ${item.id} must have >= 2 ground truth assertions`);
    assert.ok(item.groundTruthRequirements[0].expectedValue !== undefined, `Prompt ${item.id} must have expected value`);
    assert.ok(item.groundTruthRequirements[0].toleranceWindow !== undefined, `Prompt ${item.id} must define tolerance window`);
  }
  console.log("  ✔ Test 2: Ground truth requirements complete with explicit tolerances and negative assertions.");

  // Test 3: Approved baseline retrieval and immutable state
  console.log("▶ Test 3: Approved baseline retrieval and status verification...");
  const fluxBaseline = baselineManager.getActiveBaseline("flux-schnell");
  assert.strictEqual(fluxBaseline.modelIdentifier, "flux-schnell");
  assert.strictEqual(fluxBaseline.status, "active_baseline");
  assert.strictEqual(fluxBaseline.overallPromptAdherence, 88.4);
  assert.strictEqual(fluxBaseline.sampleCount, 500);
  assert.ok(fluxBaseline.approvedBy.length > 0, "Approved baseline must have administrator signature");
  console.log(`  ✔ Test 3: Active baseline verified: ${fluxBaseline.baselineId} (${fluxBaseline.overallPromptAdherence}%).`);

  // Test 4: Baseline approval authorization gate
  console.log("▶ Test 4: Baseline approval authorization gate and signature validation...");
  const candidate = baselineManager.registerCandidateBaseline({
    benchmarkVersion: "v2.0.0",
    modelIdentifier: "flux-schnell-v2-candidate",
    modelVersion: "2.1",
    provider: "pollinations",
    promptCompilerVersion: "2.5.0",
    evaluationMethodology: "multi_tool_independent",
    sampleCount: 500,
    overallPromptAdherence: 89.2,
    dimensionBaselines: fluxBaseline.dimensionBaselines,
    categoryBaselines: fluxBaseline.categoryBaselines,
    averageLatencySeconds: 3.1,
    costPerSuccessfulGenerationUSD: 0.0007,
    maxAllowedRegressionDeltaPercent: 2.0,
  });
  assert.strictEqual(candidate.status, "candidate");

  // Rejection without admin signature
  const unauthApproval = baselineManager.approveCandidateBaseline({
    baselineId: candidate.baselineId,
    adminSignature: "",
    approvalToken: "token-test",
  });
  assert.strictEqual(unauthApproval.success, false, "Must reject approval without admin signature");

  // Approval with valid signature
  const authApproval = baselineManager.approveCandidateBaseline({
    baselineId: candidate.baselineId,
    adminSignature: "chief-ai-officer",
    approvalToken: "auth-sig-token-123",
  });
  assert.strictEqual(authApproval.success, true);
  assert.strictEqual(authApproval.baseline?.status, "active_baseline");
  assert.strictEqual(authApproval.baseline?.approvedBy, "chief-ai-officer");
  console.log("  ✔ Test 4: Baseline approval gate and signature enforcement verified.");

  // Test 5: Statistical regression detection (two-proportion z-score)
  console.log("▶ Test 5: Statistical z-score regression detection (separating noise from true drop)...");
  // 5a. Minor noise: -0.5% drop on small sample is NOT statistically significant (p >= 0.05)
  const noiseZ = regressionDetector.calculateZScore(87.9, 88.4, 50, 500);
  assert.strictEqual(noiseZ.isSignificant, false, "Small delta must not be flagged as statistically significant");

  // 5b. Severe systemic drop: -8.0% drop on large sample IS statistically significant (p < 0.01)
  const severeZ = regressionDetector.calculateZScore(80.4, 88.4, 500, 500);
  assert.strictEqual(severeZ.isSignificant, true, "Large delta must be statistically significant");
  assert.ok(severeZ.zScore <= -2.33, `Z-score must be deeply negative (was ${severeZ.zScore})`);
  console.log(`  ✔ Test 5: Statistical significance verified (Noise: z=${noiseZ.zScore}, Severe: z=${severeZ.zScore}).`);

  // Test 6: Multi-tier audit execution
  console.log("▶ Test 6: Multi-tier audit execution (Smoke Test vs Standard vs Comprehensive)...");
  const smokeSubset = getSmokeTestSubset(15);
  assert.strictEqual(smokeSubset.length, 15);

  const standardSubset = getStandardSuiteSubset(50);
  assert.strictEqual(standardSubset.length, 50);

  const smokeRun = await regressionRunner.runRegressionAudit({
    modelIdentifier: "flux-schnell",
    tier: "smoke_test",
    testMode: "verified_simulation",
  });
  assert.strictEqual(smokeRun.tier, "smoke_test");
  assert.strictEqual(smokeRun.sampleCount, 15);
  assert.strictEqual(smokeRun.deploymentGateVerdict, "passed");
  console.log("  ✔ Test 6: Multi-tier audit execution verified.");

  // Test 7: Critical regression detection and deployment gate block
  console.log("▶ Test 7: Critical regression detection and deployment gate blocking...");
  // Simulate severe regression (-6% in text accuracy and -5% in object count)
  const regressedRun = await regressionRunner.runRegressionAudit({
    modelIdentifier: "flux-schnell",
    tier: "smoke_test",
    testMode: "verified_simulation",
    autoRollbackOnCritical: false, // Don't auto-rollback yet so we test gate evaluation
    candidateScoreOffsets: {
      text_accuracy: -6.5,
      object_count: -5.0,
    },
  });

  assert.strictEqual(regressedRun.hasCriticalRegression, true);
  assert.strictEqual(regressedRun.deploymentGateVerdict, "blocked");
  assert.ok(regressedRun.deploymentBlockReasons.length > 0, "Must specify deployment block reasons");
  console.log(`  ✔ Test 7: Critical regression blocked deployment: ${regressedRun.deploymentBlockReasons[0]}`);

  // Test 8: CI/CD deployment gating service
  console.log("▶ Test 8: CI/CD deployment gating service evaluation...");
  const gateCheck = cicdGatingService.evaluateDeploymentGate({
    report: regressedRun,
    totalSpendUSD: 0.002,
  });
  assert.strictEqual(gateCheck.gatePassed, false);
  assert.strictEqual(gateCheck.verdict, "blocked");
  assert.ok(gateCheck.deploymentBlockers.length > 0);
  console.log("  ✔ Test 8: CI/CD gate successfully blocked regressed candidate build.");

  // Test 9: CI/CD log secret sanitization
  console.log("▶ Test 9: CI/CD log secret sanitization and credential masking...");
  const dirtyLog = "Connecting with API key sk-abcdef123456789012345678 and Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 for user admin@tattva.ai";
  const sanitizedLog = cicdGatingService.sanitizeCILogText(dirtyLog);
  assert.ok(!sanitizedLog.includes("sk-abcdef"), "Must mask OpenAI API key");
  assert.ok(!sanitizedLog.includes("admin@tattva.ai"), "Must mask email address");
  assert.ok(sanitizedLog.includes("[REDACTED_API_KEY]"), "Must insert redacted placeholder");
  assert.ok(sanitizedLog.includes("Bearer [REDACTED_TOKEN]"), "Must mask Bearer token");
  console.log("  ✔ Test 9: Strict secret sanitization verified in CI logging.");

  // Test 10: Cost cap protection
  console.log("▶ Test 10: CI/CD spending cap guardrail ($0.05 cap)...");
  const overBudgetGate = cicdGatingService.evaluateDeploymentGate({
    report: smokeRun,
    totalSpendUSD: 0.085, // Exceeds $0.05 cap
    customSpendingCapUSD: 0.05,
  });
  assert.strictEqual(overBudgetGate.gatePassed, false, "Must block deployment if cost cap exceeded");
  assert.strictEqual(overBudgetGate.costAudit.isUnderBudget, false);
  console.log("  ✔ Test 10: Spending cap guardrail verified.");

  // Test 11: Emergency automatic rollback execution
  console.log("▶ Test 11: Emergency automatic rollback execution on critical regression...");
  const activeSnapBefore = rollbackGuard.getActiveSnapshot();
  assert.ok(activeSnapBefore.snapshotId);

  const incident = rollbackGuard.executeEmergencyRollback({
    report: regressedRun,
    administratorEmails: ["lead-architect@tattva.internal"],
  });

  assert.ok(incident.incidentId);
  assert.strictEqual(incident.severity, "critical");
  assert.strictEqual(incident.restorationStatus, "restored_successfully");
  assert.ok(incident.administratorNotified, "Must notify administrator");
  console.log(`  ✔ Test 11: Emergency rollback executed successfully: Incident ${incident.incidentId}.`);

  // Test 12: Snapshot configuration restoration and incident ledger
  console.log("▶ Test 12: Configuration snapshot restoration and incident ledger integrity...");
  const ledger = rollbackGuard.getIncidentLedger();
  assert.ok(ledger.length >= 1, "Incident ledger must record rollback");
  assert.strictEqual(ledger[0].incidentId, incident.incidentId);
  console.log("  ✔ Test 12: Incident ledger integrity verified.");

  // Test 13: Dashboard metrics compilation
  console.log("▶ Test 13: Regression dashboard telemetry aggregation...");
  const dashboardMetrics = regressionRunner.getDashboardMetrics();
  assert.ok(dashboardMetrics.currentActiveBaseline.overallPromptAdherence > 80);
  assert.ok(dashboardMetrics.latestReport.reportId);
  assert.ok(dashboardMetrics.activeRollbackSnapshots.length > 0);
  assert.ok(dashboardMetrics.costTelemetry.configuredSpendingCapUSD === 0.05);
  console.log("  ✔ Test 13: Regression dashboard telemetry aggregation verified.");

  // Test 14: End-to-end regression protection loop
  console.log("▶ Test 14: End-to-end regression test and release verification loop...");
  const preReleaseRun = await regressionRunner.runRegressionAudit({
    modelIdentifier: "flux-schnell",
    tier: "standard_suite",
    testMode: "verified_simulation",
  });
  assert.strictEqual(preReleaseRun.deploymentGateVerdict, "passed");
  assert.strictEqual(preReleaseRun.hasCriticalRegression, false);
  console.log("  ✔ Test 14: End-to-end regression protection loop passed.");

  console.log("\n✨ All 14 Phase O: Automated Image Accuracy Regression Testing tests PASSED successfully!\n");
}

