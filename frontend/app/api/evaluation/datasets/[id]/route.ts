/**
 * TATTVA AI - Single Dataset Management & Inspection API
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextRequest, NextResponse } from "next/server";
import { datasetRegistry } from "../../../../lib/evaluation/datasets/dataset-registry";

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await segmentData.params;
    const meta = datasetRegistry.getDatasetById(id);

    if (!meta) {
      return NextResponse.json({ success: false, error: "Dataset not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const includeSample = searchParams.get("sample") === "true";

    let sampleRecords: any[] = [];
    if (includeSample) {
      const records = datasetRegistry.loadRecords(id);
      // Return first 5 records with answer field masked for public safety
      sampleRecords = records.slice(0, 5).map(({ expectedAnswer, ...safe }) => safe);
    }

    return NextResponse.json({
      success: true,
      dataset: meta,
      sampleRecords: includeSample ? sampleRecords : undefined,
    });
  } catch (err: any) {
    console.error("[Dataset Single GET Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await segmentData.params;
    const body = await req.json();

    if (typeof body.isActive === "boolean") {
      const success = datasetRegistry.setDatasetActive(id, body.isActive);
      return NextResponse.json({ success, id, isActive: body.isActive });
    }

    return NextResponse.json({ success: false, error: "No valid update field provided" }, { status: 400 });
  } catch (err: any) {
    console.error("[Dataset Single PATCH Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
