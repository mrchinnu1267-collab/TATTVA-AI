import { NextResponse } from "next/server";
import { imageSearchAggregator } from "../../../lib/image-search/aggregator";
import { ImageCategory, ImageOrientation, ImageProviderId, ImageSize } from "../../../lib/image-search/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(Math.max(10, Number(searchParams.get("pageSize") || searchParams.get("limit") || 24)), 50);

    const type = (searchParams.get("type") as ImageCategory) || "all";
    const orientation = (searchParams.get("orientation") as ImageOrientation) || "all";
    const size = (searchParams.get("size") as ImageSize) || "all";
    const provider = (searchParams.get("provider") as ImageProviderId) || "all";

    if (!query.trim()) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required", results: [], totalResults: 0 },
        { status: 400 }
      );
    }

    const response = await imageSearchAggregator.search({
      query,
      page,
      pageSize,
      filters: {
        type,
        orientation,
        size,
        provider,
      },
    });

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[Web Image Search API] GET Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Image search failed",
        results: [],
        totalResults: 0,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = String(body.query || body.q || "");
    const page = Math.max(1, Number(body.page || 1));
    const pageSize = Math.min(Math.max(10, Number(body.pageSize || body.limit || 24)), 50);

    const type = (body.type as ImageCategory) || "all";
    const orientation = (body.orientation as ImageOrientation) || "all";
    const size = (body.size as ImageSize) || "all";
    const provider = (body.provider as ImageProviderId) || "all";

    if (!query.trim()) {
      return NextResponse.json(
        { error: "Query is required", results: [], totalResults: 0 },
        { status: 400 }
      );
    }

    const response = await imageSearchAggregator.search({
      query,
      page,
      pageSize,
      filters: {
        type,
        orientation,
        size,
        provider,
      },
    });

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[Web Image Search API] POST Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Image search failed",
        results: [],
        totalResults: 0,
      },
      { status: 500 }
    );
  }
}
