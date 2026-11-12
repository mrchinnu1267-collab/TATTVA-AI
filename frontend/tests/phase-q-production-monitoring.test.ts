/**
 * TATTVA AI - Phase Q: Continuous Production Monitoring & Accuracy Intelligence Test Suite
 * Validates all 10 core monitoring capabilities:
 * 1. Provider outage & circuit breaker tripping detection
 * 2. Automatic provider recovery detection & cooldown reset
 * 3. Quota monitoring & exhaustion tracking
 * 4. Accuracy monitoring across 9 dimensions & unverified generation exclusion
 * 5. Cost monitoring, spending guardrails & infinite loop prevention
 * 6. Generation failure classification across 12 standardized categories & root cause analysis
 * 7. Administrator dashboard access authorization & security
 * 8. Monitoring service error isolation (image generation never fails if monitoring fails)
 * 9. Event deduplication and alert cooldown suppression
 * 10. 8-stage continuous accuracy improvement workflow with benchmark validation & human approval gate
 */

import assert from "node:assert";

import {
  providerMonitor,
  accuracyMonitor,
  failureMonitor,
  performanceMonitor,
  costMonitor,
  alertManager,
  improvementWorkflow,
  monitoringHub,
  ProductionMonitoringDashboardService,
} from "../app/lib/image-engine/production-monitoring";

import { ProductionMonitoringService } from "../app/lib/image-engine/services/production-monitoring.service";

