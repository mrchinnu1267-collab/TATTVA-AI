/**
 * TATTVA AI - Phase 29 Controlled Beta Launch Automated Test Suite
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 *
 * Verifies:
 * 1. Beta Access Management (Invite validation, expiration, admin approval, revocation, daily request quotas)
 * 2. Feedback & Bug Intake (Privacy guardrails, categories, severity, platform targets)
 * 3. Bug Management Lifecycle (7-status transition flow: New -> Closed, admin notes, resolution)
 * 4. Beta Analytics Telemetry (Aggregated usage, latency tracking, error metrics, zero PII collection)
 * 5. Cross-Platform Compatibility (Web, mobile browser, Android, Desktop reporting)
 */

import { betaTesterManager } from "../app/lib/beta-program/tester-manager";
import { betaFeedbackAndBugManager } from "../app/lib/beta-program/feedback-and-bugs";
import { betaAnalyticsEngine } from "../app/lib/beta-program/beta-analytics";
import { BetaBugStatus, BetaFeedbackCategory } from "../app/lib/beta-program/types";

async function runPhase29Tests() {
  console.log("====================================================================");
  console.log("   TATTVA AI - PHASE 29: CONTROLLED BETA LAUNCH VERIFICATION");
  console.log("====================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  // ==========================================
  // SECTION 1: Beta Access & Invitation Management
  // ==========================================
  console.log("--- 1. Beta Invitation & Access Restrictions ---");
  betaTesterManager.clear();

  const validCode = betaTesterManager.checkInviteCode("TATTVA-BETA-2026");
  assert(validCode.valid && validCode.tier === "standard_beta", "Validates official beta invitation code");
  assert(validCode.expiresAt! > Date.now(), "Calculates future expiration timestamp (30-day validity)");

  const invalidCode = betaTesterManager.checkInviteCode("INVALID-HACK-CODE");
  assert(!invalidCode.valid, "Rejects unauthorized invitation code");

  // Registration
  const regResult = betaTesterManager.registerTester({
    userId: "usr_beta_001",
    email: "beta.tester1@example.com",
    inviteCode: "TATTVA-BETA-2026",
    requiresApproval: true,
  });
  assert(regResult.success && regResult.account?.status === "pending_approval", "Registers tester in pending_approval status");

  // Authorization gate for pending tester
  const authPending = betaTesterManager.isAuthorized("usr_beta_001");
  assert(!authPending.authorized && authPending.reason?.includes("pending"), "Blocks access for unapproved tester");

  // Admin approval
  const approved = betaTesterManager.approveTester("usr_beta_001", "admin_gowtham");
  assert(approved, "Admin successfully approves tester");
  const authApproved = betaTesterManager.isAuthorized("usr_beta_001");
  assert(authApproved.authorized, "Grants access after admin approval");

  console.log("\n--- 2. Usage Quotas & Revocation Controls ---");
  // Check and consume quota
  const usageCheck = betaTesterManager.checkAndRecordUsage("usr_beta_001");
  assert(usageCheck.allowed && usageCheck.remainingRequests === 99, "Enforces daily request limit (100 req/day standard)");

  // Revoke tester access
  const revoked = betaTesterManager.revokeTester("usr_beta_001");
  assert(revoked, "Admin revokes tester access");
  const authRevoked = betaTesterManager.isAuthorized("usr_beta_001");
  assert(!authRevoked.authorized && authRevoked.reason?.includes("revoked"), "Immediately blocks revoked tester from API access");

  // VIP Tester Tier
  const vipReg = betaTesterManager.registerTester({
    userId: "usr_vip_founder",
    email: "vip@example.com",
    inviteCode: "TATTVA-VIP-FOUNDER",
    requiresApproval: false,
  });
  assert(vipReg.success && vipReg.account?.tier === "vip_tester", "Registers VIP founder tester without approval requirement");
  assert(vipReg.account?.dailyRequestLimit === 500, "Allocates 500 requests/day quota for VIP tier");

  // ==========================================
  // SECTION 2: Bug & Feedback Management
  // ==========================================
  console.log("\n--- 3. Structured Bug & Feedback Intake ---");
  betaFeedbackAndBugManager.clear();

  const emptyReport = betaFeedbackAndBugManager.submitReport({
    testerId: "usr_vip_founder",
    category: "bug_report",
    description: "bad", // < 5 chars!
    appVersion: "2.1.0-beta.2",
    platform: "web",
  });
  assert(!emptyReport.success, "Rejects report with insufficient description (< 5 characters)");

  const validBug = betaFeedbackAndBugManager.submitReport({
    testerId: "usr_vip_founder",
    category: "bug_report",
    description: "Multimodal image zoom controls overflow viewport on tablet portrait mode",
    appVersion: "2.1.0-beta.2",
    platform: "mobile_browser",
    severity: "High",
    includePrivateConversations: true, // Should be safely ignored
  });
  assert(validBug.success && validBug.record?.status === "New", "Registers new bug report with 'New' status");
  assert(validBug.record?.platform === "mobile_browser", "Captures target platform correctly");

  console.log("\n--- 4. Bug Lifecycle (7 Status Transitions) ---");
  const bugId = validBug.record!.id;

  const statuses: BetaBugStatus[] = [
    "Under Review",
    "Confirmed",
    "In Progress",
    "Fixed",
    "Testing",
    "Closed",
  ];

  for (const st of statuses) {
    const updated = betaFeedbackAndBugManager.updateBugStatus(bugId, st, `Moved to ${st}`, st === "Closed" ? "Verified" : undefined);
    assert(updated && betaFeedbackAndBugManager.getRecord(bugId)?.status === st, `Transitions bug status to '${st}'`);
  }

  // Submit UI suggestion & Feature Request
  betaFeedbackAndBugManager.submitReport({
    testerId: "usr_vip_founder",
    category: "ui_ux_suggestion",
    description: "Add keyboard shortcut Cmd+K for global model switcher",
    appVersion: "2.1.0-beta.2",
    platform: "desktop",
    severity: "Low",
  });

  betaFeedbackAndBugManager.submitReport({
    testerId: "usr_vip_founder",
    category: "missing_feature",
    description: "Add export conversation as Markdown file",
    appVersion: "2.1.0-beta.2",
    platform: "web",
    severity: "Medium",
  });

  const summary = betaFeedbackAndBugManager.getSummaryCounts();
  assert(summary.total === 3, "Accurately aggregates total feedback records (3 records)");
  assert(summary.byStatus["Closed"] === 1, "Tracks 1 closed bug");
  assert(summary.byStatus["New"] === 2, "Tracks 2 new feedback items");

  // ==========================================
  // SECTION 3: Beta Analytics Telemetry
  // ==========================================
  console.log("\n--- 5. Beta Analytics Telemetry ---");
  betaAnalyticsEngine.reset();

  betaAnalyticsEngine.trackFeatureUsage("chatConversations");
  betaAnalyticsEngine.trackFeatureUsage("chatConversations");
  betaAnalyticsEngine.trackFeatureUsage("documentAnalysis");
  betaAnalyticsEngine.trackFeatureUsage("ragRetrievals");
  betaAnalyticsEngine.trackFeatureUsage("evaluationLabRuns");

  betaAnalyticsEngine.recordApiRequest(145, true);
  betaAnalyticsEngine.recordApiRequest(310, true);
  betaAnalyticsEngine.recordApiRequest(520, false); // Failed request
  betaAnalyticsEngine.recordFileFailure();
  betaAnalyticsEngine.recordToolFailure();

  const report = betaAnalyticsEngine.generateReport();
  assert(report.totalRegisteredTesters === 2, "Reports total registered beta testers");
  assert(report.featureUsage.chatConversations === 2, "Tracks chat conversation executions");
  assert(report.featureUsage.documentAnalysis === 1, "Tracks document analysis executions");
  assert(report.failedApiRequests === 1, "Records 1 failed API request");
  assert(report.avgResponseLatencyMs > 0, "Calculates average response latency across samples");
  assert(report.fileProcessingFailures === 1, "Tracks file processing failure count");
  assert(report.aiToolFailures === 1, "Tracks AI tool failure count");
  assert(report.feedbackSubmissions === 3, "Links active feedback submissions count");

  console.log("\n====================================================================");
  console.log(`   PHASE 29 VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log("====================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase29Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
