import { NextResponse } from "next/server";

export const runtime = "nodejs";

const RETIRED_RESPONSE = {
  error: "Image generation APIs have been permanently retired from TATTVA AI.",
  status: 404,
  capability: "image_generation",
  retired: true,
};

export async function GET() {
  return NextResponse.json(RETIRED_RESPONSE, { status: 404 });
}

export async function POST() {
  return NextResponse.json(RETIRED_RESPONSE, { status: 404 });
}

export async function PUT() {
  return NextResponse.json(RETIRED_RESPONSE, { status: 404 });
}

export async function DELETE() {
  return NextResponse.json(RETIRED_RESPONSE, { status: 404 });
}
