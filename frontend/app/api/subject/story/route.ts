import { NextRequest, NextResponse } from "next/server";
import { generateStorySequence } from "@/app/lib/image-engine/consistency/consistency-engine";
import { listStoriesForSubject } from "@/app/lib/image-engine/consistency/subject-store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const workspaceId = searchParams.get("workspaceId") || "default";

    if (!subjectId) {
      return NextResponse.json({ error: "Missing required query parameter: subjectId" }, { status: 400 });
    }

    const stories = listStoriesForSubject(subjectId, workspaceId);
    return NextResponse.json({ stories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      subjectId,
      storyTitle,
      scenes,
      workspaceId = "default",
      provider,
    } = body;

    if (!subjectId || !storyTitle || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json(
        { error: "Missing required parameters: subjectId, storyTitle, and an array of scenes are required." },
        { status: 400 }
      );
    }

    const story = await generateStorySequence({
      subjectId,
      storyTitle,
      scenes,
      workspaceId,
      provider,
    });

    return NextResponse.json({ story }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

