import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getSupabase } from "@/app/lib/image-engine/services/storage.service";
import { verifyUserSession } from "@/app/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_VAULT_DIR = path.resolve(process.cwd(), ".tattva_vault", "images");

/**
 * GET: Serves authorized images from either Supabase Storage ('tattva-images')
 * or the private local workspace vault fallback.
 * Strictly prevents path traversal attacks.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifyUserSession(req);
    const { searchParams } = new URL(req.url);

    const pathParam = searchParams.get("path");
    const fileId = searchParams.get("fileId");
    const requestedUserId = searchParams.get("userId") || session.userId || "anonymous";

    // -------------------------------------------------------------------------
    // Scenario 1: Serve from Supabase Cloud Storage
    // -------------------------------------------------------------------------
    if (pathParam) {
      const cleanPath = path.normalize(pathParam).replace(/^(\.\.(\/|\\|$))+/, "");
      
      // Enforce workspace/user boundary if not anonymous
      const pathParts = cleanPath.split(/[/\\]/);
      const objectOwnerId = pathParts[0];

      if (
        session.authenticated &&
        objectOwnerId !== "anonymous" &&
        objectOwnerId !== session.userId &&
        session.role !== "admin"
      ) {
        return NextResponse.json({ error: "Unauthorized image access." }, { status: 403 });
      }

      const supabase = getSupabase();
      if (supabase) {
        const { data: blob, error } = await supabase.storage.from("tattva-images").download(cleanPath);
        if (!error && blob) {
          const buffer = Buffer.from(await blob.arrayBuffer());
          const ext = path.extname(cleanPath).toLowerCase();
          const contentType =
            ext === ".jpg" || ext === ".jpeg"
              ? "image/jpeg"
              : ext === ".webp"
              ? "image/webp"
              : "image/png";

          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "private, max-age=86400, stale-while-revalidate=3600",
              "Content-Length": buffer.length.toString(),
            },
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // Scenario 2: Serve from Local Workspace Vault Fallback
    // -------------------------------------------------------------------------
    if (fileId) {
      const safeUserId = requestedUserId.replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeFileId = fileId.replace(/[^a-zA-Z0-9_-]/g, "");

      const userDir = path.join(LOCAL_VAULT_DIR, safeUserId);
      if (!fs.existsSync(userDir)) {
        return NextResponse.json({ error: "Vault directory not found." }, { status: 404 });
      }

      // Check extensions: .png, .jpg, .webp
      const candidateFiles = fs
        .readdirSync(userDir)
        .filter((f) => f.startsWith(safeFileId));

      if (candidateFiles.length === 0) {
        return NextResponse.json({ error: "Image asset not found in vault." }, { status: 404 });
      }

      const targetFile = candidateFiles[0];
      const filePath = path.join(userDir, targetFile);

      // Verify resolved path stays strictly inside LOCAL_VAULT_DIR
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(path.resolve(LOCAL_VAULT_DIR))) {
        return NextResponse.json({ error: "Access denied." }, { status: 403 });
      }

      const buffer = fs.readFileSync(resolvedPath);
      const ext = path.extname(targetFile).toLowerCase();
      const contentType =
        ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
          ? "image/webp"
          : "image/png";

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=86400, stale-while-revalidate=3600",
          "Content-Length": buffer.length.toString(),
        },
      });
    }

    return NextResponse.json({ error: "Missing required path or fileId parameter." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to download image." }, { status: 500 });
  }
}
