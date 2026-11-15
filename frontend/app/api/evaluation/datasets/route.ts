/**
 * TATTVA AI - Dataset Library Management API
 * Lists available datasets and handles dataset registration
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { NextRequest, NextResponse } from "next/server";
import { datasetRegistry } from "../../../lib/evaluation/datasets/dataset-registry";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const language = searchParams.get("language");
    const type = searchParams.get("type");

    let datasets = datasetRegistry.listDatasets();

    if (category && category !== "all") {
      datasets = datasets.filter((d) => d.categories.includes(category as any));
    }

    if (language && language !== "all") {
      datasets = datasets.filter((d) => d.language === language);
    }

    if (type && type !== "all") {
      datasets = datasets.filter((d) => d.datasetType === type);
    }

    return NextResponse.json({
      success: true,
      count: datasets.length,
      datasets,
    });
  } catch (err: any) {
    console.error("[Dataset Library GET Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, description, source, license, version, language, format, relativePath, categories, intendedPurpose } = body;

    if (!id || !name || !relativePath) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: id, name, relativePath" },
        { status: 400 }
      );
    }

    // Security guard: sanitize relativePath to prevent directory traversal
    const cleanRelPath = String(relativePath).replace(/^[/\\]+/, "").trim();
    if (cleanRelPath.includes("..")) {
      return NextResponse.json(
        { success: false, error: "Invalid relativePath: directory traversal characters ('..') are strictly prohibited" },
        { status: 400 }
      );
    }

    datasetRegistry.registerDataset({
      id: String(id).replace(/[^a-zA-Z0-9_-]/g, ""),
      name: String(name).trim().slice(0, 100),
      description: description || "",
      source: source || "User Uploaded",
      license: license || "Custom / Proprietary",
      version: version || "1.0.0",
      language: language || "en-US",
      recordCount: 0,
      fileSizeBytes: 0,
      fileSizeFormatted: "0 B",
      format: format || "jsonl",
      relativePath: cleanRelPath,
      categories: categories || ["knowledge"],
      intendedPurpose: intendedPurpose || "Evaluation",
      dateImported: new Date().toISOString(),
      isActive: true,
      hasVerifiedAnswers: true,
      schemaType: "indic_mcq",
    });

    return NextResponse.json({
      success: true,
      message: `Dataset '${name}' registered successfully in canonical manifest.`,
    });
  } catch (err: any) {
    console.error("[Dataset Library POST Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
