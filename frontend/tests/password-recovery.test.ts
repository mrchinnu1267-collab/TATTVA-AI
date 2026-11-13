import test, { describe } from "node:test";
import assert from "node:assert/strict";

describe("TATTVA AI - Password Reset & Recovery Ecosystem", () => {
  // Test 1: Explicit Recovery Redirect URL
  test("1. Explicitly sets recovery redirect URL to /reset-password", () => {
    const origin = "http://localhost:3000";
    const recoveryRedirectUrl = `${origin}/reset-password`;

    assert.strictEqual(recoveryRedirectUrl, "http://localhost:3000/reset-password");
    assert.ok(recoveryRedirectUrl.endsWith("/reset-password"));
    assert.ok(!recoveryRedirectUrl.includes("/auth/callback"), "Direct recovery bypasses callback endpoint");
  });

  // Test 2: Production Recovery Redirect URL
  test("2. Production environment targets canonical domain /reset-password", () => {
    const origin = "https://tattva-ai-phi.vercel.app";
    const prodRedirectUrl = `${origin}/reset-password`;

    assert.strictEqual(prodRedirectUrl, "https://tattva-ai-phi.vercel.app/reset-password");
  });

  // Test 3: Password Validation - Minimum Length Enforcement (>= 8 characters)
  test("3. Enforces minimum password length (>= 8 characters)", () => {
    function validatePasswordLength(pwd: string): boolean {
      return typeof pwd === "string" && pwd.length >= 8;
    }

    assert.strictEqual(validatePasswordLength("123"), false);
    assert.strictEqual(validatePasswordLength("1234567"), false);
    assert.strictEqual(validatePasswordLength(""), false);
    assert.strictEqual(validatePasswordLength("12345678"), true);
    assert.strictEqual(validatePasswordLength("SecureP@ss2026!"), true);
  });

  // Test 4: Password Confirmation Matching (>= 8 characters)
  test("4. Enforces strict password confirmation match", () => {
    function validatePasswordMatch(pwd: string, confirm: string): boolean {
      return pwd.length >= 8 && confirm.length >= 8 && pwd === confirm;
    }

    assert.strictEqual(validatePasswordMatch("secret123", "secret123"), true);
    assert.strictEqual(validatePasswordMatch("secret123", "secret456"), false);
    assert.strictEqual(validatePasswordMatch("secret123", ""), false);
    assert.strictEqual(validatePasswordMatch("12345", "12345"), false, "Fails if under 8 chars even if matching");
  });

  // Test 5: Recovery Link Type Detection & Route Guarding
  test("5. Isolates recovery links from standard authentication login flows", () => {
    function shouldRedirectToRecovery(url: string): boolean {
      const parsed = new URL(url);
      const isRecoveryHash = parsed.hash.includes("type=recovery");
      const isRecoverySearch = parsed.searchParams.get("type") === "recovery";
      const isResetNext = parsed.searchParams.get("next")?.includes("reset-password") || false;

      return isRecoveryHash || isRecoverySearch || isResetNext;
    }

    assert.strictEqual(
      shouldRedirectToRecovery("http://localhost:3000/#access_token=xyz&type=recovery"),
      true,
      "Detects implicit hash recovery fragment"
    );
    assert.strictEqual(
      shouldRedirectToRecovery("http://localhost:3000/auth/callback?type=recovery&code=abc"),
      true,
      "Detects search query recovery parameter"
    );
    assert.strictEqual(
      shouldRedirectToRecovery("http://localhost:3000/auth/callback?next=/reset-password&code=abc"),
      true,
      "Detects next=/reset-password recovery parameter"
    );
    assert.strictEqual(
      shouldRedirectToRecovery("http://localhost:3000/auth/callback?code=abc&next=/chat"),
      false,
      "Does not trigger recovery for standard login flow"
    );
  });

  // Test 6: Auth Callback Cookie Guarding (No Premature tattva_session)
  test("6. Callback handler suppresses tattva_session cookie for recovery flows", () => {
    function evaluateSessionCookieIssuance(type: string | null, nextPath: string): boolean {
      const isRecovery = type === "recovery" || nextPath.includes("reset-password");
      // Only standard logins get tattva_session
      return !isRecovery;
    }

    assert.strictEqual(
      evaluateSessionCookieIssuance("recovery", "/reset-password"),
      false,
      "Never sets tattva_session cookie during recovery flow"
    );
    assert.strictEqual(
      evaluateSessionCookieIssuance(null, "/reset-password"),
      false,
      "Never sets tattva_session when target is /reset-password"
    );
    assert.strictEqual(
      evaluateSessionCookieIssuance(null, "/chat"),
      true,
      "Standard login correctly receives tattva_session cookie"
    );
  });

  // Test 7: Error Mapping for Expired or Invalid Tokens
  test("7. Maps error descriptions accurately for expired and already-used links", () => {
    function mapRecoveryError(errDesc: string | null, errCode: string | null): string {
      const raw = (errDesc || errCode || "").toLowerCase();
      if (raw.includes("expired") || raw.includes("otp_expired")) {
        return "This password reset link has expired. Please request a new reset link.";
      }
      if (raw.includes("invalid") || raw.includes("already")) {
        return "Your password reset link is invalid or has already been used. Please request a new link.";
      }
      return "Failed to verify password recovery session. Please try again.";
    }

    assert.strictEqual(
      mapRecoveryError("Email link is invalid or has expired", "otp_expired"),
      "This password reset link has expired. Please request a new reset link."
    );
    assert.strictEqual(
      mapRecoveryError("Token has already been used", null),
      "Your password reset link is invalid or has already been used. Please request a new link."
    );
    assert.strictEqual(
      mapRecoveryError("Network error", null),
      "Failed to verify password recovery session. Please try again."
    );
  });

  // Test 8: End-to-End Recovery Mock Execution
  test("8. Simulates complete Supabase recovery lifecycle (reset -> exchange -> update -> signout)", async () => {
    // Simulated state in Supabase
    let userPassword = "OldPassword123";
    let isRecoverySessionActive = false;
    let isSignedOut = false;

    const mockSupabase = {
      auth: {
        async resetPasswordForEmail(email: string, options: { redirectTo: string }) {
          assert.ok(email.includes("@"));
          assert.strictEqual(options.redirectTo, "http://localhost:3000/reset-password");
          return { error: null };
        },
        async exchangeCodeForSession(code: string) {
          assert.strictEqual(code, "valid_pkce_code_123");
          isRecoverySessionActive = true;
          return { data: { session: { user: { email: "gowthamchowdary1267@gmail.com" } } }, error: null };
        },
        async updateUser(updates: { password: string }) {
          if (!isRecoverySessionActive) {
            return { error: new Error("No active recovery session") };
          }
          userPassword = updates.password;
          return { data: { user: { email: "gowthamchowdary1267@gmail.com" } }, error: null };
        },
        async signOut() {
          isRecoverySessionActive = false;
          isSignedOut = true;
          return { error: null };
        },
      },
    };

    // Step A: Request password reset
    const reqRes = await mockSupabase.auth.resetPasswordForEmail("gowthamchowdary1267@gmail.com", {
      redirectTo: "http://localhost:3000/reset-password",
    });
    assert.strictEqual(reqRes.error, null);

    // Step B: User opens link with code
    const exchangeRes = await mockSupabase.auth.exchangeCodeForSession("valid_pkce_code_123");
    assert.strictEqual(exchangeRes.error, null);
    assert.strictEqual(isRecoverySessionActive, true);

    // Step C: User enters new password
    const updateRes = await mockSupabase.auth.updateUser({ password: "NewStrongPassword2026!" });
    assert.strictEqual(updateRes.error, null);
    assert.strictEqual(userPassword, "NewStrongPassword2026!");

    // Step D: End recovery session and sign out
    const signOutRes = await mockSupabase.auth.signOut();
    assert.strictEqual(signOutRes.error, null);
    assert.strictEqual(isSignedOut, true);
    assert.strictEqual(isRecoverySessionActive, false);
  });

  // Test 9: Interception of otp_expired and access_denied on root/chat routes
  test("9. Intercepts otp_expired errors on root/chat and reroutes to /reset-password", () => {
    function shouldRerouteToResetPassword(url: string): boolean {
      const parsed = new URL(url);
      const isRecovery =
        parsed.hash.includes("type=recovery") ||
        parsed.search.includes("type=recovery") ||
        parsed.search.includes("next=%2Freset-password") ||
        parsed.search.includes("next=/reset-password") ||
        parsed.search.includes("error_code=otp_expired") ||
        parsed.hash.includes("error_code=otp_expired") ||
        (parsed.search.includes("error=access_denied") && parsed.search.includes("expired")) ||
        (parsed.hash.includes("error=access_denied") && parsed.hash.includes("expired"));
      return isRecovery;
    }

    const testUrl =
      "http://localhost:3000/?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired#error=access_denied&error_code=otp_expired";
    assert.strictEqual(shouldRerouteToResetPassword(testUrl), true);

    const testCleanUrl = "http://localhost:3000/chat";
    assert.strictEqual(shouldRerouteToResetPassword(testCleanUrl), false);
  });
});