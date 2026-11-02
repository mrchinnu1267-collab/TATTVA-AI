import { NextResponse } from "next/server";
import { checkRateLimit } from "../../lib/security";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

const SHARE_VAULT_DIR = path.join(process.cwd(), ".tattva_secure_vault", "shared_chats");

function ensureShareDir() {
  if (!fs.existsSync(SHARE_VAULT_DIR)) {
    fs.mkdirSync(SHARE_VAULT_DIR, { recursive: true });
  }
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
    const filePath = path.join(SHARE_VAULT_DIR, `${shareId}.json`);

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

    fs.writeFileSync(filePath, JSON.stringify(cleanSession, null, 2), "utf-8");

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

    ensureShareDir();
    const filePath = path.join(SHARE_VAULT_DIR, `${id}.json`);

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

