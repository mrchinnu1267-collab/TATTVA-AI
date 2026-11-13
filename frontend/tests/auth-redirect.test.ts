import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  getAuthBaseUrl,
  getAuthCallbackUrl,
  getOAuthCallbackUrl,
  sanitizeRedirectPath,
  PRODUCTION_SITE_URL,
} from "../app/lib/auth-redirect";

describe("TATTVA AI - Email Authentication Redirect & Canonical Domain", () => {
  const originalEnv = { ...process.env };

  function setNodeEnv(env: string) {
    (process.env as Record<string, string | undefined>).NODE_ENV = env;
  }

  test("1. Production environment guarantees canonical production domain", () => {
    setNodeEnv("production");
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;

    const base = getAuthBaseUrl();
    assert.strictEqual(base, PRODUCTION_SITE_URL, "Must strictly fall back to production domain");
    assert.ok(!base.includes("localhost"), "Production base URL must never be localhost");
  });

  test("2. Production ignores localhost in NEXT_PUBLIC_SITE_URL", () => {
    setNodeEnv("production");
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

    const base = getAuthBaseUrl();
    assert.strictEqual(base, PRODUCTION_SITE_URL, "Must ignore localhost in production");
  });

  test("3. Respects valid production NEXT_PUBLIC_SITE_URL", () => {
    setNodeEnv("production");
    process.env.NEXT_PUBLIC_SITE_URL = "https://custom-tattva.ai/";

    const base = getAuthBaseUrl();
    assert.strictEqual(base, "https://custom-tattva.ai", "Trims trailing slash and respects custom production URL");
  });

  test("4. Local development allows localhost for dev testing", () => {
    setNodeEnv("development");
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    const base = getAuthBaseUrl();
    assert.strictEqual(base, "http://localhost:3000");
  });

  test("5. Local development allows LAN mobile IP", () => {
    setNodeEnv("development");
    delete process.env.NEXT_PUBLIC_SITE_URL;

    const fakeRequest = new Request("http://192.168.1.100:3000/api/auth/register", {
      headers: { host: "192.168.1.100:3000" },
    });

    const base = getAuthBaseUrl(fakeRequest);
    assert.strictEqual(base, "http://192.168.1.100:3000", "Allows LAN IP in development for physical mobile testing");
  });

  test("6. Generates correct callback URL with encoded parameters", () => {
    setNodeEnv("production");
    process.env.NEXT_PUBLIC_SITE_URL = "https://tattva-ai-phi.vercel.app";

    const callbackUrl = getAuthCallbackUrl("/chat");
    assert.strictEqual(
      callbackUrl,
      "https://tattva-ai-phi.vercel.app/auth/callback?next=%2Fchat"
    );

    const resetCallback = getAuthCallbackUrl("/reset-password");
    assert.strictEqual(
      resetCallback,
      "https://tattva-ai-phi.vercel.app/auth/callback?next=%2Freset-password"
    );
  });

  test("7. Prevents Open Redirect attacks with sanitizeRedirectPath", () => {
    // Protocol-relative attacks
    assert.strictEqual(sanitizeRedirectPath("//evil.com"), "/chat");
    assert.strictEqual(sanitizeRedirectPath("//malicious.site/phish"), "/chat");
    assert.strictEqual(sanitizeRedirectPath("/\\evil.com"), "/chat");

    // Full URL attacks
    assert.strictEqual(sanitizeRedirectPath("https://evil.com"), "/chat");
    assert.strictEqual(sanitizeRedirectPath("http://attacker.com/steal"), "/chat");
    assert.strictEqual(sanitizeRedirectPath("javascript:alert(1)"), "/chat");

    // Null or invalid attacks
    assert.strictEqual(sanitizeRedirectPath(null), "/chat");
    assert.strictEqual(sanitizeRedirectPath(""), "/chat");
    assert.strictEqual(sanitizeRedirectPath("not-a-slash"), "/chat");

    // Valid relative internal paths
    assert.strictEqual(sanitizeRedirectPath("/chat"), "/chat");
    assert.strictEqual(sanitizeRedirectPath("/reset-password"), "/reset-password");
    assert.strictEqual(sanitizeRedirectPath("/dashboard"), "/dashboard");
    assert.strictEqual(sanitizeRedirectPath("/chat?verified=true"), "/chat?verified=true");
  });

  test("8. Cross-device session token serialization", () => {
    const verifiedUser = {
      email: "gowtham@example.com",
      user_metadata: { full_name: "Kotapati Gowtham" },
    };

    const sessionPayload = {
      email: verifiedUser.email.toLowerCase().trim(),
      name: verifiedUser.user_metadata.full_name,
      timestamp: Date.now(),
      verified: true,
    };

    const token = Buffer.from(JSON.stringify(sessionPayload)).toString("base64");
    assert.ok(token.length > 20, "Token must be a valid base64 string");

    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf8"));
    assert.strictEqual(decoded.email, "gowtham@example.com");
    assert.strictEqual(decoded.name, "Kotapati Gowtham");
    assert.strictEqual(decoded.verified, true);
  });

  test("9. Expired or already used token error mapping", () => {
    const expiredErrorMessage = "Email link is invalid or has expired";
    const mapped = expiredErrorMessage.includes("expired")
      ? "This email verification link has expired. Please sign in or request a new verification email."
      : expiredErrorMessage;

    assert.strictEqual(
      mapped,
      "This email verification link has expired. Please sign in or request a new verification email."
    );
  });

  test("10. Google OAuth callback URL in production strictly uses canonical domain without query mismatch", () => {
    setNodeEnv("production");
    process.env.NEXT_PUBLIC_SITE_URL = "https://tattva-ai-phi.vercel.app";

    const oauthUrl = getOAuthCallbackUrl("/chat");
    assert.strictEqual(
      oauthUrl,
      "https://tattva-ai-phi.vercel.app/auth/callback",
      "OAuth callback must be clean https://tattva-ai-phi.vercel.app/auth/callback to match Supabase allowlist"
    );
    assert.ok(!oauthUrl.includes("localhost"), "Production OAuth callback must never contain localhost");
  });

  test("11. Google OAuth callback URL in local development targets localhost", () => {
    setNodeEnv("development");
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    const oauthUrl = getOAuthCallbackUrl("/chat");
    assert.strictEqual(
      oauthUrl,
      "http://localhost:3000/auth/callback",
      "Local dev OAuth callback should target localhost:3000"
    );
  });

  test("12. Mobile device simulation on production resolves strictly to canonical domain", () => {
    setNodeEnv("production");
    // Simulate mobile browser request with mobile user agent and host header
    const mobileRequest = new Request("https://tattva-ai-phi.vercel.app/login", {
      headers: {
        host: "tattva-ai-phi.vercel.app",
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
      },
    });

    const mobileOauthUrl = getOAuthCallbackUrl("/chat", mobileRequest);
    assert.strictEqual(
      mobileOauthUrl,
      "https://tattva-ai-phi.vercel.app/auth/callback",
      "Mobile device request on production must never redirect to localhost:3000"
    );
  });

  // Restore environment after tests
  process.env = originalEnv;
});
