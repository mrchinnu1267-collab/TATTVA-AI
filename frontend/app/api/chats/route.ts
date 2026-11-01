import { NextResponse } from "next/server";
import { verifyUserSession, checkRateLimit } from "../../lib/security";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const VAULT_DIR = path.join(process.cwd(), ".tattva_secure_vault", "cloud_chats");

function ensureVaultDir() {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
  }
}

function getChatFilePath(userEmail: string): string {
  ensureVaultDir();
  const safeEmail = Buffer.from(userEmail.toLowerCase().trim()).toString("hex");
  return path.join(VAULT_DIR, `chats_${safeEmail}.json`);
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

    fs.writeFileSync(filePath, JSON.stringify(body.sessions, null, 2), "utf-8");

    return NextResponse.json({ success: true, count: body.sessions.length });
  } catch (error: unknown) {
    console.error("POST /api/chats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync chats" },
      { status: 500 }
    );
  }
}
