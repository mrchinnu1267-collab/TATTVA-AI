/**
 * TATTVA AI - Advanced Web Research API Route Handler
 * POST /api/research -> Conducts deep multi-source research, fact extraction, and citation generation
 * GET  /api/research?query=... -> Quick query lookup with authoritative citations
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../lib/security";
import { conductAuthoritativeResearch } from "../../lib/research-engine";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const body = await request.json().catch(() => ({}));

    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) {
      return NextResponse.json({ error: "Missing required parameter: query" }, { status: 400 });
    }

    const maxSources = typeof body.maxSources === "number" ? Math.min(Math.max(body.maxSources, 1), 8) : 4;
    const crawlTimeoutMs = typeof body.timeoutMs === "number" ? Math.min(body.timeoutMs, 15000) : 7000;
    const deepRead = body.deepRead !== false;

    const dossier = await conductAuthoritativeResearch(query, {
      maxSources,
      crawlTimeoutMs,
      deepRead,
    });

    return NextResponse.json({
      success: true,
      data: dossier,
      user: {
        id: session.userId,
        email: session.email,
      },
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
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() || "";

    if (!query) {
      return NextResponse.json({ error: "Missing required query parameter" }, { status: 400 });
    }

    const maxSources = parseInt(searchParams.get("maxSources") || "3", 10);
    const dossier = await conductAuthoritativeResearch(query, {
      maxSources: Math.min(Math.max(maxSources, 1), 6),
      crawlTimeoutMs: 6000,
    });

    return NextResponse.json({
      success: true,
      data: dossier,
      userId: session.userId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
