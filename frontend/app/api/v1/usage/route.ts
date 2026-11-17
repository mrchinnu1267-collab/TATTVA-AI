/**
 * TATTVA AI - Developer API v1: Usage and Quota Information Endpoint
 * GET /api/v1/usage
 */

import { NextResponse } from "next/server";
import { ApiKeyManager } from "../../../lib/ecosystem/api-key-manager";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const rawKey = authHeader.replace(/^Bearer\s+/i, "").trim();

    const auth = ApiKeyManager.authenticateApiKey(rawKey);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const key = auth.apiKey!;
    return NextResponse.json({
      success: true,
      keyId: key.id,
      name: key.name,
      prefix: key.keyPrefix,
      scopes: key.scopes,
      rateLimitPerMinute: key.rateLimitPerMinute,
      usage: {
        currentMonthRequests: key.currentMonthUsage,
        monthlyQuota: key.monthlyQuota,
        remainingRequests: Math.max(0, key.monthlyQuota - key.currentMonthUsage),
        percentageUsed: ((key.currentMonthUsage / key.monthlyQuota) * 100).toFixed(2) + "%",
      },
      lastUsedAt: key.lastUsedAt || null,
      createdAt: key.createdAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
