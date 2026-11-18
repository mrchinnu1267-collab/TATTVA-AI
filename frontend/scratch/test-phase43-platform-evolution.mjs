// frontend/scratch/test-phase43-platform-evolution.mjs
// Comprehensive Unit & Regression Test Suite for Phase 43:
// Continuous Evolution and Autonomous Platform Maintenance

import {
  PlatformEvolutionEngine,
  PlatformPerformanceMonitor,
  AIQualityEvaluator,
  ModelProviderManager,
  AutomatedBugDetector,
  BackupRecoveryVerifier,
  MonthlyReportGenerator,
} from "../app/lib/platform-evolution/index.ts";
import { centralizedToolRegistry } from "../app/lib/agent-engine/tool-registry.ts";

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("Starting Phase 43: Platform Evolution & Maintenance Test Suite");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`\x1b[32m✔\x1b[0m ${testName}`);
      passed++;
    } else {
      console.error(`\x1b[31m✘\x1b[0m ${testName}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. Performance Monitor & Percentile Calculation
  // -------------------------------------------------------------------------
  console.log("\n--- [Suite 1: Performance Monitor & Latency Percentiles] ---");
  const monitor = PlatformPerformanceMonitor.getInstance();

  const lats = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
  const percentiles = monitor.calculatePercentiles(lats);

  assert(percentiles.sampleCount === 10, "Percentiles sample count equals 10");
  assert(percentiles.avgMs === 550, "Average latency calculated correctly as 550ms");
  assert(percentiles.p50Ms === 600, "P50 latency calculated correctly");
  assert(percentiles.p90Ms === 1000, "P90 latency calculated correctly");

  monitor.recordRequest("/api/chat", 420, false);
  monitor.recordRequest("/api/chat", 890, false);
  monitor.recordRequest("/api/chat", 450, true, "Simulated upstream timeout");

  const snapshot = monitor.getSnapshot();
  assert(snapshot.totalRequestsHandled > 0, "Snapshot contains total requests handled");
  assert(snapshot.chatLatency.p50Ms > 0, "Chat P50 latency is positive");
  assert(snapshot.endpointMetrics["/api/chat"].errorCalls >= 1, "Recorded error call in endpoint metrics");
  assert(snapshot.storageUsageMb > 0, "Storage usage footprint is tracked");

  // -------------------------------------------------------------------------
  // 2. AI Quality Evaluator & Permanent Benchmarks
  // -------------------------------------------------------------------------
  console.log("\n--- [Suite 2: Permanent AI Quality Benchmarks] ---");
  const evaluator = AIQualityEvaluator.getInstance();

  const allQuestions = evaluator.getBenchmarkQuestions();
  assert(allQuestions.length >= 10, `Retrieved ${allQuestions.length} benchmark questions (minimum 10)`);

  const mathQuestions = evaluator.getBenchmarkQuestions("mathematics");
  assert(mathQuestions.length >= 2, "Retrieved mathematics benchmark questions");

  const progQuestions = evaluator.getBenchmarkQuestions("programming");
  assert(progQuestions.length >= 2, "Retrieved programming benchmark questions");

  // Test full evaluation suite
  const evalResult = evaluator.evaluateResponses("gemini-2.5-flash");
  assert(evalResult.overallScorePercent >= 85.0, `Overall evaluation score ${evalResult.overallScorePercent}% satisfies release threshold`);
  assert(evalResult.passedValidationGate === true, "Validation gate passes on baseline performance");
  assert(evalResult.categories.mathematics !== undefined, "Category mathematics evaluated");
  assert(evalResult.categories.programming !== undefined, "Category programming evaluated");
  assert(evalResult.categories.debugging !== undefined, "Category debugging evaluated");
  assert(evalResult.categories.reasoning !== undefined, "Category reasoning evaluated");
  assert(evalResult.categories.multilingual !== undefined, "Category multilingual evaluated");
  assert(evalResult.categories.continuity !== undefined, "Category continuity evaluated");
  assert(evalResult.categories.factuality !== undefined, "Category factuality evaluated");

  // -------------------------------------------------------------------------
  // 3. Model Provider Management & Canary Testing
  // -------------------------------------------------------------------------
  console.log("\n--- [Suite 3: Model Provider Registry & Canary Testing] ---");
  const provManager = ModelProviderManager.getInstance();

  const registeredModels = provManager.getRegisteredModels();
  assert(registeredModels.length >= 3, `Found ${registeredModels.length} registered models`);

  const geminiFlash = provManager.getModel("gemini-2.5-flash");
  assert(geminiFlash !== undefined, "Gemini 2.5 Flash is registered");
  assert(geminiFlash?.contextWindowTokens >= 1000000, "Gemini Flash context window is 1M+ tokens");
  assert(geminiFlash?.circuitState === "CLOSED", "Circuit breaker state is CLOSED");

  // Run Canary Test on candidate
  const candidate = {
    id: "candidate-gemini-fast-v3",
    provider: "google-gemini",
    displayName: "Gemini Fast v3 Candidate",
    tier: "fast",
    contextWindowTokens: 1048576,
    costPer1MTokensInUsd: 0.075,
    costPer1MTokensOutUsd: 0.3,
    isAvailable: true,
    consecutiveFailures: 0,
    averageLatencyMs: 350,
    errorRatePercent: 0.05,
    circuitState: "CLOSED",
  };

  const canaryResult = provManager.runCanaryTest(candidate);
  assert(canaryResult.candidateModelId === candidate.id, "Canary test executed for candidate ID");
  assert(canaryResult.recommendation === "promote_to_production", "Fast reliable candidate recommended for production promotion");

  // -------------------------------------------------------------------------
  // 4. Automated Bug Detector & Reproducible Diagnostics
  // -------------------------------------------------------------------------
  console.log("\n--- [Suite 4: Automated Bug Detector & Diagnostics] ---");
  const bugDetector = AutomatedBugDetector.getInstance();

  const newBug = bugDetector.captureError({
    severity: "high",
    subsystem: "software_studio",
    routeOrFunction: "POST /api/software-studio",
    errorMessage: "Test runtime exception for diagnostics verification",
    stackTraceSample: "Error: at software-studio/route.ts:42",
    reproductionSteps: ["1. Submit empty prompt.", "2. Observe handler catch."],
    suggestedAction: "Validate input prompt schema before processing.",
    isSafeToAutoFix: false,
  });

  assert(newBug.id.startsWith("diag_"), "Captured bug report with valid ID");
  assert(newBug.severity === "high", "Bug severity recorded correctly");

  const reports = bugDetector.getReports("high");
  assert(reports.some((r) => r.id === newBug.id), "Found captured bug in high severity filter");

  // -------------------------------------------------------------------------
  // 5. Backup & Recovery Verifier
  // -------------------------------------------------------------------------
  console.log("\n--- [Suite 5: Backup & Recovery Verification] ---");
  const backupVerifier = BackupRecoveryVerifier.getInstance();

  const backupReport = backupVerifier.verifyBackupIntegrity();
  assert(backupReport.overallBackupHealthy === true, "Backup verification reports healthy");
  assert(backupReport.databaseIntegrity.status === "verified", "Database table integrity verified");
  assert(backupReport.databaseIntegrity.checksum.length === 64, "Database checksum is valid 64-char SHA256 hex");
  assert(backupReport.fileStorageIntegrity.status === "verified", "File storage integrity verified");
  assert(backupReport.deploymentRollbackTarget.status === "available", "Deployment rollback target is available");
  assert(backupReport.deploymentRollbackTarget.rollbackCommit.length >= 7, "Rollback commit hash verified");

  // -------------------------------------------------------------------------
  // 6. Monthly Engineering Report Generator
  // -------------------------------------------------------------------------
  console.log("\n--- [Suite 6: Monthly Engineering Report Generator] ---");
  const monthlyRep = MonthlyReportGenerator.generateReport("November 2026");

  assert(monthlyRep.reportingPeriod === "November 2026", "Reporting period matches November 2026");
  assert(monthlyRep.platformHealthSummary.uptimePercent > 99.0, "Uptime percentage exceeds 99%");
  assert(monthlyRep.aiQualityBenchmarks.compositeAccuracyPercent > 80.0, "Composite accuracy is above 80%");
  assert(monthlyRep.providerAvailability["google-gemini"] !== undefined, "Google Gemini provider tracked in report");
  assert(monthlyRep.securityAudits.multiTenantIsolationPassed === true, "Multi-tenant isolation verified in report");

  const markdownRep = MonthlyReportGenerator.toMarkdown(monthlyRep);
  assert(markdownRep.includes("# TATTVA AI — Monthly Engineering Report: November 2026"), "Markdown report header generated");
  assert(markdownRep.includes("Platform Health & Performance Telemetry"), "Markdown report contains section 1");
  assert(markdownRep.includes("AI Quality & Evaluation Benchmarks"), "Markdown report contains section 2");

  // -------------------------------------------------------------------------
  // 7. Centralized Tool Registry Integration
  // -------------------------------------------------------------------------
  console.log("\n--- [Suite 7: Tool Registry Integration] ---");

  const healthTool = centralizedToolRegistry.getTool("get_platform_health_metrics");
  assert(healthTool !== undefined, "get_platform_health_metrics tool registered");
  const healthRes = await healthTool.execute({});
  assert(healthRes.success === true && healthRes.output.status !== undefined, "get_platform_health_metrics executes successfully");

  const evalTool = centralizedToolRegistry.getTool("run_ai_quality_eval");
  assert(evalTool !== undefined, "run_ai_quality_eval tool registered");
  const evalRes = await evalTool.execute({ targetModel: "gemini-2.5-flash" });
  assert(evalRes.success === true && evalRes.output.passedValidationGate === true, "run_ai_quality_eval executes successfully");

  const canaryTool = centralizedToolRegistry.getTool("test_model_canary");
  assert(canaryTool !== undefined, "test_model_canary tool registered");
  const canaryRes = await canaryTool.execute({ candidateModelId: "test-model-canary", displayName: "Test Canary Model" });
  assert(canaryRes.success === true && canaryRes.output.recommendation !== undefined, "test_model_canary executes successfully");

  const backupTool = centralizedToolRegistry.getTool("verify_backup_recovery");
  assert(backupTool !== undefined, "verify_backup_recovery tool registered");
  const backupRes = await backupTool.execute({});
  assert(backupRes.success === true && backupRes.output.overallHealthy === true, "verify_backup_recovery executes successfully");

  console.log(`\n=======================================================`);
  console.log(`Phase 43 Unit Test Suite Completed: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Fatal Test Suite Failure:", err);
  process.exit(1);
});
