import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySignedTattvaSession } from "@/app/lib/security";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("tattva_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const payload = verifySignedTattvaSession(sessionCookie);
    if (!payload?.email) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        email: payload.email,
        name: payload.name || payload.email.split("@")[0],
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
