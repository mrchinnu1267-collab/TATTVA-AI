/**
 * TATTVA AI - Backup & Recovery Verification API Route
 * GET /api/evolution/backups -> Returns latest verified backup report and history
 * POST /api/evolution/backups -> Triggers automated restoration simulation check
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { backupRecoveryVerifier } from "../../../lib/platform-evolution";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await verifyUserSession(request);
    const latest = backupRecoveryVerifier.getLatestVerification();
    const history = backupRecoveryVerifier.getHistory();

    return NextResponse.json({
      success: true,
      data: {
        latest,
        history,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await verifyUserSession(request);
    const report = backupRecoveryVerifier.verifyBackupIntegrity();

    return NextResponse.json({ success: true, data: report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
