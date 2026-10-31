import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: (cs) => cs.forEach((c) => cookieStore.set(c.name, c.value, c.options)),
          },
        }
      );
      await supabase.auth.signOut().catch(() => null);
    } catch {
      // ignore
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully" });
    response.cookies.delete("tattva_session");
    return response;
  } catch (err) {
    console.error("Logout API error:", err);
    return NextResponse.json({ success: true });
  }
}