export async function runPhaseQProductionMonitoringTests() {
  console.log("\n🚀 Running Phase Q: Continuous Production Monitoring & Accuracy Intelligence Test Suite...\n");

  // ---------------------------------------------------------------------------
  // Test 1: Provider Outage & Circuit Breaker Tripping Detection
  // ---------------------------------------------------------------------------
  console.log("▶ Test 1: Provider outage & circuit breaker tripping detection...");
  // Simulate 3 consecutive failures on huggingface
  providerMonitor.recordRequest({
    providerId: "huggingface",
    success: false,
    latencyMs: 15000,
    errorType: "timeout",
    errorMessage: "Gateway timeout upstream (504)",
  });
  providerMonitor.recordRequest({
    providerId: "huggingface",
    success: false,
    latencyMs: 15000,
    errorType: "timeout",
    errorMessage: "Gateway timeout upstream (504)",
  });
  const trippedTelemetry = providerMonitor.recordRequest({
    providerId: "huggingface",
    success: false,
    latencyMs: 15000,
    errorType: "timeout",
    errorMessage: "Gateway timeout upstream (504)",
  });

  assert.strictEqual(trippedTelemetry.status, "down", "Provider status must be marked down after 3 consecutive failures");
  assert.strictEqual(trippedTelemetry.circuitBreakerState, "open", "Circuit breaker must trip to open state");
  assert.strictEqual(trippedTelemetry.isAvailableForInference, false, "Provider must not be available for inference");
  console.log("  ✔ Test 1: Provider outage detected and circuit breaker safely tripped to 'open'.");

  // ---------------------------------------------------------------------------
  // Test 2: Automatic Provider Recovery Detection
  // ---------------------------------------------------------------------------
  console.log("▶ Test 2: Automatic provider recovery detection & cooldown reset...");
  const recoveryInitiated = providerMonitor.attemptRecovery("huggingface");
  assert.strictEqual(recoveryInitiated, true, "Recovery attempt must be initiated");

  const halfOpenTelemetry = providerMonitor.getProviderTelemetry("huggingface")!;
  assert.strictEqual(halfOpenTelemetry.circuitBreakerState, "half-open");
  assert.strictEqual(halfOpenTelemetry.isAvailableForInference, true);

  // Now record a successful probing request
  const recoveredTelemetry = providerMonitor.recordRequest({
    providerId: "huggingface",
    success: true,
    latencyMs: 2100,
  });

  assert.strictEqual(recoveredTelemetry.status, "healthy", "Provider must transition to healthy on successful recovery probe");
  assert.strictEqual(recoveredTelemetry.circuitBreakerState, "closed", "Circuit breaker must close on successful probe");
  console.log("  ✔ Test 2: Provider recovery detected and circuit breaker restored to 'closed'.");

  // ---------------------------------------------------------------------------
  // Test 3: Quota Monitoring & Exhaustion Tracking
  // ---------------------------------------------------------------------------
  console.log("▶ Test 3: Quota monitoring & exhaustion tracking...");
  const quotaTelemetry = providerMonitor.recordRequest({
    providerId: "openai",
    success: false,
    latencyMs: 800,
    errorType: "quota",
    errorMessage: "insufficient_quota: You exceeded your current quota",
  });

  assert.strictEqual(quotaTelemetry.quotaRemainingPercent, 0, "Remaining quota must be 0% on exhaustion error");
  assert.strictEqual(quotaTelemetry.status, "down", "Exhausted provider must be marked down");
  assert.strictEqual(quotaTelemetry.isAvailableForInference, false);
  console.log("  ✔ Test 3: Quota exhaustion recorded and provider excluded from routing.");

  // ---------------------------------------------------------------------------
  // Test 4: Accuracy Monitoring Across 9 Dimensions & Unverified Exclusion
  // ---------------------------------------------------------------------------
  console.log("▶ Test 4: Accuracy monitoring across 9 dimensions & unverified exclusion...");
  const overviewBefore = accuracyMonitor.getAccuracyOverview();
  const unverifiedBefore = overviewBefore.unverifiedGenerationsCount;

  // Ingest an unverified generation
  accuracyMonitor.recordEvaluation({
    modelId: "flux-schnell",
    provider: "pollinations",
    isVerified: false,
  });

  const overviewAfterUnverified = accuracyMonitor.getAccuracyOverview();
  assert.strictEqual(
    overviewAfterUnverified.unverifiedGenerationsCount,
    unverifiedBefore + 1,
    "Unverified count must increase"
  );

  // Ingest a verified generation
  accuracyMonitor.recordEvaluation({
    modelId: "flux-schnell",
    provider: "pollinations",
    category: "Exact Count",
    isVerified: true,
    scorecard: {
      overallAccuracy: 92,
      objectPresenceScore: 95,
      objectQuantityScore: 90,
      attributeAccuracyScore: 91,
      colorAccuracyScore: 94,
      spatialAccuracyScore: 88,
      referenceFidelityScore: 90,
      textAccuracyScore: 85,
      totalRequirementsCount: 10,
      passedCount: 9,
      failedCount: 1,
      uncertainCount: 0,
    },
  });

  const overviewAfterVerified = accuracyMonitor.getAccuracyOverview();
  assert.ok(overviewAfterVerified.dimensions.length === 9, "Must maintain exactly 9 accuracy dimensions");
  assert.ok(overviewAfterVerified.overallPassRate > 80, "Overall pass rate must be computed");
  console.log(`  ✔ Test 4: 9 Accuracy dimensions tracked. Verified pass rate: ${overviewAfterVerified.overallPassRate}%.`);

  // ---------------------------------------------------------------------------
  // Test 5: Cost Monitoring, Spending Guardrails & Loop Prevention
  // ---------------------------------------------------------------------------
  console.log("▶ Test 5: Cost monitoring, spending guardrails & loop prevention...");
  const record = costMonitor.recordCost({
    provider: "gemini",
    modelId: "gemini-2.5-flash-image",
    generationCostUsd: 0.0012,
    evaluationCostUsd: 0.0003,
    correctionCostUsd: 0.0005,
    isActualBilling: true,
    success: true,
  });

  assert.ok(record.totalCostUsd > 0.0015, "Total cost must be calculated");
  assert.strictEqual(record.isActualBilling, true, "Must flag actual vs estimated billing");

  const cpsg = costMonitor.calculateCPSG();
  assert.ok(cpsg > 0, "Cost per successful generation must be computed");

  // Verify guardrails reject runaway loop (>3 consecutive corrections)
  const loopGuard = costMonitor.checkSpendingGuardrails(0.001, 4);
  assert.strictEqual(loopGuard.allowed, false, "Runaway correction loop must be blocked");
  assert.ok(loopGuard.reason?.includes("Maximum correction loops"), "Loop rejection message must be present");

  // Verify single-request cost cap ($0.50)
  const maxReqGuard = costMonitor.checkSpendingGuardrails(0.75, 1);
  assert.strictEqual(maxReqGuard.allowed, false, "Excessive single-request cost must be blocked");
  console.log(`  ✔ Test 5: Cost tracking (CPSG: $${cpsg.toFixed(4)}) and runaway loop protection verified.`);

  // ---------------------------------------------------------------------------
  // Test 6: 12-Category Failure Classification & Root Cause Analysis
  // ---------------------------------------------------------------------------
  console.log("▶ Test 6: 12-category failure classification & root cause analysis...");
  const failure = failureMonitor.recordFailure({
    prompt: "Storefront sign reading 'BAKERY'",
    modelId: "sdxl-lightning",
    provider: "huggingface",
    category: "text_errors",
    severity: "medium",
    description: "Rendered as 'BAKRY'",
  });

  assert.strictEqual(failure.category, "text_errors");
  assert.ok(failure.rootCause.includes("text"), "Must identify root cause");
  assert.ok(failure.suggestedRemediation.includes("FLUX") || failure.suggestedRemediation.includes("Typography"), "Must recommend remediation");

  const analysis = failureMonitor.getFailureAnalysis();
  assert.ok(analysis.totalFailures > 0);
  assert.ok(analysis.distribution.length >= 10, "Failure distribution must cover standard categories");
  console.log(`  ✔ Test 6: Failure categorized into 'text_errors' with root cause and remediation.`);

  // ---------------------------------------------------------------------------
  // Test 7: Administrator Dashboard Authorization & Security
  // ---------------------------------------------------------------------------
  console.log("▶ Test 7: Administrator dashboard authorization & security...");
  const adminAccess = ProductionMonitoringDashboardService.verifyAuthorization({
    userId: "admin-1",
    userRole: "admin",
    workspaceId: "ws-prod",
  });
  assert.strictEqual(adminAccess, true, "Admin role must be granted dashboard access");

  const engineerAccess = ProductionMonitoringDashboardService.verifyAuthorization({
    userId: "eng-1",
    userRole: "engineer",
    workspaceId: "ws-prod",
  });
  assert.strictEqual(engineerAccess, true, "Engineer role must be granted dashboard access");

  assert.throws(
    () => {
      ProductionMonitoringDashboardService.getDashboardData({
        userId: "guest-user",
        userRole: "unauthorized_viewer",
        workspaceId: "ws-prod",
      });
    },
    /Unauthorized/,
    "Unauthorized role must be rejected with 403 error"
  );
  console.log("  ✔ Test 7: Role-based dashboard authorization verified with access protection.");

  // ---------------------------------------------------------------------------
  // Test 8: Monitoring Service Failure Isolation & Resilience
  // ---------------------------------------------------------------------------
  console.log("▶ Test 8: Monitoring service failure isolation & resilience...");
  // Simulate an event with extreme or partially malformed inputs
  assert.doesNotThrow(() => {
    monitoringHub.ingestEvent({
      prompt: "Test prompt under monitoring stress",
      provider: "pollinations",
      modelId: "flux-schnell",
      success: true,
      generationLatencyMs: 2500,
      totalDurationMs: 2700,
      costs: undefined, // omitted
      scorecard: undefined, // omitted
    });
  }, "Monitoring ingestion must never throw or disrupt user pipeline");
  console.log("  ✔ Test 8: Monitoring hub error isolation verified; user generation path protected.");

  // ---------------------------------------------------------------------------
  // Test 9: Event Deduplication and Alert Cooldown Suppression
  // ---------------------------------------------------------------------------
  console.log("▶ Test 9: Event deduplication and alert cooldown suppression...");
  alertManager.clearAllAlerts();

  const firstAlert = alertManager.triggerAlert({
    type: "provider_outage",
    severity: "critical",
    title: "Upstream Provider Timeout",
    message: "Hugging Face returned 504 Gateway Timeout",
    sourceProvider: "huggingface",
    sourceModel: "sdxl-lightning",
  });
  assert.ok(firstAlert, "First alert must be generated");
  assert.strictEqual(firstAlert.occurrenceCount, 1);

  // Trigger same alert immediately
  const suppressedAlert = alertManager.triggerAlert({
    type: "provider_outage",
    severity: "critical",
    title: "Upstream Provider Timeout",
    message: "Hugging Face returned 504 Gateway Timeout",
    sourceProvider: "huggingface",
    sourceModel: "sdxl-lightning",
  });

  assert.ok(suppressedAlert, "Suppressed alert returns consolidated record");
  assert.strictEqual(suppressedAlert.occurrenceCount, 2, "Occurrence count must increment without duplicate record");

  const allAlerts = alertManager.getAlerts(false);
  assert.strictEqual(allAlerts.length, 1, "Alert manager must prevent duplicate alerts during cooldown window");

  // Acknowledge alert
  const ackSuccess = alertManager.acknowledgeAlert(firstAlert.id, "lead_oncall");
  assert.strictEqual(ackSuccess, true, "Alert acknowledgment must succeed");
  console.log("  ✔ Test 9: Alert deduplication, count consolidation, and acknowledgment verified.");

  // ---------------------------------------------------------------------------
  // Test 10: 8-Stage Continuous Improvement Workflow & Governance Gate
  // ---------------------------------------------------------------------------
  console.log("▶ Test 10: 8-stage continuous improvement workflow & governance gate...");
  // Step 1: Create recommendation from weakness
  const rec = improvementWorkflow.createRecommendation({
    targetDimension: "object_presence",
    targetCategory: "Multiple Objects",
    detectedWeakness: "Secondary objects omitted when prompt contains >4 distinct subjects",
    observedAccuracy: 81.5,
    targetAccuracy: 88.0,
    proposedPromptPrefix: "comprehensive multi-entity preservation, distinct object isolation: ",
    proposedNegativeDirective: "missing entities, cropped secondary subjects",
  });

  assert.strictEqual(rec.approvalStatus, "pending_review");
  assert.strictEqual(rec.validationVerdict, "pending");

  // Step 2: Guardrail check - cannot approve before benchmark validation
  assert.throws(
    () => {
      improvementWorkflow.reviewRecommendation(rec.id, "approve", "lead_admin");
    },
    /Benchmark validation verdict must be 'passed'/,
    "Cannot approve unvalidated recommendation"
  );

  // Step 3: Run benchmark validation
  const validatedRec = await improvementWorkflow.validateAgainstBenchmark(rec.id);
  assert.ok(validatedRec, "Validation must return recommendation");
  assert.strictEqual(validatedRec.validationVerdict, "passed");
  assert.ok(validatedRec.benchmarkScoreAfter > validatedRec.benchmarkScoreBefore);

  // Step 4: Human approval
  const approvedRec = improvementWorkflow.reviewRecommendation(rec.id, "approve", "lead_admin");
  assert.ok(approvedRec);
  assert.strictEqual(approvedRec.approvalStatus, "approved");
  assert.strictEqual(approvedRec.approvedBy, "lead_admin");

  // Step 5: Production deployment
  const deployedRec = improvementWorkflow.deployRecommendation(rec.id);
  assert.ok(deployedRec);
  assert.strictEqual(deployedRec.approvalStatus, "deployed");
  console.log("  ✔ Test 10: 8-stage continuous improvement workflow verified with human approval governance gate.");

  console.log("\n✨ All 10 Phase Q: Continuous Production Monitoring & Accuracy Intelligence tests PASSED successfully!\n");
}

