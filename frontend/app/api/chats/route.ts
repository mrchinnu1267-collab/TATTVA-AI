import { NextResponse } from "next/server";
import { verifyUserSession, checkRateLimit } from "../../lib/security";
import { durableChatStore, ChatSessionRecord } from "../../lib/chats/durable-chat-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rateCheck = checkRateLimit(`chats_get_${session.userId}_${clientIp}`, 120, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
    }

    // Zero-Trust Authentication Requirement: Reject unauthenticated sessions
    if (!session.authenticated || (!session.email && !session.userId)) {
      return NextResponse.json(
        { error: "Authentication required to access cloud chat sessions." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedEmail = searchParams.get("email")?.toLowerCase().trim();
    const searchQuery = searchParams.get("search")?.toLowerCase().trim();
    const exportId = searchParams.get("export");
    const exportFormat = searchParams.get("format") || "markdown";

    // Prevent cross-tenant impersonation: requested email must match authenticated session email
    if (requestedEmail && session.email && requestedEmail !== session.email.toLowerCase().trim()) {
      return NextResponse.json(
        { error: "Forbidden: You cannot access chat sessions belonging to another user." },
        { status: 403 }
      );
    }

    const userIdentifier = (session.email || session.userId).toLowerCase().trim();
    let sessions: ChatSessionRecord[] = await durableChatStore.loadUserSessions(userIdentifier);

    // 1. Export Conversation Feature
    if (exportId) {
      const targetSession = sessions.find((s) => s.id === exportId);
      if (!targetSession) {
        return NextResponse.json({ error: "Session not found." }, { status: 404 });
      }

      if (exportFormat === "json") {
        return new NextResponse(JSON.stringify(targetSession, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="${encodeURIComponent(targetSession.title || "conversation")}.json"`,
          },
        });
      }

      // Markdown Export Format
      const mdLines: string[] = [
        `# ${targetSession.title || "TATTVA AI Conversation"}`,
        `*Exported on ${new Date().toISOString()} | Session ID: ${targetSession.id}*`,
        "",
        "---",
        "",
      ];

      for (const m of targetSession.messages || []) {
        const sender = m.role === "user" ? "**User**" : "**TATTVA AI**";
        mdLines.push(`### ${sender}:`);
        mdLines.push(m.content || "");
        mdLines.push("");
      }

      return new NextResponse(mdLines.join("\n"), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(targetSession.title || "conversation")}.md"`,
        },
      });
    }

    // 2. Server-side Conversation Search
    if (searchQuery) {
      sessions = sessions.filter((s) => {
        const titleMatch = s.title?.toLowerCase().includes(searchQuery);
        const messageMatch = Array.isArray(s.messages) && s.messages.some((m) => (m.content || "").toLowerCase().includes(searchQuery));
        return titleMatch || messageMatch;
      });
    }

    return NextResponse.json({ sessions, count: sessions.length });
  } catch (error: unknown) {
    console.error("GET /api/chats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load chats" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rateCheck = checkRateLimit(`chats_post_${session.userId}_${clientIp}`, 60, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
    }

    // Zero-Trust Authentication Requirement: Reject unauthenticated sessions
    if (!session.authenticated || (!session.email && !session.userId)) {
      return NextResponse.json(
        { error: "Authentication required to sync cloud chat sessions." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.sessions)) {
      return NextResponse.json({ error: "Sessions array is required." }, { status: 400 });
    }

    // Prevent cross-tenant overwrite: client cannot supply a different user's email
    if (body.email && typeof body.email === "string" && session.email && body.email.toLowerCase().trim() !== session.email.toLowerCase().trim()) {
      return NextResponse.json(
        { error: "Forbidden: You cannot overwrite chat sessions belonging to another user." },
        { status: 403 }
      );
    }

    const userIdentifier = (session.email || session.userId).toLowerCase().trim();
    await durableChatStore.saveUserSessions(userIdentifier, body.sessions);

    return NextResponse.json({ success: true, count: body.sessions.length });
  } catch (error: unknown) {
    console.error("POST /api/chats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync chats" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rateCheck = checkRateLimit(`chats_del_${session.userId}_${clientIp}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
    }

    if (!session.authenticated || (!session.email && !session.userId)) {
      return NextResponse.json(
        { error: "Authentication required to delete cloud chat sessions." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const userIdentifier = (session.email || session.userId).toLowerCase().trim();

    const result = await durableChatStore.deleteUserSessions(userIdentifier, sessionId || undefined);

    return NextResponse.json({
      success: true,
      ...(sessionId ? { remaining: result.remainingCount } : { message: "All cloud chat sessions deleted" })
    });
  } catch (error: unknown) {
    console.error("DELETE /api/chats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete chats" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rateCheck = checkRateLimit(`chats_patch_${session.userId}_${clientIp}`, 60, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
    }

    if (!session.authenticated || (!session.email && !session.userId)) {
      return NextResponse.json(
        { error: "Authentication required to update cloud chat sessions." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    const userIdentifier = (session.email || session.userId).toLowerCase().trim();
    const updated = await durableChatStore.patchSession(userIdentifier, body.sessionId, {
      title: body.title,
      pinned: body.pinned,
      tags: body.tags
    });

    if (!updated) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, session: updated });
  } catch (error: unknown) {
    console.error("PATCH /api/chats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update chat" },
      { status: 500 }
    );
  }
}
