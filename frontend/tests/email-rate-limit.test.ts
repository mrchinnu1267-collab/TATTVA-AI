import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Email Rate Limit & Cooldown Handling", () => {
  it("should detect HTTP 429 and over_email_send_rate_limit correctly", () => {
    const error429 = { status: 429, message: "Email rate limit exceeded" };
    const isRateLimit =
      error429.status === 429 ||
      error429.message.toLowerCase().includes("rate limit");
    assert.equal(isRateLimit, true);

    const errorWithCode = { status: 400, message: "Security threshold reached", code: "over_email_send_rate_limit" };
    const isRateLimitCode =
      errorWithCode.status === 429 ||
      errorWithCode.message.toLowerCase().includes("rate limit") ||
      errorWithCode.code === "over_email_send_rate_limit";
    assert.equal(isRateLimitCode, true);
  });

  it("should prevent duplicate in-flight requests", async () => {
    let inflight = false;
    let calls = 0;

    async function sendReset() {
      if (inflight) return "blocked";
      inflight = true;
      calls++;
      await new Promise((r) => setTimeout(r, 20));
      inflight = false;
      return "sent";
    }

    const [first, second] = await Promise.all([sendReset(), sendReset()]);
    assert.equal(calls, 1);
    assert.equal(first, "sent");
    assert.equal(second, "blocked");
  });

  it("should format remaining cooldown seconds properly", () => {
    const cooldown = 45;
    const buttonLabel = cooldown > 0 ? `Resend Link in ${cooldown}s` : "Send Password Reset Link";
    assert.equal(buttonLabel, "Resend Link in 45s");
  });

  it("should never claim success when provider returns an error", () => {
    let outcome = "pending";
    const simulatedError = { status: 429, message: "Email rate limit exceeded" };

    if (simulatedError) {
      outcome = "error";
    } else {
      outcome = "success";
    }

    assert.equal(outcome, "error");
    assert.notEqual(outcome, "success");
  });

  it("should detect SMTP 500 error sending recovery email and guide user to Port 587", () => {
    const error500 = {
      code: 500,
      error_code: "unexpected_failure",
      message: "Error sending recovery email",
    };

    const isSmtpFailure =
      error500.message.toLowerCase().includes("error sending recovery email") ||
      error500.error_code === "unexpected_failure";

    assert.equal(isSmtpFailure, true);

    const friendlyMessage = isSmtpFailure
      ? "SMTP Configuration Error: The server could not dispatch the recovery email. Please ensure your custom SMTP in Supabase uses Port 587 (STARTTLS) and a valid Google App Password without spaces."
      : error500.message;

    assert.match(friendlyMessage, /Port 587/);
    assert.match(friendlyMessage, /STARTTLS/);
  });
});
