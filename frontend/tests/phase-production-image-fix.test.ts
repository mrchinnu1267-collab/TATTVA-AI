import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateReferenceImage,
  SUPPORTED_MIME_TYPES,
} from "../app/lib/image-engine/reference-conditioning/validator";
import {
  formatUserFacingImageError,
  sanitizeDiagnosticMessage,
  resolveProviderOrder,
} from "../app/lib/image-engine/providers";
import { resolveReferenceImageAsDataUri } from "../app/lib/image-engine/image-utils";
import { routeImageRequest } from "../app/lib/image-engine/multi-model-router";

describe("Phase Production Image Availability & Fallback Verification", () => {
  it("should validate web URLs without throwing or returning format rejection", () => {
    const webUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c";
    const res = validateReferenceImage(webUrl);
    assert.equal(res.isValid, true);
    assert.equal(res.error, undefined);
  });

  it("should validate standard base64 data URIs", () => {
    const valid128Png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAQMAAAD58POIAAAABlBMVEUAAAD///+l2Z/dAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVRIx+3RsQ0AMAzDwCL5/8wUaIeOBAi6F9k1d120BwAAAAAAAAAA4F8HAAAAAP7gAgz4AGjZ7QW1AAAAAElFTkSuQmCC";
    const res = validateReferenceImage(valid128Png);
    assert.equal(res.isValid, true);
    assert.equal(res.mimeType, "image/png");
  });

  it("should reject completely invalid non-URI strings with clear error", () => {
    const invalid = "not a valid uri or url";
    const res = validateReferenceImage(invalid);
    assert.equal(res.isValid, false);
    assert.ok(res.error);
  });

  it("should sanitize and redact secrets in diagnostic messages", () => {
    const rawBreakdown = "Gemini: AIzaSyD3fakeSecretKey1234567890 quota exceeded; Hugging Face: hf_AbCdEfGhIjKlMnOpQrStUvWxYz123456 timed out; local: http://localhost:8001/generate refused";
    const sanitized = sanitizeDiagnosticMessage(rawBreakdown);

    assert.ok(!sanitized.includes("AIzaSyD3fakeSecretKey1234567890"), "Gemini key must be redacted");
    assert.ok(!sanitized.includes("hf_AbCdEfGhIjKlMnOpQrStUvWxYz123456"), "HF token must be redacted");
    assert.ok(!sanitized.includes("localhost:8001"), "Localhost must be redacted");
    assert.ok(sanitized.includes("[REDACTED_GEMINI_KEY]"));
    assert.ok(sanitized.includes("[REDACTED_HF_TOKEN]"));
    assert.ok(sanitized.includes("[LOCAL_ENDPOINT]"));
  });

  it("should format multi-provider errors with informative diagnostics instead of generic mask", () => {
    const error = new Error("All configured image providers failed: Gemini: HTTP 429 quota exceeded; Hugging Face: timed out after 14s; Pollinations: HTTP 503 busy");
    const formatted = formatUserFacingImageError(error);

    assert.ok(formatted.includes("Image generation failed across configured providers"), "Must provide informative message");
    assert.ok(formatted.includes("Gemini: HTTP 429 quota exceeded"));
    assert.ok(formatted.includes("Hugging Face: timed out after 14s"));
    assert.ok(formatted.includes("Pollinations: HTTP 503 busy"));
    assert.ok(!formatted.includes("All configured image providers are currently unavailable"), "Must not mask with blanket generic error");
  });

  it("should format reference image errors clearly", () => {
    const error = new Error("Reference image validation failed: Invalid image format. Expected a standard data URI.");
    const formatted = formatUserFacingImageError(error);

    assert.ok(formatted.includes("Reference image error"));
    assert.ok(formatted.includes("valid PNG, JPEG, or WebP image"));
    assert.ok(!formatted.includes("All configured image providers are currently unavailable"));
  });

  it("should prioritize fast cloud fallback (pollinations) when routing on Vercel", () => {
    process.env.VERCEL = "1";
    try {
      const decision = routeImageRequest({
        prompt: "Create an image of Doraemon.",
        quality: "fast",
      });
      assert.ok(decision.fallbackChain.length > 0);
      assert.ok(decision.fallbackChain.includes("pollinations"), "Fallback chain must include Pollinations for high availability");
    } finally {
      delete process.env.VERCEL;
    }
  });

  it("should resolve provider order with pollinations prioritized for fast quality", () => {
    const order = resolveProviderOrder(undefined, "fast", false);
    assert.equal(order[0], "gemini");
    assert.equal(order[1], "pollinations");
  });
});
