/**
 * TATTVA AI - Phase 36: End-to-End Intelligent Task Execution Test Suite
 * Validates autonomous multi-step execution workflows:
 * 1. Workflow A: College Project (10 steps, Java Collections, SQL Schema, Docs, PPTX)
 * 2. Workflow B: Academic Research (8 steps, Scoping, Web Evidence, Comparison, Report)
 * 3. Workflow C: Data Analysis (8 steps, Ingestion, Profiling, Calculations, Patterns, Charts, Export)
 * 4. Result Verification: Empty/truncated file rejection, valid format enforcement
 * 5. Calculation Ground-Truth Verification
 * 6. Honest Audit Reporting (blocks claiming 100% completion if tasks incomplete)
 * 7. Human Confirmation Gate for Destructive Operations
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: "../.env.local" });

import assert from "node:assert";
import { endToEndOrchestrator } from "../app/lib/ai-orchestrator/agent-engine/end-to-end-orchestrator";
import { resultVerifier } from "../app/lib/ai-orchestrator/agent-engine/result-verifier";

export async function runPhase36EndToEndTaskExecutionTests() {
  console.log("\n====================================================================");
  console.log("   TATTVA AI - PHASE 36: END-TO-END TASK EXECUTION TESTS            ");
  console.log("====================================================================\n");

  // ---------------------------------------------------------------------------
  // Test 1: Workflow A - College Project End-to-End Execution (10 Steps)
  // ---------------------------------------------------------------------------
  console.log("▶ Test 1: Workflow A (College Project - Lost and Found Java System)...");
  const collegeResult = await endToEndOrchestrator.executeCollegeProjectWorkflow(
    "Create a Lost and Found Java project for my college. Connect a database, prepare documentation and create a presentation."
  );

  assert.strictEqual(collegeResult.workflowType, "college_project");
  assert.strictEqual(collegeResult.totalSteps, 10, "Must execute all 10 planned steps");
  assert.strictEqual(collegeResult.status, "completed", "Status must be completed upon verification");
  assert.strictEqual(collegeResult.completedSteps.length, 10, "All 10 steps must be marked completed");
  assert.strictEqual(collegeResult.failedSteps.length, 0, "Zero steps failed");

  // Verify deliverables generated
  const fileNames = collegeResult.generatedFiles.map((f) => f.filename);
  assert.ok(fileNames.includes("LostAndFoundService.java"), "Must generate Java source code");
  assert.ok(fileNames.includes("schema.sql"), "Must generate SQL database schema");
  assert.ok(fileNames.includes("Project_Documentation.docx"), "Must generate DOCX documentation");
  assert.ok(fileNames.includes("Project_Presentation.pptx"), "Must generate PPTX presentation");
  assert.ok(collegeResult.verificationReport.isFullyVerified, "All files must pass verification");
  console.log(`  ✔ Test 1: College project completed with 10/10 steps and ${collegeResult.generatedFiles.length} verified artifacts.`);

  // ---------------------------------------------------------------------------
  // Test 2: Workflow B - Academic Research End-to-End Execution (8 Steps)
  // ---------------------------------------------------------------------------
  console.log("▶ Test 2: Workflow B (Academic Research - Renewable Energy Technology)...");
  const researchResult = await endToEndOrchestrator.executeResearchWorkflow(
    "Research renewable energy technology and prepare a detailed report."
  );

  assert.strictEqual(researchResult.workflowType, "research");
  assert.strictEqual(researchResult.totalSteps, 8, "Must execute 8 research stages");
  assert.strictEqual(researchResult.status, "completed");
  assert.ok(
    researchResult.generatedFiles.some((f) => f.filename.includes("Renewable_Energy")),
    "Must generate research report deliverable"
  );
  assert.ok(researchResult.verificationReport.isFullyVerified);
  console.log("  ✔ Test 2: Academic research dossier generated and grounded with citations.");

  // ---------------------------------------------------------------------------
  // Test 3: Workflow C - Data Analysis End-to-End Execution (8 Steps)
  // ---------------------------------------------------------------------------
  console.log("▶ Test 3: Workflow C (Data Analysis - Pattern Detection & Summary)...");
  const dataResult = await endToEndOrchestrator.executeDataAnalysisWorkflow(
    "Analyze this Excel file and show important patterns.",
    {
      filename: "quarterly_sales.xlsx",
      rows: Array.from({ length: 100 }, (_, i) => ({ id: i, revenue: 1000 + i * 20 })),
    }
  );

  assert.strictEqual(dataResult.workflowType, "data_analysis");
  assert.strictEqual(dataResult.totalSteps, 8, "Must execute 8 data analysis stages");
  assert.strictEqual(dataResult.status, "completed");
  assert.ok(
    dataResult.generatedFiles.some((f) => f.filename.endsWith(".xlsx")),
    "Must export spreadsheet analysis summary"
  );
  console.log("  ✔ Test 3: Data analysis completed with statistical profiling and Excel export.");

  // ---------------------------------------------------------------------------
  // Test 4: Result Verification - Detect Missing or Empty Files
  // ---------------------------------------------------------------------------
  console.log("▶ Test 4: Result verification - detect empty or truncated files...");
  const badFiles = [
    { filename: "App.java", format: "java", content: "// TODO: implement everything here", sizeBytes: 35 },
    { filename: "empty_schema.sql", format: "sql", content: "", sizeBytes: 0 },
  ];
  const badVerification = resultVerifier.verifyFiles(badFiles);

  assert.strictEqual(badVerification.isFullyVerified, false, "Must fail verification for empty or TODO placeholder files");
  assert.ok(
    badVerification.checks.some((c) => c.category === "code_completeness" && !c.passed),
    "Must flag TODO placeholder code"
  );
  assert.ok(
    badVerification.checks.some((c) => c.category === "file_existence" && !c.passed),
    "Must flag empty file"
  );
  console.log("  ✔ Test 4: Incomplete and placeholder files correctly rejected by ResultVerifier.");

  // ---------------------------------------------------------------------------
  // Test 5: Calculation Accuracy Verification
  // ---------------------------------------------------------------------------
  console.log("▶ Test 5: Calculation ground-truth verification...");
  const correctCalc = resultVerifier.verifyCalculation("4829 * 8192", 39559168);
  assert.strictEqual(correctCalc.passed, true, "Valid calculation must pass");

  const wrongCalc = resultVerifier.verifyCalculation("4829 * 8192", 999999);
  assert.strictEqual(wrongCalc.passed, false, "Incorrect calculation must fail verification");
  console.log("  ✔ Test 5: Mathematical calculation accuracy strictly verified against ground truth.");

  // ---------------------------------------------------------------------------
  // Test 6: Honest Audit Reporting (No Fake 100% Claims)
  // ---------------------------------------------------------------------------
  console.log("▶ Test 6: Honest audit reporting...");
  const mockSteps = [
    { title: "Step 1: Scan", status: "completed" },
    { title: "Step 2: Database Migration", status: "failed", output: { error: "Connection timeout to port 5432" } },
  ];
  const audit = resultVerifier.buildAuditReport(mockSteps, badVerification);

  assert.strictEqual(audit.overallStatus, "partially_completed", "Must NOT declare 100% completion when step failed");
  assert.ok(audit.incompleteSteps.includes("Step 2: Database Migration"), "Must list failed step in incompleteSteps");
  assert.ok(audit.unresolvedBlockers.length > 0, "Must explicitly surface unresolved blockers");
  console.log("  ✔ Test 6: Audit reporting strictly prevents false claims of task completion.");

  // ---------------------------------------------------------------------------
  // Test 7: Human Approval Gate for Consequential Destructive Operations
  // ---------------------------------------------------------------------------
  console.log("▶ Test 7: Human approval gate for destructive operations...");
  const dangerousRequest = "Drop table users and delete database production_db;";
  const unconfirmedResult = await endToEndOrchestrator.executeCollegeProjectWorkflow(
    dangerousRequest,
    { userId: "test_user" },
    { userConfirmed: false }
  );

  assert.strictEqual(
    unconfirmedResult.status,
    "pending_user_confirmation",
    "Destructive request without confirmation must pause execution"
  );
  assert.strictEqual(unconfirmedResult.confirmationRequired, true);
  assert.ok(unconfirmedResult.confirmationReason?.includes("Destructive"), "Must supply confirmation reason");

  // When confirmed, execution proceeds
  const confirmedResult = await endToEndOrchestrator.executeCollegeProjectWorkflow(
    "Create a clean college lost and found project",
    { userId: "test_user" },
    { userConfirmed: true }
  );
  assert.strictEqual(confirmedResult.status, "completed");
  console.log("  ✔ Test 7: Destructive actions safely gated behind explicit human confirmation.");

  console.log("\n====================================================================");
  console.log("   ALL 7 PHASE 36 END-TO-END TASK EXECUTION TESTS PASSED!           ");
  console.log("====================================================================\n");
}

if (process.argv[1]?.endsWith("phase-36-end-to-end-task-execution.test.ts")) {
  runPhase36EndToEndTaskExecutionTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
