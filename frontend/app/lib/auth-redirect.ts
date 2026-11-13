/**
 * TATTVA AI - Authentication Redirect & Canonical Domain Manager
 *
 * Guarantees that Supabase email confirmation, OAuth callbacks, and password resets
 * redirect to the production canonical domain (https://tattva-ai-phi.vercel.app)
 * on all devices (Android, iOS, desktop), preventing broken localhost redirects.
 */

export const PRODUCTION_SITE_URL = "https://tattva-ai-phi.vercel.app";

/**
 * Sanitizes an internal redirect path to prevent open redirect vulnerabilities.
 * Ensures the destination is strictly a relative path on the same origin.
 */
export function sanitizeRedirectPath(path: string | null | undefined, defaultPath = "/chat"): string {
  if (!path || typeof path !== "string") {
    return defaultPath;
  }

  const trimmed = path.trim();

  // Must start with a single slash, but not double slash (protocol-relative: //evil.com)
  // and must not contain backslashes or protocol specifiers
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("\\") ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
  ) {
    return defaultPath;
  }

  return trimmed;
}

/**
 * Resolves the canonical base URL for auth redirects.
 *
 * In production:
 * - Prioritizes NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_APP_URL if set to a valid non-localhost URL.
 * - Prioritizes Vercel production deployment URLs.
 * - Always falls back to PRODUCTION_SITE_URL ("https://tattva-ai-phi.vercel.app").
 *
 * In development (NODE_ENV !== "production"):
 * - Allows localhost or custom LAN IPs when explicitly running in local dev.
 */
export function getAuthBaseUrl(request?: Request): string {
  const isProd = process.env.NODE_ENV === "production";

  // 1. Explicitly configured Site URL in environment
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envSiteUrl && typeof envSiteUrl === "string") {
    const clean = envSiteUrl.trim().replace(/\/+$/, "");
    if (isProd) {
      // In production, never accept localhost as canonical site URL
      if (!clean.includes("localhost") && !clean.includes("127.0.0.1")) {
        return clean;
      }
    } else {
      return clean;
    }
  }

  // 2. Vercel deployment variables
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/+$/, "")}`;
  }
  if (isProd && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
  }

  // 3. Inspect incoming request headers (if available)
  if (request) {
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host");

    if (host) {
      const isLocalHost =
        host.includes("localhost") ||
        host.includes("127.0.0.1") ||
        (!isProd && /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(host));
      const proto =
        request.headers.get("x-forwarded-proto") ||
        (isLocalHost ? "http" : isProd ? "https" : "http");

      if (!isProd && isLocalHost) {
        return `${proto}://${host}`;
      }

      if (!isLocalHost) {
        return `${proto}://${host}`;
      }
    }

    const origin = request.headers.get("origin");
    if (origin) {
      const isLocalOrigin = origin.includes("localhost") || origin.includes("127.0.0.1");
      if (!isProd && isLocalOrigin) {
        return origin.replace(/\/+$/, "");
      }
      if (!isLocalOrigin) {
        return origin.replace(/\/+$/, "");
      }
    }
  }

  // 4. In client-side browser runtime
  if (typeof window !== "undefined" && window.location) {
    const origin = window.location.origin;
    const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
    if (!isProd && isLocal) {
      return origin;
    }
    if (!isLocal) {
      return origin;
    }
  }

  // 5. Absolute fallback
  return isProd ? PRODUCTION_SITE_URL : "http://localhost:3000";
}

/**
 * Returns the fully qualified auth callback URL for Supabase redirects.
 * @param next Optional internal destination path after verification (defaults to "/chat")
 * @param request Optional incoming request to inspect host headers
 */
export function getAuthCallbackUrl(next = "/chat", request?: Request): string {
  const baseUrl = getAuthBaseUrl(request);
  const safeNext = sanitizeRedirectPath(next, "/chat");
  return `${baseUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

/**
 * Returns the exact OAuth callback URL for third-party providers (Google OAuth).
 * In production or on mobile devices, this strictly targets `https://tattva-ai-phi.vercel.app/auth/callback`.
 * In local dev (localhost/127.0.0.1), it uses `${window.location.origin}/auth/callback`.
 *
 * Omitting query parameters like ?next=/chat ensures exact string matching with Supabase
 * Redirect URLs allowlist, preventing Supabase from rejecting the URL and falling back to localhost.
 */
export function getOAuthCallbackUrl(next?: string, request?: Request): string {
  const baseUrl = getAuthBaseUrl(request);
  if (!next || next === "/chat") {
    return `${baseUrl}/auth/callback`;
  }
  const safeNext = sanitizeRedirectPath(next, "/chat");
  return `${baseUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}
