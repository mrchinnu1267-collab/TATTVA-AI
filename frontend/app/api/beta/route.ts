import { NextResponse } from "next/server";
import { betaTesterManager } from "../../lib/beta-program/tester-manager";
import { betaFeedbackAndBugManager } from "../../lib/beta-program/feedback-and-bugs";
import { betaAnalyticsEngine } from "../../lib/beta-program/beta-analytics";
import { verifyUserSession } from "../../lib/security";

/**
 * GET /api/beta
 * Query parameters:
 * - action=status: get tester status and quota
 * - action=analytics: get privacy-preserving beta analytics
 * - action=bugs: list reported bugs (admin or authorized tester)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "status";
    const session = await verifyUserSession(request);

    if (action === "analytics") {
      const report = betaAnalyticsEngine.generateReport();
      return NextResponse.json(report);
    }

    if (action === "bugs") {
      const status = searchParams.get("status") as any;
      const severity = searchParams.get("severity") as any;
      const records = betaFeedbackAndBugManager.listRecords({ status, severity });
      return NextResponse.json({ records, summary: betaFeedbackAndBugManager.getSummaryCounts() });
    }

    // Default: check user beta status
    const userId = session.userId || searchParams.get("userId") || "guest";
    const auth = betaTesterManager.isAuthorized(userId);
    const tester = betaTesterManager.getTester(userId);

    return NextResponse.json({
      authorized: auth.authorized,
      reason: auth.reason,
      tester,
      appVersion: "2.1.0-beta.2",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process beta query" }, { status: 500 });
  }
}

/**
 * POST /api/beta
 * Payload actions:
 * - action="register_tester": register with invite code
 * - action="report_bug" or "submit_feedback": submit bug report or UX suggestion
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const session = await verifyUserSession(request);
    const userId = session.userId || body.userId || `usr_${Date.now()}`;

    // 1. Tester Registration
    if (body.action === "register_tester") {
      if (!body.inviteCode || !body.email) {
        return NextResponse.json({ error: "Invitation code and email are required" }, { status: 400 });
      }

      const regResult = betaTesterManager.registerTester({
        userId,
        email: body.email,
        inviteCode: body.inviteCode,
        requiresApproval: body.requiresApproval,
      });

      if (!regResult.success) {
        return NextResponse.json({ error: regResult.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, account: regResult.account });
    }

    // 2. Feedback or Bug Report Submission
    if (body.action === "report_bug" || body.action === "submit_feedback") {
      const result = betaFeedbackAndBugManager.submitReport({
        testerId: userId,
        category: body.category || "bug_report",
        description: body.description,
        appVersion: body.appVersion || "2.1.0-beta.2",
        platform: body.platform || "web",
        severity: body.severity,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Track metric
      betaAnalyticsEngine.trackFeatureUsage("chatConversations");

      return NextResponse.json({ success: true, report: result.record });
    }

    return NextResponse.json({ error: "Unsupported beta action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to handle beta action" }, { status: 500 });
  }
}

/**
 * PATCH /api/beta
 * Admin triage: update bug status, approve tester, or revoke access
 */
export async function PATCH(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Update Bug Status
    if (body.action === "update_bug") {
      if (!body.id || !body.status) {
        return NextResponse.json({ error: "Bug ID and status are required" }, { status: 400 });
      }

      const updated = betaFeedbackAndBugManager.updateBugStatus(
        body.id,
        body.status,
        body.adminNotes,
        body.resolution
      );

      if (!updated) {
        return NextResponse.json({ error: "Bug record not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: `Bug ${body.id} updated to ${body.status}` });
    }

    // Tester Management (Approval / Revocation)
    if (body.action === "approve_tester") {
      const approved = betaTesterManager.approveTester(body.userId, session.userId || "admin");
      return NextResponse.json({ success: approved });
    }

    if (body.action === "revoke_tester") {
      const revoked = betaTesterManager.revokeTester(body.userId);
      return NextResponse.json({ success: revoked });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update beta resource" }, { status: 500 });
  }
}
