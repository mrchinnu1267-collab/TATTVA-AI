import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiter storage for proxy edge/node
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkMiddlewareRateLimit(ip: string, limit: number, windowSec: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowSec * 1000 });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // Canonical Hostname Redirect: ensure www.tattva-ai-phi.vercel.app redirects to canonical non-www
  if (host.startsWith("www.tattva-ai-phi.vercel.app")) {
    const canonicalUrl = new URL(request.url);
    canonicalUrl.host = "tattva-ai-phi.vercel.app";
    canonicalUrl.protocol = "https:";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "127.0.0.1";

  // 1. API Route Rate Limiting & Protection
  if (pathname.startsWith("/api/")) {
    const isChatOrGen = pathname.startsWith("/api/chat") || pathname.startsWith("/api/generate");
    const limit = isChatOrGen ? 60 : 120;
    const allowed = checkMiddlewareRateLimit(`api_${ip}`, limit, 60);

    if (!allowed) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests. Rate limit exceeded. Please wait a moment before trying again.",
          securityNotice: "Rate limit enforced by TATTVA AI Security Engine.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "30",
          },
        }
      );
    }

    // 2. CSRF & Origin Validation for State-Changing API Requests
    if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
      const origin = request.headers.get("origin");
      const host = request.headers.get("host");

      if (origin && host) {
        try {
          const originHost = new URL(origin).host;
          const isAllowedHost =
            originHost === host ||
            originHost.includes("localhost") ||
            originHost.includes("127.0.0.1") ||
            originHost.startsWith("192.168.") ||
            originHost.startsWith("10.") ||
            originHost.startsWith("172.") ||
            originHost.includes("10.0.2.2") ||
            originHost.endsWith(".trycloudflare.com");

          if (!isAllowedHost) {
            return new NextResponse(
              JSON.stringify({ error: "Cross-Origin Request Blocked: CSRF validation failed." }),
              { status: 403, headers: { "Content-Type": "application/json" } }
            );
          }
        } catch {
          // ignore
        }
      }
    }

    return NextResponse.next();
  }

  // 3. Bypass proxy for sitemap and robots endpoints so nothing alters the pure XML/txt stream
  if (
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname.endsWith(".xml") ||
    pathname.endsWith(".txt")
  ) {
    return NextResponse.next();
  }

  // 4. Generate Cryptographic Nonce for Strict CSP (Base64 encoded 128-bit UUID)
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  // Content Security Policy (Strict Zero Trust with Nonce & Strict-Dynamic)
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://*.supabase.co https://www.googletagmanager.com${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: https://www.google-analytics.com https://*.googletagmanager.com",
    "connect-src 'self' http://localhost:* http://127.0.0.1:* https://*.trycloudflare.com https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://openrouter.ai https://router.huggingface.co https://api.stability.ai https://api.openai.com https://api.replicate.com https://api.open-meteo.com https://geocoding-api.open-meteo.com https://api.bigdatacloud.net https://*.bigdatacloud.net https://ipapi.co https://nominatim.openstreetmap.org https://server.arcgisonline.com https://services.arcgisonline.com https://*.google.com https://*.googleapis.com https://*.tile.openstreetmap.org https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.sentry.io",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("x-nonce", nonce);
  response.headers.set("X-Frame-Options", "DENY"); // Prevent clickjacking
  response.headers.set("X-Content-Type-Options", "nosniff"); // Prevent MIME-type sniffing
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self)");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  return response;
}

export const middleware = proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sitemap.xml & robots.txt (search crawler files)
     * - public media assets
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|apk|zip|ico|xml|txt)$).*)",
  ],
};
