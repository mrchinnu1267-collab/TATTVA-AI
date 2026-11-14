/**
 * TATTVA AI - Model Arena & Comparison API
 * Side-by-side benchmarking on identical question sets with identical seeds
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextRequest, NextResponse } from "next/server";
import { modelComparator } from "../../../lib/evaluation/comparison/model-comparator";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const report = modelComparator.getComparisonById(id);
      if (!report) {
        return NextResponse.json({ success: false, error: "Comparison not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, comparison: report });
    }

    const comparisons = modelComparator.listComparisons();
    return NextResponse.json({ success: true, count: comparisons.length, comparisons });
  } catch (err: any) {
    console.error("[Model Comparison GET Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      comparisonName = "Model Arena Benchmark",
      datasetId = "mmmlu-hi-in-sample",
      sampleSize = 25,
      subject = "all",
      seed = 42,
      targets = [],
      concurrency = 2,
    } = body;

    if (!targets || targets.length < 1) {
      return NextResponse.json(
        { success: false, error: "Please provide at least 1 target model for comparison." },
        { status: 400 }
      );
    }

    const report = await modelComparator.executeComparison({
      comparisonName,
      datasetId,
      sampleSize: Number(sampleSize) || 25,
      subject: subject === "all" ? undefined : subject,
      seed: Number(seed) || 42,
      concurrency: Number(concurrency) || 2,
      targets,
    });

    return NextResponse.json({
      success: true,
      comparison: report,
    });
  } catch (err: any) {
    console.error("[Model Comparison POST Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
