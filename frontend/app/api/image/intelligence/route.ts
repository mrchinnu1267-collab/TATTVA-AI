import { NextRequest, NextResponse } from "next/server";
import {
  analyzeGeneratedImage,
  evaluatePromptAdherence,
  improveImageIntelligently,
} from "@/app/lib/image-engine/intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = "analyze", image, prompt, currentReport, attemptNumber = 1, forceVision = true } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "A valid generated image data URI or URL is required." }, { status: 400 });
    }

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "A valid prompt is required for visual adherence auditing." }, { status: 400 });
    }

    if (action === "improve") {
      if (!currentReport) {
        return NextResponse.json(
          { error: "currentReport is required to perform targeted intelligent correction." },
          { status: 400 }
        );
      }

      const result = await improveImageIntelligently({
        image,
        originalPrompt: prompt.trim(),
        currentReport,
        attemptNumber: Number(attemptNumber) || 1,
        forceVision: Boolean(forceVision),
      });

      return NextResponse.json({ result }, { status: 200 });
    }

    // Default action: "analyze"
    const started = Date.now();
    const understanding = await analyzeGeneratedImage({
      image,
      originalPrompt: prompt.trim(),
      forceVision: Boolean(forceVision),
    });

    const report = evaluatePromptAdherence({
      imageId: `img_${Date.now()}`,
      originalPrompt: prompt.trim(),
      understanding,
      executionTimeMs: Date.now() - started,
    });

    return NextResponse.json({ report }, { status: 200 });
  } catch (err: any) {
    console.error("[API:ImageIntelligence] error:", err);
    return NextResponse.json({ error: err.message || "Image intelligence analysis failed." }, { status: 500 });
  }
}

