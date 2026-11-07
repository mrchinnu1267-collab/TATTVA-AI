import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    throw new Error("Sentry Server-Side Verification: TATTVA AI Diagnostics Health Check");
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({
      status: "captured",
      message: "Test server-side error successfully captured and dispatched to Sentry.",
      timestamp: new Date().toISOString(),
    });
  }
}

