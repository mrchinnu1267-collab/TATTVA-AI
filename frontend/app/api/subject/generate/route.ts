import { NextRequest, NextResponse } from "next/server";
import { generateWithSubject } from "@/app/lib/image-engine/consistency/consistency-engine";
import { SubjectGenerationRequest } from "@/app/lib/image-engine/consistency/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SubjectGenerationRequest & { workspaceId?: string };
    const {
      subjectId,
      prompt,
      variation,
      preferredViewType,
      provider,
      aspectRatio,
      quality,
      targetConsistency,
      autoCorrectOnFailure = true,
      workspaceId = "default",
    } = body;

    if (!subjectId || !prompt) {
      return NextResponse.json(
        { error: "Missing required parameters: subjectId and prompt are mandatory." },
        { status: 400 }
      );
    }

    const result = await generateWithSubject(
      {
        subjectId,
        prompt,
        variation,
        preferredViewType,
        provider,
        aspectRatio,
        quality,
        targetConsistency,
        autoCorrectOnFailure,
      },
      workspaceId
    );

    return NextResponse.json({ result });
  } catch (err: any) {
    const status = err.message.includes("Authorization Required") ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
