import { NextResponse } from "next/server";
import { verifyUserSession } from "../../lib/security";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

const LOCAL_VAULT_DIR = path.resolve(process.cwd(), ".tattva-vault");

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function ensureLocalUserDir(userId: string): string {
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dir = path.join(LOCAL_VAULT_DIR, "workspace_data", safeId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const userId = session.userId || "guest_workspace";
    const { searchParams } = new URL(request.url);
    const app = searchParams.get("app");
    const search = searchParams.get("q")?.toLowerCase();

    const supabase = getSupabase();
    if (supabase && session.authenticated) {
      let query = supabase
        .from("workspace_items")
        .select("*")
        .eq("user_id", session.userId)
        .order("updated_at", { ascending: false });

      if (app) query = query.eq("app", app);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        let results = data;
        if (search) {
          results = results.filter(
            (item: any) =>
              item.name.toLowerCase().includes(search) ||
              item.description?.toLowerCase().includes(search)
          );
        }
        return NextResponse.json({ success: true, items: results });
      }
    }

    // Fallback to local vault
    const userDir = ensureLocalUserDir(userId);
    const dbFile = path.join(userDir, "items.json");
    let items: any[] = [];
    if (fs.existsSync(dbFile)) {
      try {
        items = JSON.parse(fs.readFileSync(dbFile, "utf-8"));
      } catch {
        items = [];
      }
    }

    if (app) {
      items = items.filter((i) => i.app === app);
    }
    if (search) {
      items = items.filter(
        (i) =>
          i.name?.toLowerCase().includes(search) ||
          i.description?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    console.error("[Workspace API] GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const userId = session.userId || "guest_workspace";
    const body = await request.json();
    const { action, item, id } = body;

    const userDir = ensureLocalUserDir(userId);
    const dbFile = path.join(userDir, "items.json");
    let items: any[] = [];
    if (fs.existsSync(dbFile)) {
      try {
        items = JSON.parse(fs.readFileSync(dbFile, "utf-8"));
      } catch {
        items = [];
      }
    }

    if (action === "save") {
      if (!item || !item.name || !item.app) {
        return NextResponse.json({ error: "Invalid item payload" }, { status: 400 });
      }

      const existingIndex = items.findIndex((i) => i.id === item.id);
      if (existingIndex >= 0) {
        items[existingIndex] = { ...items[existingIndex], ...item, updatedAt: new Date().toISOString() };
      } else {
        items.unshift({ ...item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }

      fs.writeFileSync(dbFile, JSON.stringify(items, null, 2), "utf-8");

      // Sync with Supabase if online
      const supabase = getSupabase();
      if (supabase && session.authenticated) {
        supabase
          .from("workspace_items")
          .upsert({
            id: item.id,
            user_id: session.userId,
            app: item.app,
            name: item.name,
            description: item.description,
            format: item.format || "json",
            content: item.content,
            size_bytes: item.sizeBytes || 0,
            is_starred: Boolean(item.isStarred),
            is_pinned: Boolean(item.isPinned),
            is_trashed: Boolean(item.isTrashed),
            tags: item.tags || [],
            updated_at: new Date().toISOString(),
          })
          .then(
            () => {},
            (e: any) => console.warn("[Workspace API] Remote upsert deferred:", e)
          );
      }

      return NextResponse.json({ success: true, item });
    } else if (action === "delete") {
      items = items.filter((i) => i.id !== id);
      fs.writeFileSync(dbFile, JSON.stringify(items, null, 2), "utf-8");

      const supabase = getSupabase();
      if (supabase && session.authenticated) {
        supabase.from("workspace_items").delete().eq("id", id).eq("user_id", session.userId).then(() => {});
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("[Workspace API] POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to process request" }, { status: 500 });
  }
}
