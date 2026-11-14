/**
 * TATTVA AI - AI Failure Analysis & Improvement Engine Test Suite
 * Validates Weakness Clustering, Evidence-Based Recommendations,
 * Human Approval Governance, and Storage Persistence.
 *
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { failureAnalyzer } from "../app/lib/evaluation/improvement/failure-analyzer";
import { EvaluationRunSummary } from "../app/lib/evaluation/mmmlu/types";

export async function runPerformanceImprovementTests() {
  console.log("\n========================================================");
  console.log("📈 TATTVA PERFORMANCE IMPROVEMENT & FAILURE ANALYSIS SUITE");
  console.log("========================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
    }
  }

  // 1. Synthetic Perfect Evaluation Run
  console.log("--- 1. Clean Run Analysis (Zero Errors) ---");
  const perfectRun: EvaluationRunSummary = {
    id: "eval_test_perfect",
    datasetName: "MMMLU Hindi",
    datasetVersion: "1.0.0",
    language: "hi-IN",
    provider: "gemini",
    model: "gemini-2.5-flash",
    totalQuestions: 5,
    attemptedQuestions: 5,
    correctAnswers: 5,
    incorrectAnswers: 0,
    invalidResponses: 0,
    failedRequests: 0,
    accuracy: 100,
    rawAccuracy: 100,
    durationMs: 4000,
    averageResponseTimeMs: 800,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    subjectAccuracy: {},
    results: [
      {
        questionId: 1,
        question: "Q1",
        subject: "math",
        expectedAnswer: "A",
        aiAnswer: "A",
        isCorrect: true,
        latencyMs: 750,
        status: "correct",
      },
    ],
  };

  const perfectReport = failureAnalyzer.analyzeRun(perfectRun);
  assert(perfectReport.totalErrors === 0, "Correctly identifies 0 errors in clean run");
  assert(perfectReport.clusters.length === 0, "No weakness clusters generated for perfect run");
  assert(perfectReport.recommendations.length === 0, "No recommendations needed for 100% accuracy run");

  // 2. Synthetic Imperfect Run with Malformed Formatting & Knowledge Gaps
  console.log("--- 2. Weakness Clustering & Evidence Assembly ---");
  const flawedRun: EvaluationRunSummary = {
    id: "eval_test_flawed",
    datasetName: "MMMLU Hindi",
    datasetVersion: "1.0.0",
    language: "hi-IN",
    provider: "gemini",
    model: "gemini-2.5-flash",
    totalQuestions: 6,
    attemptedQuestions: 6,
    correctAnswers: 2,
    incorrectAnswers: 3,
    invalidResponses: 1,
    failedRequests: 0,
    accuracy: 33.33,
    rawAccuracy: 33.33,
    durationMs: 5000,
    averageResponseTimeMs: 833,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    subjectAccuracy: {},
    results: [
      // 2 correct
      { questionId: 101, question: "Q1", subject: "physics", expectedAnswer: "A", aiAnswer: "A", isCorrect: true, latencyMs: 800, status: "correct" },
      { questionId: 102, question: "Q2", subject: "chemistry", expectedAnswer: "B", aiAnswer: "B", isCorrect: true, latencyMs: 820, status: "correct" },
      // 1 malformed
      { questionId: 103, question: "Q3", subject: "sociology", expectedAnswer: "C", aiAnswer: "INVALID", isCorrect: false, latencyMs: 900, status: "invalid_response" },
      // 3 knowledge gap errors in sociology
      { questionId: 104, question: "Q4", subject: "sociology", expectedAnswer: "D", aiAnswer: "B", isCorrect: false, latencyMs: 850, status: "incorrect" },
      { questionId: 105, question: "Q5", subject: "sociology", expectedAnswer: "A", aiAnswer: "C", isCorrect: false, latencyMs: 810, status: "incorrect" },
      { questionId: 106, question: "Q6", subject: "sociology", expectedAnswer: "B", aiAnswer: "D", isCorrect: false, latencyMs: 790, status: "incorrect" },
    ],
  };

  const flawedReport = failureAnalyzer.analyzeRun(flawedRun);
  assert(flawedReport.totalErrors === 4, `Detected all 4 errors (${flawedReport.totalErrors})`);
  assert(flawedReport.clusters.length >= 2, `Assembled ${flawedReport.clusters.length} failure clusters`);

  const fmtCluster = flawedReport.clusters.find((c) => c.category === "answer_formatting_malformed");
  assert(Boolean(fmtCluster), "Detected 'answer_formatting_malformed' cluster");
  assert(fmtCluster!.count === 1, `Formatting cluster count is: ${fmtCluster!.count}`);

  const subjCluster = flawedReport.clusters.find((c) => c.category === "subject_knowledge_gap");
  assert(Boolean(subjCluster), "Detected 'subject_knowledge_gap' cluster");
  assert(subjCluster!.affectedSubjects.includes("sociology"), "Identified 'sociology' as affected weak subject");

  // 3. Actionable Recommendations
  console.log("--- 3. Actionable Recommendations Generation ---");
  assert(flawedReport.recommendations.length >= 2, `Generated ${flawedReport.recommendations.length} recommendations`);

  const firstRec = flawedReport.recommendations[0];
  assert(firstRec.humanApprovalStatus === "pending_review", `Initial human approval status is 'pending_review'`);
  assert(Boolean(firstRec.actionableStep), "Recommendation contains explicit actionable step");
  assert(Boolean(firstRec.supportingEvidence?.sampleErrors?.length), "Recommendation includes supporting error evidence");

  // 4. Human Approval Workflow
  console.log("--- 4. Human Approval Governance & State Transitions ---");
  const approved = failureAnalyzer.updateRecommendationStatus(
    flawedReport.id,
    firstRec.id,
    "approved",
    "kotapati Gowtham Chowdary"
  );
  assert(approved === true, "Successfully approved recommendation with lead reviewer signature");

  const reloadedReport = failureAnalyzer.getAnalysisById(flawedReport.id);
  const updatedRec = reloadedReport?.recommendations.find((r) => r.id === firstRec.id);
  assert(updatedRec?.humanApprovalStatus === "approved", "Status transitioned to 'approved'");
  assert(updatedRec?.reviewedBy === "kotapati Gowtham Chowdary", `Reviewer signature recorded: ${updatedRec?.reviewedBy}`);

  // Transition to implemented
  failureAnalyzer.updateRecommendationStatus(flawedReport.id, firstRec.id, "implemented");
  const implementedRec = failureAnalyzer.getAnalysisById(flawedReport.id)?.recommendations.find((r) => r.id === firstRec.id);
  assert(implementedRec?.humanApprovalStatus === "implemented", "Status transitioned to 'implemented'");
  assert(Boolean(implementedRec?.implementedAt), "Implementation timestamp recorded");

  // 5. Persistence & History
  console.log("--- 5. Vault Persistence & History ---");
  const allAnalyses = failureAnalyzer.listAnalyses();
  assert(allAnalyses.length >= 1, `Analyses history list contains ${allAnalyses.length} reports`);

  // Summary
  console.log("\n========================================================");
  console.log(`🏁 PERFORMANCE IMPROVEMENT TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("========================================================\n");

  if (passed !== total) {
    throw new Error(`Performance Improvement tests failed: ${total - passed} failure(s)`);
  }
  return { passed, total };
}

if (require.main === module || process.argv.includes("--run")) {
  runPerformanceImprovementTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
