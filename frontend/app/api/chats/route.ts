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

function getChatFilePath(userEmail: string): string {
  ensureVaultDir();
  const safeEmail = Buffer.from(userEmail.toLowerCase().trim()).toString("hex");
  const primary = path.join(getVaultDir(), `chats_${safeEmail}.json`);
  if (fs.existsSync(primary)) return primary;
  const tmpFallback = path.join("/tmp", ".tattva_secure_vault", "cloud_chats", `chats_${safeEmail}.json`);
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

    const { searchParams } = new URL(request.url);
    const email = session.authenticated && session.email ? session.email : searchParams.get("email") || "guest_user";

    const filePath = getChatFilePath(email);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ sessions: [] });
    }

    const data = fs.readFileSync(filePath, "utf-8");
    const sessions = JSON.parse(data);

    return NextResponse.json({ sessions });
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

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.sessions)) {
      return NextResponse.json({ error: "Sessions array is required." }, { status: 400 });
    }

    const email = session.authenticated && session.email ? session.email : body.email || "guest_user";
    const filePath = getChatFilePath(email);

    try {
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
