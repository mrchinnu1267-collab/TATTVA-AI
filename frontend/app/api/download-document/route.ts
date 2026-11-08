import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const LOCAL_VAULT_DIR = path.resolve(process.cwd(), ".tattva-vault");

/**
 * Universal Document Download Streamer
 * Delivers byte-exact binary streams with RFC 6266 headers
 * ensuring native Microsoft Office, Google Docs/Sheets/Slides, and Android viewers open smoothly.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");
    const filename = searchParams.get("name") || "document.bin";
    const isInline = searchParams.get("inline") === "true";

    if (fileId) {
      // Look for the file in the local vault directory
      const safeId = fileId.replace(/[^a-zA-Z0-9_-]/g, "_");
      if (fs.existsSync(LOCAL_VAULT_DIR)) {
        const userDirs = fs.readdirSync(LOCAL_VAULT_DIR);
        for (const dir of userDirs) {
          const dirPath = path.join(LOCAL_VAULT_DIR, dir);
          if (fs.statSync(dirPath).isDirectory()) {
            const files = fs.readdirSync(dirPath);
            const matched = files.find((f) => f.startsWith(safeId));
            if (matched) {
              const fullPath = path.join(dirPath, matched);
              const buffer = fs.readFileSync(fullPath);
              const ext = path.extname(matched).toLowerCase().replace(/^\./, "");
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
          }
        }
      }
    }

    return NextResponse.json({ error: "File not found." }, { status: 404 });
  } catch (err: unknown) {
    console.error("Document download streaming error:", err);
    return NextResponse.json({ error: "Failed to download document." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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

