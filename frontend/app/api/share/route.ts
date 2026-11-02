import { NextResponse } from "next/server";
import { checkRateLimit } from "../../lib/security";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

function getShareVaultDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", ".tattva_secure_vault", "shared_chats");
  }
  return path.join(process.cwd(), ".tattva_secure_vault", "shared_chats");
}

function ensureShareDir() {
  const dir = getShareVaultDir();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    try {
      const tmpDir = path.join("/tmp", ".tattva_secure_vault", "shared_chats");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {}
  }
}

function getShareFilePath(shareId: string): string {
  ensureShareDir();
  const primary = path.join(getShareVaultDir(), `${shareId}.json`);
  if (fs.existsSync(primary)) return primary;
  const tmpFallback = path.join("/tmp", ".tattva_secure_vault", "shared_chats", `${shareId}.json`);
  if (fs.existsSync(tmpFallback)) return tmpFallback;
  return primary;
}

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const rateCheck = checkRateLimit(`share_post_${clientIp}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.session || !Array.isArray(body.session.messages)) {
      return NextResponse.json({ error: "Valid chat session is required." }, { status: 400 });
    }

    ensureShareDir();

    // Create a safe unique share ID
    const shareId = crypto.randomBytes(8).toString("hex");
    const filePath = getShareFilePath(shareId);

    // Clean session to remove private user data before sharing
    const cleanSession = {
      id: shareId,
      originalId: body.session.id,
      title: body.session.title || "Shared Conversation",
      createdAt: Date.now(),
      messages: body.session.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        image: m.image,
        kind: m.kind,
        imageMetadata: m.imageMetadata,
        attachments: m.attachments?.map((a: any) => ({
          name: a.name,
          type: a.type,
          size: a.size,
          preview: a.preview,
        })),
        timestamp: m.timestamp,
      })),
    };

    try {
      fs.writeFileSync(filePath, JSON.stringify(cleanSession, null, 2), "utf-8");
    } catch {
      try {
        const tmpFallback = path.join("/tmp", ".tattva_secure_vault", "shared_chats", `${shareId}.json`);
        fs.mkdirSync(path.dirname(tmpFallback), { recursive: true });
        fs.writeFileSync(tmpFallback, JSON.stringify(cleanSession, null, 2), "utf-8");
      } catch {}
    }

    return NextResponse.json({
      success: true,
      shareId,
      url: `/share/${shareId}`,
    });
  } catch (error: unknown) {
    console.error("POST /api/share error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create share link" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: "Invalid share ID." }, { status: 400 });
    }

    const filePath = getShareFilePath(id);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Shared conversation not found or expired." }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return NextResponse.json({ session: data });
  } catch (error: unknown) {
    console.error("GET /api/share error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load shared conversation" },
      { status: 500 }
    );
  }
}

