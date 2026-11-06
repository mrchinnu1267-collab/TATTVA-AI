import { NextResponse } from "next/server";
import { searchWebImages } from "../../../lib/web-image-search";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = Math.min(Number(searchParams.get("limit") || 6), 12);

    if (!query.trim()) {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    }

    const images = await searchWebImages(query, limit);
    return NextResponse.json({
      query,
      count: images.length,
      images,
    });
  } catch (error) {
    console.error("[Web Image Search API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image search failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = String(body.query || body.q || "");
    const limit = Math.min(Number(body.limit || 6), 12);

    if (!query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const images = await searchWebImages(query, limit);
    return NextResponse.json({
      query,
      count: images.length,
      images,
    });
  } catch (error) {
    console.error("[Web Image Search API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image search failed" },
      { status: 500 }
    );
  }
}

