import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getAuthBaseUrl, sanitizeRedirectPath } from "../../lib/auth-redirect";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const rawNext = requestUrl.searchParams.get("next");
  const errorParam = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  const baseUrl = getAuthBaseUrl(request);

  // 1. Handle error queries passed back from Supabase (e.g. link expired, already clicked, invalid)
  if (errorParam || errorDescription) {
    const errorMsg = errorDescription || errorParam || "Authentication link has expired or is invalid.";
    const targetUrl = new URL("/login", baseUrl);
    targetUrl.searchParams.set("error", "auth_link_error");
    targetUrl.searchParams.set("error_description", errorMsg);
    return NextResponse.redirect(targetUrl);
  }

  // 2. Determine target path safely (prevent open redirects)
  let nextPath = sanitizeRedirectPath(rawNext, "/chat");
  if (type === "recovery" || rawNext?.includes("reset-password")) {
    nextPath = "/reset-password";
  }

  // 3. Process Code or Token Hash with Supabase
  if (code || (tokenHash && type)) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore in server execution contexts where response handles cookies
            }
          },
        },
      }
    );

    let authError: string | null = null;

    try {
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type,
        });
        if (error) authError = error.message;
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) authError = error.message;
      }
    } catch (err: unknown) {
      authError = err instanceof Error ? err.message : "Failed to verify authentication credentials.";
    }

    if (authError) {
      console.warn("Supabase auth verification failed:", authError);
      const targetUrl = new URL("/login", baseUrl);
      targetUrl.searchParams.set("error", "verification_failed");
      targetUrl.searchParams.set(
        "error_description",
        authError.includes("expired")
          ? "This email verification link has expired. Please sign in or request a new verification email."
          : authError
      );
      return NextResponse.redirect(targetUrl);
    }

    // 4. Verification succeeded - Retrieve verified user profile
    const { data: { user } } = await supabase.auth.getUser();

    // 5. Construct successful redirect response
    const redirectUrl = new URL(nextPath, baseUrl);
    if (nextPath.startsWith("/chat")) {
      redirectUrl.searchParams.set("verified", "true");
    }

    const response = NextResponse.redirect(redirectUrl);

    // 6. Sync verified user session cookie across devices (Mobile / Desktop)
    if (user && user.email) {
      const sessionPayload = {
        email: user.email.toLowerCase().trim(),
        name: user.user_metadata?.full_name || user.email.split("@")[0] || "User",
        timestamp: Date.now(),
        verified: true,
      };
      const sessionToken = Buffer.from(JSON.stringify(sessionPayload)).toString("base64");

      response.cookies.set("tattva_session", sessionToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });
    }

    return response;
  }

  // Fallback: No code or token provided
  return NextResponse.redirect(new URL(nextPath, baseUrl));
}
