/**
 * TATTVA AI - PHASE 24: USER FEEDBACK INTELLIGENCE TEST SUITE
 * Validates privacy consent checks, PII scrubbing, categorized ingestion,
 * workspace data isolation, deletion rights, and intelligence reporting.
 *
 * Authored by: kotapati Gowtham Chowdary
 */

import { feedbackIntelligenceService } from "../app/lib/feedback-intelligence/feedback-service";

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

async function runPhase24Tests() {
  console.log("\n========================================================");
  console.log("📊 TATTVA PHASE 24: USER FEEDBACK INTELLIGENCE TEST SUITE");
  console.log("========================================================\n");

  const userAlice = "usr_alice_dev";
  const userBob = "usr_bob_pm";

  // ----------------------------------------------------
  // TEST SECTION 1: USER CONSENT ENFORCEMENT & DISCARD
  // ----------------------------------------------------
  console.log("--- 1. User Consent Verification & Privacy Gates ---");

  // Attempt submitting without explicit user consent
  const unconsentedSubmission = feedbackIntelligenceService.submitFeedback({
    userId: userAlice,
    category: "not_helpful",
    rating: "negative",
    userComments: "I did not like the response.",
    userConsentedToStore: false, // User refused consent
  });

  assert(unconsentedSubmission.success === false, "Rejected feedback storage when userConsentedToStore is false");
  assert(
    unconsentedSubmission.error?.includes("consent is required") || false,
    "Informed client that unconsented feedback was safely discarded"
  );

  // ----------------------------------------------------
  // TEST SECTION 2: PII SCRUBBING ON CONSENTED FEEDBACK
  // ----------------------------------------------------
  console.log("\n--- 2. PII Scrubbing on Consented Ingestion ---");

  const consentedSubmission = feedbackIntelligenceService.submitFeedback({
    userId: userAlice,
    workspaceId: "ws_alpha_team",
    category: "incorrect_answer",
    rating: "negative",
    userComments: "Model returned invalid code for email validation. Contact me at alice.support@corp.org or call 415-555-2671.",
    userConsentedToStore: true,
    consentToAnonymizedImprovement: true,
  });

  assert(consentedSubmission.success === true, "Successfully accepted consented feedback");
  assert(!consentedSubmission.record?.userComments?.includes("alice.support@corp.org"), "Scrubbed reviewer email address");
  assert(consentedSubmission.record?.userComments?.includes("[REDACTED_EMAIL]"), "Inserted redacted email placeholder");
  assert(!consentedSubmission.record?.userComments?.includes("415-555-2671"), "Scrubbed reviewer phone number");

  // ----------------------------------------------------
  // TEST SECTION 3: CATEGORIZED INGESTION MATRIX
  // ----------------------------------------------------
  console.log("\n--- 3. Categorized Issue Ingestion Matrix ---");

  feedbackIntelligenceService.submitFeedback({
    userId: userAlice,
    workspaceId: "ws_alpha_team",
    category: "failed_tool_execution",
    rating: "negative",
    userComments: "The web search tool timed out on 2026 guidelines query.",
    toolInvolved: "web_search",
    userConsentedToStore: true,
  });

  feedbackIntelligenceService.submitFeedback({
    userId: userAlice,
    workspaceId: "ws_alpha_team",
    category: "document_processing_problem",
    rating: "negative",
    userComments: "Could not parse Excel spreadsheet headers properly.",
    userConsentedToStore: true,
  });

  feedbackIntelligenceService.submitFeedback({
    userId: userAlice,
    workspaceId: "ws_alpha_team",
    category: "user_experience_issue",
    rating: "negative",
    userComments: "Dark mode contrast in table headers is too faint.",
    userConsentedToStore: true,
  });

  feedbackIntelligenceService.submitFeedback({
    userId: userBob,
    workspaceId: "ws_beta_team",
    category: "helpful",
    rating: "positive",
    userComments: "Fantastic breakdown of Dijkstra algorithm!",
    userConsentedToStore: true,
  });

  // ----------------------------------------------------
  // TEST SECTION 4: USER & WORKSPACE ISOLATION
  // ----------------------------------------------------
  console.log("\n--- 4. Multi-Tenant Isolation & Zero Leakage ---");

  const aliceFeedback = feedbackIntelligenceService.listFeedback(userAlice);
  const bobFeedback = feedbackIntelligenceService.listFeedback(userBob);

  assert(aliceFeedback.length >= 4, `Alice retrieved only her feedback (${aliceFeedback.length} records)`);
  assert(
    !aliceFeedback.some((f) => f.userId === userBob),
    "Alice cannot view any of Bob's private feedback"
  );
  assert(
    !bobFeedback.some((f) => f.userId === userAlice),
    "Bob cannot view any of Alice's private feedback"
  );

  // ----------------------------------------------------
  // TEST SECTION 5: INTELLIGENCE REPORTING & CLUSTERS
  // ----------------------------------------------------
  console.log("\n--- 5. Feedback Pattern Clustering & Intelligence Reports ---");

  const report = feedbackIntelligenceService.generateIntelligenceReport();

  assert(report.totalFeedbackCount >= 5, `Aggregated total feedback count: ${report.totalFeedbackCount}`);
  assert(report.positiveCount >= 1, `Recorded positive signals: ${report.positiveCount}`);
  assert(report.negativeCount >= 4, `Recorded negative signals: ${report.negativeCount}`);
  assert(typeof report.satisfactionRate === "number", `Calculated satisfaction rate: ${report.satisfactionRate}%`);
  assert(report.clusters.length >= 3, `Formed ${report.clusters.length} distinct problem clusters`);
  assert(report.topReportedProblems.length > 0, "Identified prioritized top reported problems");

  // ----------------------------------------------------
  // TEST SECTION 6: DELETION RIGHTS & GDPR PURGE
  // ----------------------------------------------------
  console.log("\n--- 6. Deletion Rights & GDPR/CCPA Purge ---");

  const recordToDelete = aliceFeedback[0];

  // Bob attempts deleting Alice's record: Must be blocked
  const unauthorizedDelete = feedbackIntelligenceService.deleteFeedback(recordToDelete.id, userBob);
  assert(unauthorizedDelete === false, "Prevented cross-user feedback deletion");

  // Alice deletes her own record: Must succeed
  const authorizedDelete = feedbackIntelligenceService.deleteFeedback(recordToDelete.id, userAlice);
  assert(authorizedDelete === true, "Alice successfully deleted her feedback record");

  // Purge all records for Bob
  const purgedCount = feedbackIntelligenceService.purgeAllUserData(userBob);
  assert(purgedCount >= 1, `Purged all ${purgedCount} records for Bob under Right-To-Be-Forgotten`);
  assert(feedbackIntelligenceService.listFeedback(userBob).length === 0, "Bob has 0 remaining feedback records");

  console.log("\n========================================================");
  console.log(`🏁 PHASE 24 TEST RESULTS: ${testsPassed}/${testsRun} PASSED (${Math.round((testsPassed / testsRun) * 100)}%)`);
  console.log("========================================================\n");
}

runPhase24Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
