import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Image prompt enhancement has been permanently retired from TATTVA AI.", status: 404 },
    { status: 404 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "Image prompt enhancement has been permanently retired from TATTVA AI.", status: 404 },
    { status: 404 }
  );
}
