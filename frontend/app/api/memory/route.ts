import { NextResponse } from "next/server";
import {
  getUserMemories,
  saveMemory,
  updateMemory,
  deleteMemory,
  clearCategoryMemories,
  clearAllMemories,
  exportUserMemories,
  getUserPersonalizationSettings,
  updatePersonalizationSettings,
  retrieveRelevantMemories,
  extractAndStoreMemories,
  getUserFeedbackSummary,
} from "../../lib/memory-service";
import { MemoryCategory } from "../../lib/memory-types";
import { verifyUserSession, checkRateLimit, logSecurityEvent } from "../../lib/security";

export const runtime = "nodejs";

/**
 * Enforce Zero Trust User Scoping:
 * Binds strictly to cryptographically verified session email.
 * Never allows client-supplied input to override or spoof identity.
 */
function resolveAuthorizedEmail(session: { authenticated: boolean; email?: string }): string | null {
  if (session.authenticated && session.email && session.email.includes("@")) {
    return session.email.toLowerCase().trim();
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rateCheck = checkRateLimit(`mem_get_${session.userId}_${clientIp}`, 120, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many requests. Rate limit exceeded." }, { status: 429 });
    }

    // Zero Trust Check: Strictly require authenticated caller
    if (!session.authenticated) {
      logSecurityEvent("UNAUTHORIZED_DATA_ACCESS", {
        userId: session.userId,
        ip: clientIp,
        endpoint: "/api/memory [GET]",
        details: { reason: "Unauthenticated memory read attempt" },
      });
      return NextResponse.json(
        { error: "Authentication required: Cannot access private user memories without a verified session." },
        { status: 401 }
      );
    }

    const authorizedEmail = resolveAuthorizedEmail(session);
    if (!authorizedEmail) {
      return NextResponse.json(
        { error: "Valid email identity required to access memories." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const exportFormat = searchParams.get("export");
    const categoryFilter = searchParams.get("category");

    // Memory Export (GDPR / Data Portability)
    if (exportFormat === "json" || exportFormat === "markdown") {
      const exported = await exportUserMemories(authorizedEmail, exportFormat);
      if (exportFormat === "markdown") {
        return new NextResponse(exported, {
          status: 200,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="tattva-memory-${Date.now()}.md"`,
          },
        });
      }
      return new NextResponse(exported, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="tattva-memory-${Date.now()}.json"`,
        },
      });
    }

    // Semantic relevance retrieval
    if (query) {
      const relevant = await retrieveRelevantMemories(authorizedEmail, query, 5);
      return NextResponse.json({ relevantMemories: relevant });
    }

    const [allMemories, settings, feedbackSummary] = await Promise.all([
      getUserMemories(authorizedEmail),
      getUserPersonalizationSettings(authorizedEmail),
      getUserFeedbackSummary(authorizedEmail),
    ]);

    const memories = categoryFilter
      ? allMemories.filter((m) => m.category === categoryFilter)
      : allMemories;

    const categoriesCount: Record<string, number> = {};
    for (const m of allMemories) {
      categoriesCount[m.category] = (categoriesCount[m.category] || 0) + 1;
    }

    return NextResponse.json({
      memories,
      settings,
      feedbackSummary,
      categoriesCount,
      totalCount: allMemories.length,
    });
  } catch (error) {
    console.error("GET /api/memory error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch memory data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rateCheck = checkRateLimit(`mem_post_${session.userId}_${clientIp}`, 60, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many requests. Rate limit exceeded." }, { status: 429 });
    }

    if (!session.authenticated) {
      logSecurityEvent("UNAUTHORIZED_DATA_ACCESS", {
        userId: session.userId,
        ip: clientIp,
        endpoint: "/api/memory [POST]",
        details: { reason: "Unauthenticated memory write attempt" },
      });
      return NextResponse.json(
        { error: "Authentication required: Cannot store memories without a verified session." },
        { status: 401 }
      );
    }

    const authorizedEmail = resolveAuthorizedEmail(session);
    if (!authorizedEmail) {
      return NextResponse.json(
        { error: "Valid email identity required to store memories." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Identity verification: reject if request body attempts to write to another user
    if (body.userEmail && body.userEmail.toLowerCase().trim() !== authorizedEmail) {
      return NextResponse.json(
        { error: "Access denied. Cannot write to another user's cognitive memory." },
        { status: 403 }
      );
    }

    const { action } = body;

    if (action === "update_settings") {
      const updated = await updatePersonalizationSettings(authorizedEmail, body.settings || {});
      return NextResponse.json({ success: true, settings: updated });
    }

    if (action === "extract_memories") {
      const extracted = await extractAndStoreMemories(authorizedEmail, body.userMessage || "", body.workspaceId);
      return NextResponse.json({ success: true, extracted });
    }

    // Default action: add manual memory
    const { content, category, importance, expiresAt, workspaceId } = body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Memory content is required" }, { status: 400 });
    }

    const memory = await saveMemory(
      authorizedEmail,
      content,
      category || "preference",
      importance || 7,
      "explicit",
      workspaceId,
      true,
      1.0,
      typeof expiresAt === "number" ? expiresAt : undefined
    );

    return NextResponse.json({ success: true, memory });
  } catch (error) {
    console.error("POST /api/memory error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save memory" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await verifyUserSession(request);
    if (!session.authenticated) {
      return NextResponse.json(
        { error: "Authentication required to update memories." },
        { status: 401 }
      );
    }

    const authorizedEmail = resolveAuthorizedEmail(session);
    if (!authorizedEmail) {
      return NextResponse.json(
        { error: "Valid email identity required to update memories." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json({ error: "Memory ID is required" }, { status: 400 });
    }

    const { id, updates } = body;
    const updated = await updateMemory(authorizedEmail, id, updates || {});
    if (!updated) {
      return NextResponse.json({ error: "Memory not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({ success: true, memory: updated });
  } catch (error) {
    console.error("PUT /api/memory error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update memory" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await verifyUserSession(request);
    if (!session.authenticated) {
      return NextResponse.json(
        { error: "Authentication required to delete memories." },
        { status: 401 }
      );
    }

    const authorizedEmail = resolveAuthorizedEmail(session);
    if (!authorizedEmail) {
      return NextResponse.json(
        { error: "Valid email identity required to delete memories." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const clearAll = searchParams.get("all") === "true";
    const category = searchParams.get("category") as MemoryCategory | null;

    if (clearAll) {
      await clearAllMemories(authorizedEmail);
      return NextResponse.json({ success: true, cleared: true });
    }

    if (category) {
      await clearCategoryMemories(authorizedEmail, category);
      return NextResponse.json({ success: true, clearedCategory: category });
    }

    if (!id) {
      return NextResponse.json({ error: "Memory ID or ?all=true or ?category=<cat> is required" }, { status: 400 });
    }

    await deleteMemory(authorizedEmail, id);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("DELETE /api/memory error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete memory" },
      { status: 500 }
    );
  }
}
