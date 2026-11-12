/**
 * TATTVA AI - Phase U: Unseen Benchmark Dataset API Route
 * Provides structured query access to the 300 unseen prompt benchmark catalog.
 */

import { NextRequest, NextResponse } from "next/server";
import { RealWorldValidationService } from "@/app/lib/image-engine/services/real-world-validation.service";
import { PromptCategory, ImageDomain } from "@/app/lib/image-engine/real-world-validation/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as PromptCategory | null;
    const domain = searchParams.get("domain") as ImageDomain | null;
    const difficulty = searchParams.get("difficulty") as "moderate" | "hard" | "extreme" | null;
    const promptId = searchParams.get("id");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search")?.toLowerCase();

    if (promptId) {
      const prompt = RealWorldValidationService.getPromptById(promptId);
      if (!prompt) {
        return NextResponse.json({ success: false, error: "Prompt not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, prompt });
    }

    let prompts = RealWorldValidationService.getPrompts(category || undefined);

    if (domain) {
      prompts = prompts.filter((p) => p.domain === domain);
    }

    if (difficulty) {
      prompts = prompts.filter((p) => p.difficulty === difficulty);
    }

    if (search) {
      prompts = prompts.filter(
        (p) =>
          p.prompt.toLowerCase().includes(search) ||
          p.id.toLowerCase().includes(search) ||
          p.groundTruth.expectedObjects.some((o) => o.name.toLowerCase().includes(search))
      );
    }

    const totalMatches = prompts.length;
    const paginated = prompts.slice(0, Math.min(limit, 300));

    return NextResponse.json({
      success: true,
      total: totalMatches,
      count: paginated.length,
      prompts: paginated,
      summary: RealWorldValidationService.getDatasetSummary(),
    });
  } catch (error: any) {
    console.error("[UnseenBenchmark Dataset API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch dataset" },
      { status: 500 }
    );
  }
}

