/**
 * TATTVA AI - Sensitive Data & PII Masking API Route (Phase 44)
 * POST /api/governance/pii -> Scans and redacts credit cards, SSNs, API tokens, and secrets
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { PIIProtector } from "../../../lib/ai-governance";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { success: false, error: "Text string is required for PII scanning" },
        { status: 400 }
      );
    }

    const protector = PIIProtector.getInstance();
    const result = protector.sanitize(text);

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
