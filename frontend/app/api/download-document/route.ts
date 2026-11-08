import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Universal Mobile & Desktop Document Download Streamer
 * Delivers byte-exact binary streams with standard RFC 6266 headers
 * ensuring native Android Download Manager and Microsoft Office mobile apps
 * open the file without corruption or "Can't open file" warnings.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.dataUri) {
      return NextResponse.json({ error: "Missing file data." }, { status: 400 });
    }

    const { dataUri, filename = "document.bin", mimeType = "application/octet-stream" } = body;
    const commaIndex = dataUri.indexOf(",");
    const base64Data = commaIndex > 0 ? dataUri.slice(commaIndex + 1) : dataUri;
    const buffer = Buffer.from(base64Data, "base64");

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
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

