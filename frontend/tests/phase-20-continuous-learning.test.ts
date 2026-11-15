/**
 * TATTVA AI - PHASE 20: CONTINUOUS LEARNING & IMPROVEMENT ENGINE TEST SUITE
 * Validates privacy-preserving feedback collection, PII scrubbing,
 * failure clustering, recommendation generation, regression prevention, and review gates.
 *
 * Authored by: kotapati Gowtham Chowdary
 */

import { feedbackCollector } from "../app/lib/continuous-learning/feedback-collector";
import { failureClusterer } from "../app/lib/continuous-learning/failure-clusterer";
import { recommendationGenerator } from "../app/lib/continuous-learning/recommendation-generator";
import { humanReviewGate } from "../app/lib/continuous-learning/human-review-gate";

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

async function runPhase20Tests() {
  console.log("\n========================================================");
  console.log("🔄 TATTVA PHASE 20: CONTINUOUS LEARNING ENGINE TEST SUITE");
  console.log("========================================================\n");

  // ----------------------------------------------------
  // TEST SECTION 1: PII SCRUBBING & FEEDBACK INGESTION
  // ----------------------------------------------------
  console.log("--- 1. PII Scrubbing & Feedback Collection ---");

  const sensitivePrompt = "Send my credentials to alice.smith@enterprise.org or call +1-555-839-2910 with api key AIzaSyD987654321012345678901234567890";
  const scrubbed = feedbackCollector.scrubPII(sensitivePrompt);

  assert(!scrubbed.includes("alice.smith@enterprise.org"), "Scrubbed personal email address");
  assert(scrubbed.includes("[REDACTED_EMAIL]"), "Inserted redacted email tag");
  assert(!scrubbed.includes("+1-555-839-2910"), "Scrubbed personal phone number");
  assert(scrubbed.includes("[REDACTED_PHONE]"), "Inserted redacted phone tag");
  assert(!scrubbed.includes("AIzaSyD987654321012345678901234567890"), "Scrubbed sensitive Google API key");
  assert(scrubbed.includes("[REDACTED_SECRET]"), "Inserted redacted secret tag");

  // Record 3 negative feedback signals
  feedbackCollector.recordFeedback({
    signal: "thumbs_down",
    prompt: "I asked for 3 bullet points with no intro, but you added a paragraph.",
    response: "Here is your summary...",
    userCorrection: "I told you not to include an intro constraint.",
  });

  feedbackCollector.recordFeedback({
    signal: "thumbs_down",
    prompt: "Return strictly a JSON object with keys 'status' and 'code'.",
    response: "```json\n{status: 'ok'}\n```",
    userCorrection: "The response had markdown fences instead of raw JSON format.",
  });

  feedbackCollector.recordFeedback({
    signal: "thumbs_down",
    prompt: "Who won the 2029 World Cup?",
    response: "The 2029 World Cup was won by France in Paris.",
    userCorrection: "The 2029 World Cup has not happened yet! This is a hallucination.",
  });

  const negativeEntries = feedbackCollector.getNegativeFeedback();
  assert(negativeEntries.length >= 3, `Cataloged ${negativeEntries.length} negative feedback items`);

  // ----------------------------------------------------
  // TEST SECTION 2: FAILURE CLUSTERING ACROSS TAXONOMY
  // ----------------------------------------------------
  console.log("\n--- 2. Failure Clustering Across 6-Class Taxonomy ---");

  const clusters = failureClusterer.clusterFailures(negativeEntries);
  assert(clusters.length >= 2, `Grouped failures into ${clusters.length} distinct systemic clusters`);
  assert(
    clusters.some((c) => c.category === "missed_constraint"),
    "Clustered missed constraint failures"
  );
  assert(
    clusters.some((c) => c.category === "format_error"),
    "Clustered format error failures"
  );
  assert(
    clusters.every((c) => c.impactScore > 0 && Boolean(c.inferredRootCause)),
    "Calculated impact scores and root causes for each cluster"
  );

  // ----------------------------------------------------
  // TEST SECTION 3: RECOMMENDATION GENERATION
  // ----------------------------------------------------
  console.log("\n--- 3. Actionable Improvement Proposal Generation ---");

  const proposals = recommendationGenerator.generateProposals(clusters);
  assert(proposals.length >= 2, `Generated ${proposals.length} targeted improvement proposals`);
  assert(
    proposals.some((p) => p.status === "pending_review"),
    "Proposals defaulted to 'pending_review' state"
  );
  assert(
    proposals.every((p) => Boolean(p.proposedChanges) && Boolean(p.title)),
    "Each proposal provides explicit proposed code/prompt diffs"
  );

  // ----------------------------------------------------
  // TEST SECTION 4: HUMAN REVIEW GATE & REGRESSION VERIFICATION
  // ----------------------------------------------------
  console.log("\n--- 4. Human-in-the-Loop Review Gate & Regression Prevention ---");

  const testProposal = proposals[0];
  humanReviewGate.registerProposal(testProposal);

  // Attempt approval BEFORE running regression check (Must be blocked)
  const prematureApproval = humanReviewGate.approveProposal(
    testProposal.proposalId,
    "kotapati Gowtham Chowdary",
    "Looks good to merge"
  );
  assert(
    prematureApproval.success === false,
    "Blocked unvetted production approval without pre-deployment regression check"
  );

  // Execute Pre-Deployment Regression Check
  const regressionResult = await humanReviewGate.runRegressionCheck(testProposal.proposalId, 97);
  assert(regressionResult.passed === true, "Pre-deployment benchmark verified no regression (Score: 97 vs 95)");
  assert(regressionResult.delta >= 0, `Performance improved by +${regressionResult.delta}%`);

  // Now approve strictly after regression pass
  const validApproval = humanReviewGate.approveProposal(
    testProposal.proposalId,
    "kotapati Gowtham Chowdary",
    "Verified against Phase 14 baseline benchmark. Safe to deploy."
  );
  assert(validApproval.success === true, "Approved proposal following successful regression verification");

  const approvedProposal = humanReviewGate.getProposal(testProposal.proposalId);
  assert(approvedProposal?.status === "approved", "Proposal status updated to 'approved'");
  assert(approvedProposal?.humanReviewer === "kotapati Gowtham Chowdary", "Recorded authenticated reviewer identity");

  console.log("\n========================================================");
  console.log(`🏁 PHASE 20 TEST RESULTS: ${testsPassed}/${testsRun} PASSED (${Math.round((testsPassed / testsRun) * 100)}%)`);
  console.log("========================================================\n");
}

runPhase20Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
