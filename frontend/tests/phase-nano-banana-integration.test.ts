import { describe, it } from "node:test";
import assert from "node:assert";
import { SUPPORTED_MODELS } from "../app/lib/image-engine/multi-model-router/model-registry";
import { PROVIDER_CAPABILITIES } from "../app/lib/image-engine/provider-capabilities";
import { PROVIDER_REFERENCE_CAPABILITIES } from "../app/lib/image-engine/reference-conditioning/capabilities";
import { EDITING_PROVIDER_CAPABILITIES } from "../app/lib/image-engine/editing/editing-router";
import { routeImageRequest } from "../app/lib/image-engine/multi-model-router/intelligent-router";
import { resolveProviderOrder, getProviderStatuses } from "../app/lib/image-engine/providers";
import { compilePrompt } from "../app/lib/image-engine/prompt-compiler";

describe("Nano Banana Image Engine Integration", () => {
  it("should have Nano Banana registered in the model registry", () => {
    const nanoBanana = SUPPORTED_MODELS["nano-banana"];
    assert.ok(nanoBanana, "nano-banana should exist in SUPPORTED_MODELS");
    assert.strictEqual(nanoBanana.providerId, "nano-banana");
    assert.strictEqual(nanoBanana.family, "gemini");
    assert.strictEqual(nanoBanana.exactModelIdentifier, "gemini-2.5-flash-image");
    assert.strictEqual(nanoBanana.supportsReferenceImage, true);
    assert.strictEqual(nanoBanana.supportsTextToImage, true);
    assert.strictEqual(nanoBanana.supportsInpainting, true);
    assert.strictEqual(nanoBanana.supportsOutpainting, true);
    assert.strictEqual(nanoBanana.maxResolution.width, 2048);
  });

  it("should have complete Provider Capabilities for nano-banana", () => {
    const caps = PROVIDER_CAPABILITIES["nano-banana"];
    assert.ok(caps, "PROVIDER_CAPABILITIES should include nano-banana");
    assert.strictEqual(caps.supportsTextToImage, true);
    assert.strictEqual(caps.supportsReferenceImage, true);
    assert.strictEqual(caps.supportsImageEditing, true);
    assert.strictEqual(caps.supportsInpainting, true);
    assert.strictEqual(caps.supportsOutpainting, true);
    assert.strictEqual(caps.maxResolution, 2048);
  });

  it("should support reference conditioning in PROVIDER_REFERENCE_CAPABILITIES", () => {
    const refCaps = PROVIDER_REFERENCE_CAPABILITIES["nano-banana"];
    assert.ok(refCaps, "PROVIDER_REFERENCE_CAPABILITIES should include nano-banana");
    assert.strictEqual(refCaps.supportsReferenceImage, true);
    assert.strictEqual(refCaps.maxResolution, 2048);
    assert.ok(refCaps.supportedFormats.includes("png"));
    assert.ok(refCaps.supportedFormats.includes("jpeg"));
  });

  it("should support surgical editing in EDITING_PROVIDER_CAPABILITIES", () => {
    const editCaps = EDITING_PROVIDER_CAPABILITIES["nano-banana"];
    assert.ok(editCaps, "EDITING_PROVIDER_CAPABILITIES should include nano-banana");
    assert.strictEqual(editCaps.supportsInpainting, true);
    assert.strictEqual(editCaps.supportsMaskInput, true);
    assert.strictEqual(editCaps.supportsOutpainting, true);
    assert.strictEqual(editCaps.supportsBackgroundRemoval, true);
  });

  it("should route explicitly to nano-banana when preferredProvider is nano-banana", () => {
    const decision = routeImageRequest({
      prompt: "A futuristic electric supercar on a mountain pass",
      preferredProvider: "nano-banana",
    });
    assert.strictEqual(decision.primaryModel.providerId, "nano-banana");
    assert.ok(decision.fallbackChain.includes("nano-banana"));
  });

  it("should prioritize nano-banana in resolveProviderOrder when reference image is supplied", () => {
    const order = resolveProviderOrder(undefined, "balanced", true);
    assert.strictEqual(order[0], "nano-banana");
  });

  it("should compile architecture-specific prompt for nano-banana", () => {
    const compiled = compilePrompt({
      prompt: "A detailed portrait of a cyberpunk detective in neon rain",
      provider: "nano-banana",
    });
    assert.ok(compiled.positive, "Should compile a positive prompt");
  });

  it("should list nano-banana in getProviderStatuses", async () => {
    const statuses = await getProviderStatuses();
    const nanoBanana = statuses.find((s) => s.id === "nano-banana");
    assert.ok(nanoBanana, "nano-banana status must be present");
    assert.strictEqual(nanoBanana.label, "Google Nano Banana 2.1 / Pro");
    assert.strictEqual(nanoBanana.model, "gemini-2.5-flash-image");
  });

  it("should be included in API GET route providers", async () => {
    const { GET } = await import("../app/api/image/route");
    const response = await GET();
    const data = await response.json();
    assert.strictEqual(data.status, "ok");
    const nanoBanana = data.providers.find((p: any) => p.id === "nano-banana");
    assert.ok(nanoBanana, "API /api/image route must list nano-banana");
  });
});
