import { NextResponse } from "next/server";
import { QueryProcessor } from "../../../lib/image-search/query-processor";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const suggestions = QueryProcessor.getSuggestions(query);
    return NextResponse.json({
      query,
      suggestions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate suggestions", suggestions: [] },
      { status: 500 }
    );
  }
}

