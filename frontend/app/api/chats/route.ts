import { NextResponse } from "next/server";
import { verifyUserSession, checkRateLimit } from "../../lib/security";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

function getVaultDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", ".tattva_secure_vault", "cloud_chats");
  }
  return path.join(process.cwd(), ".tattva_secure_vault", "cloud_chats");
}

function ensureVaultDir() {
  const dir = getVaultDir();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // If process.cwd failed, try /tmp fallback
    try {
      const tmpDir = path.join("/tmp", ".tattva_secure_vault", "cloud_chats");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {}
  }
}

function getChatFilePath(userKey: string): string {
  ensureVaultDir();
  const safeId = Buffer.from(userKey.toLowerCase().trim()).toString("hex");
  const primary = path.join(getVaultDir(), `chats_${safeId}.json`);
  if (fs.existsSync(primary)) return primary;
  const tmpFallback = path.join("/tmp", ".tattva_secure_vault", "cloud_chats", `chats_${safeId}.json`);
  if (fs.existsSync(tmpFallback)) return tmpFallback;
  return primary;
}

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
    const filePath = getChatFilePath(userIdentifier);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ sessions: [] });
    }

    const data = fs.readFileSync(filePath, "utf-8");
    let sessions = JSON.parse(data);

    if (!Array.isArray(sessions)) {
      return NextResponse.json({ sessions: [] });
    }

    // 1. Export Conversation Feature
    if (exportId) {
      const targetSession = sessions.find((s: any) => s.id === exportId);
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
      sessions = sessions.filter((s: any) => {
        const titleMatch = s.title?.toLowerCase().includes(searchQuery);
        const messageMatch = Array.isArray(s.messages) && s.messages.some((m: any) => (m.content || "").toLowerCase().includes(searchQuery));
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
    const filePath = getChatFilePath(userIdentifier);

    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(body.sessions, null, 2), "utf-8");
    } catch {
      try {
        const tmpFallback = path.join("/tmp", ".tattva_secure_vault", "cloud_chats", path.basename(filePath));
        fs.mkdirSync(path.dirname(tmpFallback), { recursive: true });
        fs.writeFileSync(tmpFallback, JSON.stringify(body.sessions, null, 2), "utf-8");
      } catch {}
    }

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
    const filePath = getChatFilePath(userIdentifier);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: true, message: "No sessions to delete" });
    }

    if (sessionId) {
      // Delete single session
      const data = fs.readFileSync(filePath, "utf-8");
      const sessions = JSON.parse(data);
      const filtered = Array.isArray(sessions) ? sessions.filter((s: any) => s.id !== sessionId) : [];
      fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), "utf-8");
      return NextResponse.json({ success: true, remaining: filtered.length });
    } else {
      // Clear all sessions
      fs.unlinkSync(filePath);
      return NextResponse.json({ success: true, message: "All cloud chat sessions deleted" });
    }
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
    const filePath = getChatFilePath(userIdentifier);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const data = fs.readFileSync(filePath, "utf-8");
    const sessions = JSON.parse(data);
    if (!Array.isArray(sessions)) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const targetIndex = sessions.findIndex((s: any) => s.id === body.sessionId);
    if (targetIndex === -1) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    // Apply safe updates: title (rename), pinned (boolean), tags
    if (typeof body.title === "string" && body.title.trim()) {
      sessions[targetIndex].title = body.title.trim().slice(0, 100);
    }
    if (typeof body.pinned === "boolean") {
      sessions[targetIndex].pinned = body.pinned;
    }
    if (Array.isArray(body.tags)) {
      sessions[targetIndex].tags = body.tags.slice(0, 10);
    }

    sessions[targetIndex].updatedAt = Date.now();

    fs.writeFileSync(filePath, JSON.stringify(sessions, null, 2), "utf-8");

    return NextResponse.json({ success: true, session: sessions[targetIndex] });
  } catch (error: unknown) {
    console.error("PATCH /api/chats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update chat" },
      { status: 500 }
    );
  }
}
