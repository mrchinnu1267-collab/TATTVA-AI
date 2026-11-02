import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiter storage for middleware edge/node
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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

  // 3. Prepare response with Comprehensive HTTP Security Headers for pages
  const response = NextResponse.next();

  // Content Security Policy (Strict Zero Trust with Host Preview Tunnel & Localhost support)
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' http://localhost:* http://127.0.0.1:* http://192.168.*:* http://10.*:* https://*.trycloudflare.com https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://openrouter.ai https://image.pollinations.ai https://api.pollinations.ai https://router.huggingface.co https://api.stability.ai https://api.openai.com https://api.replicate.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("X-Frame-Options", "DENY"); // Prevent clickjacking
  response.headers.set("X-Content-Type-Options", "nosniff"); // Prevent MIME-type sniffing
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public media assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
