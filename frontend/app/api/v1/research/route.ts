/**
 * TATTVA AI - Developer API v1: Authoritative Research Endpoint
 * POST /api/v1/research
 * Scope: research:read
 */

import { NextResponse } from "next/server";
import { ApiKeyManager } from "../../../lib/ecosystem/api-key-manager";
import { conductAuthoritativeResearch } from "../../../lib/research-engine";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const rawKey = authHeader.replace(/^Bearer\s+/i, "").trim();

    const auth = ApiKeyManager.authenticateApiKey(rawKey, "research:read");
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) {
      return NextResponse.json({ error: "Missing required parameter: query" }, { status: 400 });
    }

    const maxSources = typeof body.maxSources === "number" ? Math.min(Math.max(body.maxSources, 1), 6) : 3;
    const dossier = await conductAuthoritativeResearch(query, { maxSources });

    return NextResponse.json({
      success: true,
      data: dossier,
      usage: {
        currentMonthUsage: auth.apiKey!.currentMonthUsage,
        monthlyQuota: auth.apiKey!.monthlyQuota,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
