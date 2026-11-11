import { NextRequest, NextResponse } from "next/server";
import { evaluateSubjectConsistency } from "@/app/lib/image-engine/consistency/evaluator";
import { getSubjectProfileById } from "@/app/lib/image-engine/consistency/subject-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, subjectId, userPrompt, appliedClothingOverride, workspaceId = "default" } = body;

    if (!image || !subjectId) {
      return NextResponse.json(
        { error: "Missing required parameters: image and subjectId are required." },
        { status: 400 }
      );
    }

    const profile = getSubjectProfileById(subjectId, workspaceId);
    if (!profile) {
      return NextResponse.json({ error: "Subject profile not found" }, { status: 404 });
    }

    const evaluation = await evaluateSubjectConsistency({
      image,
      profile,
      userPrompt,
      appliedClothingOverride,
    });

    return NextResponse.json({ evaluation });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

