import { NextRequest, NextResponse } from "next/server";
import { generateAccurateImage } from "@/app/lib/image-engine/accuracy/accuracy-pipeline";
import { runBenchmarkAccuracyAudit } from "@/app/lib/image-engine/accuracy/benchmark-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sampleSize = parseInt(searchParams.get("sampleSize") || "200", 10);

    const report = await runBenchmarkAccuracyAudit(Math.min(200, Math.max(10, sampleSize)));
    return NextResponse.json({ report });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      referenceImage,
      aspectRatio,
      quality,
      provider,
      enableAutoCorrection = true,
      maxCorrectionAttempts = 2,
      accuracyThreshold = 85,
    } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "A valid prompt is required." }, { status: 400 });
    }

    const result = await generateAccurateImage({
      prompt: prompt.trim(),
      referenceImage,
      aspectRatio,
      quality,
      provider,
      enableAutoCorrection,
      maxCorrectionAttempts,
      accuracyThreshold,
    });

    return NextResponse.json({ result }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
