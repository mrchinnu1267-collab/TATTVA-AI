import { NextRequest, NextResponse } from "next/server";
import {
  createSubjectProfile,
  listSubjectProfiles,
  getSubjectProfileById,
  updateSubjectProfile,
  deleteSubjectProfile,
} from "@/app/lib/image-engine/consistency/subject-store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || "default";
    const subjectId = searchParams.get("id");

    if (subjectId) {
      const profile = getSubjectProfileById(subjectId, workspaceId);
      if (!profile) {
        return NextResponse.json({ error: "Subject profile not found" }, { status: 404 });
      }
      return NextResponse.json({ profile });
    }

    const profiles = listSubjectProfiles(workspaceId);
    return NextResponse.json({ profiles, count: profiles.length });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to list subject profiles" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      category,
      description = "",
      physical,
      facial,
      style,
      importantDetails = [],
      prohibitedChanges = [],
      userConsentProvided = false,
      workspaceId = "default",
      userId = "anonymous",
    } = body;

    if (!name || !category || !physical) {
      return NextResponse.json(
        { error: "Missing required fields: name, category, and physical traits are required." },
        { status: 400 }
      );
    }

    const profile = createSubjectProfile({
      workspaceId,
      userId,
      name,
      category,
      description,
      physical,
      facial,
      style: style || { artisticStyle: "Default realistic", colorPalette: physical.colorScheme || [] },
      importantDetails,
      prohibitedChanges,
      referenceImages: [],
      userConsentProvided,
    });

    return NextResponse.json({ profile, message: "Subject profile created successfully" }, { status: 201 });
  } catch (err: any) {
    const status = err.message.includes("Authorization Required") ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, workspaceId = "default", ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing required field: id" }, { status: 400 });
    }

    const updated = updateSubjectProfile(id, updates, workspaceId);
    return NextResponse.json({ profile: updated, message: "Subject profile updated" });
  } catch (err: any) {
    const status = err.message.includes("Access Denied") ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const workspaceId = searchParams.get("workspaceId") || "default";

    if (!id) {
      return NextResponse.json({ error: "Missing required query parameter: id" }, { status: 400 });
    }

    const success = deleteSubjectProfile(id, workspaceId);
    if (!success) {
      return NextResponse.json({ error: "Subject profile not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Subject profile and references deleted" });
  } catch (err: any) {
    const status = err.message.includes("Access Denied") ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
