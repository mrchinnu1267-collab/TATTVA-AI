import { NextResponse } from "next/server";
import path from "path";
import os from "os";
import { verifyUserSession } from "../../lib/security";

export const runtime = "nodejs";

// Use runtime accessor to prevent static NFT AST from recursively analyzing the whole project workspace
function getFs() {
  return require("fs");
}

function findUserVaultFile(safeUserId: string, fileId: string): { fullPath: string; matched: string } | null {
  const fsInstance = getFs();
  // Reject directory traversal, slashes, or empty identifiers
  const baseFileId = path.basename(fileId).trim();
  if (!baseFileId || baseFileId.includes("..") || baseFileId.includes("/") || baseFileId.includes("\\")) {
    return null;
  }
  const safeId = baseFileId.replace(/[^a-zA-Z0-9_-]/g, "_");

  const vaultDirs = [
    path.join(/*turbopackIgnore: true*/ os.tmpdir(), ".tattva-vault"),
    path.join(/*turbopackIgnore: true*/ "/tmp", ".tattva-vault"),
    path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".tattva-vault"),
  ];

  for (const vaultDir of vaultDirs) {
    try {
      if (!fsInstance.existsSync(/*turbopackIgnore: true*/ vaultDir)) continue;
      const userDir = path.join(/*turbopackIgnore: true*/ vaultDir, safeUserId);
      if (!fsInstance.existsSync(/*turbopackIgnore: true*/ userDir)) continue;

      const userDirReal = fsInstance.realpathSync(/*turbopackIgnore: true*/ userDir);
      const vaultDirReal = fsInstance.realpathSync(/*turbopackIgnore: true*/ vaultDir);
      // Ensure userDir is strictly inside the vaultDir
      if (!userDirReal.startsWith(vaultDirReal)) {
        continue;
      }

      if (!fsInstance.statSync(/*turbopackIgnore: true*/ userDirReal).isDirectory()) continue;

      const files = fsInstance.readdirSync(/*turbopackIgnore: true*/ userDirReal);
      const matched = files.find((f: string) => f.startsWith(safeId));
      if (matched) {
        const fullPath = path.join(/*turbopackIgnore: true*/ userDirReal, matched);
        const resolvedPath = path.resolve(/*turbopackIgnore: true*/ fullPath);
        // Ensure resolved path is strictly within the user's directory
        if (!resolvedPath.startsWith(userDirReal)) {
          return null;
        }
        // Ensure symlinks cannot escape the user's permitted directory
        const realFullPath = fsInstance.realpathSync(/*turbopackIgnore: true*/ resolvedPath);
        if (!realFullPath.startsWith(userDirReal)) {
          return null;
        }
        return { fullPath: realFullPath, matched };
      }
    } catch {
      // directory traversal or permission handling
    }
  }
  return null;
}

/**
 * Universal Document Download Streamer (Zero Trust Secured)
 * Delivers byte-exact binary streams with RFC 6266 headers
 * ensuring native Microsoft Office, Google Docs/Sheets/Slides, and Android viewers open smoothly.
 */
export async function GET(request: Request) {
  try {
    const session = await verifyUserSession(request);
    if (!session.authenticated) {
      return NextResponse.json(
        { error: "Authentication required to download documents." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");
    const filename = searchParams.get("name") || "document.bin";
    const isInline = searchParams.get("inline") === "true";

    if (!fileId) {
      return NextResponse.json({ error: "fileId query parameter is required." }, { status: 400 });
    }

    const safeUserId = session.userId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const found = findUserVaultFile(safeUserId, fileId);

    if (found) {
      const fsInstance = getFs();
      const buffer = fsInstance.readFileSync(found.fullPath);
      const ext = path.extname(found.matched).toLowerCase().replace(/^\./, "");
      const mimeType = getMimeType(ext);
      const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `${isInline ? "inline" : "attachment"}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    return NextResponse.json({ error: "File not found or access denied." }, { status: 404 });
  } catch (err: unknown) {
    console.error("Document download streaming error:", err);
    return NextResponse.json({ error: "Failed to download document." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    if (!session.authenticated) {
      return NextResponse.json(
        { error: "Authentication required to stream document data." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.dataUri) {
      return NextResponse.json({ error: "Missing file data." }, { status: 400 });
    }

    const { dataUri, filename = "document.bin", mimeType = "application/octet-stream", inline = false } = body;
    const commaIndex = dataUri.indexOf(",");
    const base64Data = commaIndex > 0 ? dataUri.slice(commaIndex + 1) : dataUri;
    const buffer = Buffer.from(base64Data, "base64");

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err: unknown) {
    console.error("Document download streaming error:", err);
    return NextResponse.json({ error: "Failed to stream document." }, { status: 500 });
  }
}

function getMimeType(ext: string): string {
  switch (ext) {
    case "docx":
    case "doc":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "pptx":
    case "ppt":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "xlsx":
    case "xls":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "pdf":
      return "application/pdf";
    case "csv":
      return "text/csv;charset=utf-8";
    case "json":
      return "application/json;charset=utf-8";
    case "xml":
      return "application/xml;charset=utf-8";
    case "md":
      return "text/markdown;charset=utf-8";
    case "txt":
      return "text/plain;charset=utf-8";
    case "py":
      return "text/x-python;charset=utf-8";
    case "java":
      return "text/x-java-source;charset=utf-8";
    case "c":
      return "text/x-c;charset=utf-8";
    case "cpp":
      return "text/x-c++;charset=utf-8";
    case "js":
      return "text/javascript;charset=utf-8";
    case "ts":
      return "text/typescript;charset=utf-8";
    case "html":
      return "text/html;charset=utf-8";
    case "css":
      return "text/css;charset=utf-8";
    case "sql":
      return "application/sql;charset=utf-8";
    default:
      return "application/octet-stream";
  }
}
