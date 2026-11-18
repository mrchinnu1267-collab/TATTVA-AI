/**
 * TATTVA AI - Knowledge Base & FAQ Search API Route (Phase 46)
 * GET /api/support/faq -> Searches knowledge base guides and answers
 */

import { NextResponse } from "next/server";
import { CustomerSupportEngine } from "../../../lib/support";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const category = (searchParams.get("category") || undefined) as any;
    const voteId =
      searchParams.get("vote") ||
      (searchParams.get("action") === "vote"
        ? searchParams.get("slug") || searchParams.get("id")
        : null);

    const engine = CustomerSupportEngine.getInstance();

    if (voteId) {
      const voted = engine.voteFaqHelpful(voteId);
      return NextResponse.json({ success: true, voted });
    }

    const articles = query
      ? engine.searchFaqs(query)
      : engine.listFaqs(category);

    return NextResponse.json({ success: true, count: articles.length, articles });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
