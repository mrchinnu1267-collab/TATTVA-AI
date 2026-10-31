import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("tattva_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const payload = JSON.parse(Buffer.from(sessionCookie, "base64").toString("utf8"));
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
