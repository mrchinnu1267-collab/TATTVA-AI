import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateCloudflareUsage,
  getCloudflareCredentials,
  isCloudflareConfigured,
  testCloudflareWorkersAi,
  generateWithCloudflare,
  resolveCloudflareSteps,
  CLOUDFLARE_FLUX_MODEL,
} from "../app/lib/image-engine/cloudflare/cloudflare-adapter";
import { resolveProviderOrder } from "../app/lib/image-engine/providers";

describe("Cloudflare Workers AI - FLUX.1 Schnell Provider Audit", () => {
  it("should have correct official model identifier", () => {
    assert.equal(CLOUDFLARE_FLUX_MODEL, "@cf/black-forest-labs/flux-1-schnell");
  });

  it("should calculate exact neuron usage according to Cloudflare pricing specification", () => {
    // 512x512 with 4 steps: 1 tile (4.8 N) + 4 steps * 1 tile * 9.6 N (38.4 N) = 43.2 Neurons
    const usage512 = calculateCloudflareUsage(512, 512, 4);
    assert.equal(usage512.tiles, 1);
    assert.equal(usage512.steps, 4);
    assert.equal(usage512.estimatedNeurons, 43.2);

    // 1024x1024 with 4 steps: 4 tiles (19.2 N) + 4 steps * 4 tiles * 9.6 N (153.6 N) = 172.8 Neurons
    const usage1024 = calculateCloudflareUsage(1024, 1024, 4);
    assert.equal(usage1024.tiles, 4);
    assert.equal(usage1024.steps, 4);
    assert.equal(usage1024.estimatedNeurons, 172.8);

    // 1024x1024 with 6 steps: 4 tiles (19.2 N) + 6 steps * 4 tiles * 9.6 N (230.4 N) = 249.6 Neurons
    const usage1024_6 = calculateCloudflareUsage(1024, 1024, 6);
    assert.equal(usage1024_6.tiles, 4);
    assert.equal(usage1024_6.steps, 6);
    assert.equal(usage1024_6.estimatedNeurons, 249.6);
  });

  it("maps Image Studio quality to supported step counts", () => {
    assert.equal(resolveCloudflareSteps("fast"), 1);
    assert.equal(resolveCloudflareSteps("balanced"), 4);
    assert.equal(resolveCloudflareSteps("max"), 8);
  });

  it("uses Cloudflare only when explicitly selected", () => {
    assert.ok(!resolveProviderOrder("auto", "fast").includes("cloudflare"));
    assert.deepEqual(resolveProviderOrder("cloudflare", "balanced"), ["cloudflare"]);
  });

  it("sends only the official prompt and steps fields to the Workers AI endpoint", async () => {
    const previousFetch = globalThis.fetch;
    const previousAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const previousApiToken = process.env.CLOUDFLARE_API_TOKEN;
    let capturedUrl = "";
    let capturedPayload: unknown;

    process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
    process.env.CLOUDFLARE_API_TOKEN = "test-token";
    globalThis.fetch = async (input, init) => {
      capturedUrl = String(input);
      capturedPayload = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({ success: true, result: { image: Buffer.from("image").toString("base64") } }),
        { headers: { "content-type": "application/json" } }
      );
    };

    try {
      const result = await generateWithCloudflare({
        prompt: "A test landscape",
        negativePrompt: "ignored by provider",
        width: 1024,
        height: 1024,
        steps: 28,
        guidance: 7,
        seed: 42,
        aspectRatio: "1:1",
        quality: "balanced",
      });

      assert.equal(
        capturedUrl,
        `https://api.cloudflare.com/client/v4/accounts/test-account/ai/run/${CLOUDFLARE_FLUX_MODEL}`
      );
      assert.deepEqual(capturedPayload, { prompt: "A test landscape", steps: 4 });
      assert.equal(result.provider, "cloudflare");
      assert.ok(result.image.startsWith("data:image/jpeg;base64,"));
    } finally {
      globalThis.fetch = previousFetch;
      if (previousAccountId === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID;
      else process.env.CLOUDFLARE_ACCOUNT_ID = previousAccountId;
      if (previousApiToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
      else process.env.CLOUDFLARE_API_TOKEN = previousApiToken;
    }
  });

  it("should debunk the '230 images per day' myth for standard 1024x1024 generations", () => {
    const dailyFreeNeurons = 10000;
    const usage1024 = calculateCloudflareUsage(1024, 1024, 4);
    const max1024Images = Math.floor(dailyFreeNeurons / usage1024.estimatedNeurons);

    // At 1024x1024 4 steps, max images is ~57, NOT 230!
    assert.equal(max1024Images, 57);
    assert.ok(max1024Images < 230, "Standard 1024x1024 cannot generate 230 images/day under 10k neurons");

    // Only 512x512 single-tile images yield 231 images/day
    const usage512 = calculateCloudflareUsage(512, 512, 4);
    const max512Images = Math.floor(dailyFreeNeurons / usage512.estimatedNeurons);
    assert.equal(max512Images, 231);
  });

  it("should safely detect missing credentials without runtime crash", async () => {
    const configured = isCloudflareConfigured();
    const creds = getCloudflareCredentials();

    if (!configured) {
      assert.equal(creds, null);
      const testResult = await testCloudflareWorkersAi("Test prompt");
      assert.equal(testResult.configured, false);
      assert.equal(testResult.authenticated, false);
      assert.equal(testResult.generationSuccess, false);
      assert.ok(testResult.error?.includes("Missing CLOUDFLARE_ACCOUNT_ID"));
    } else {
      assert.ok(creds?.accountId);
      assert.ok(creds?.apiToken);
    }
  });
});
