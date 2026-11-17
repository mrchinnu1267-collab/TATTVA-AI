/**
 * TATTVA AI - Developer API Keys Management Route
 * POST /api/developer/keys -> Generate scoped API key
 * GET  /api/developer/keys -> List user's keys
 * DELETE /api/developer/keys -> Revoke key
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { ApiKeyManager } from "../../../lib/ecosystem/api-key-manager";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const name = typeof body.name === "string" ? body.name.trim() : "Default API Key";
    const scopes = Array.isArray(body.scopes) ? body.scopes : ["chat:write", "research:read", "documents:write", "tasks:write"];
    const rateLimit = typeof body.rateLimitPerMinute === "number" ? body.rateLimitPerMinute : 60;
    const monthlyQuota = typeof body.monthlyQuota === "number" ? body.monthlyQuota : 10000;
    const workspaceId = body.workspaceId || "default";

    const { apiKey, rawSecret } = ApiKeyManager.generateApiKey(
      session.userId,
      workspaceId,
      name,
      scopes,
      rateLimit,
      monthlyQuota
    );

    return NextResponse.json({
      success: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        rateLimitPerMinute: apiKey.rateLimitPerMinute,
        monthlyQuota: apiKey.monthlyQuota,
        createdAt: apiKey.createdAt,
      },
      secret: rawSecret, // Only returned once upon creation
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const keys = ApiKeyManager.listUserKeys(session.userId);

    return NextResponse.json({
      success: true,
      total: keys.length,
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        scopes: k.scopes,
        rateLimitPerMinute: k.rateLimitPerMinute,
        monthlyQuota: k.monthlyQuota,
        currentMonthUsage: k.currentMonthUsage,
        status: k.status,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt || null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("keyId");

    if (!keyId) {
      return NextResponse.json({ error: "Missing required parameter: keyId" }, { status: 400 });
    }

    const success = ApiKeyManager.revokeApiKey(session.userId, keyId);
    return NextResponse.json({ success, keyId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
