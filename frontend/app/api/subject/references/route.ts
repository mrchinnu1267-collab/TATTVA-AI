import { NextRequest, NextResponse } from "next/server";
import {
  addSubjectReference,
  removeSubjectReference,
} from "@/app/lib/image-engine/consistency/subject-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      subjectId,
      imageUrl,
      viewType = "primary",
      description = "",
      isPrimary = false,
      workspaceId = "default",
    } = body;

    if (!subjectId || !imageUrl) {
      return NextResponse.json(
        { error: "Missing required fields: subjectId and imageUrl are required." },
        { status: 400 }
      );
    }

    const reference = addSubjectReference(
      subjectId,
      {
        imageUrl,
        viewType,
        description,
        isPrimary,
      },
      workspaceId
    );

    return NextResponse.json({ reference, message: "Reference image added successfully" }, { status: 201 });
  } catch (err: any) {
    const status = err.message.includes("Access Denied") ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const referenceId = searchParams.get("referenceId");
    const workspaceId = searchParams.get("workspaceId") || "default";

    if (!subjectId || !referenceId) {
      return NextResponse.json(
        { error: "Missing required query parameters: subjectId and referenceId." },
        { status: 400 }
      );
    }

    const removed = removeSubjectReference(subjectId, referenceId, workspaceId);
    if (!removed) {
      return NextResponse.json({ error: "Reference image not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Reference image removed" });
  } catch (err: any) {
    const status = err.message.includes("Access Denied") ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

