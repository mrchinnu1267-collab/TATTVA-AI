import assert from "node:assert/strict";
import { clearCooldowns, generateWithProvider, ImageProviderError } from "../app/lib/image-engine/providers";

const request = {
  prompt: "A test image",
  negativePrompt: "",
  width: 1024,
  height: 1792,
  steps: 28,
  guidance: 7,
  seed: 42,
  aspectRatio: "9:16" as const,
  quality: "max" as const,
};

export async function runAzureOpenAIProviderTests(): Promise<void> {
  const envKeys = [
    "AZURE_OPENAI_ENDPOINT",
    "AZURE_OPENAI_API_KEY",
    "AZURE_OPENAI_IMAGE_DEPLOYMENT",
    "AZURE_OPENAI_API_VERSION",
  ] as const;
  const previousEnv = new Map(envKeys.map((key) => [key, process.env[key]]));
  const previousFetch = globalThis.fetch;

  try {
    for (const key of envKeys) delete process.env[key];
    await assert.rejects(
      () => generateWithProvider("azure-openai", request),
      (error: unknown) =>
        error instanceof ImageProviderError &&
        !error.retryable &&
        error.message.includes("AZURE_OPENAI_ENDPOINT")
    );

    process.env.AZURE_OPENAI_ENDPOINT = "https://example.openai.azure.com";
    process.env.AZURE_OPENAI_API_KEY = "test-key";
    process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT = "image-deployment";
    process.env.AZURE_OPENAI_API_VERSION = "2024-02-01";

    let capturedUrl = "";
    let capturedHeaders: Headers | undefined;
    let capturedBody: Record<string, unknown> | undefined;
    globalThis.fetch = async (input, init) => {
      capturedUrl = String(input);
      capturedHeaders = new Headers(init?.headers);
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({ data: [{ b64_json: Buffer.from("test-image").toString("base64") }] }),
        { headers: { "content-type": "application/json" } }
      );
    };

    const result = await generateWithProvider("azure-openai", request);
    const requestUrl = new URL(capturedUrl);
    assert.equal(requestUrl.origin, "https://example.openai.azure.com");
    assert.equal(requestUrl.pathname, "/openai/deployments/image-deployment/images/generations");
    assert.equal(requestUrl.searchParams.get("api-version"), "2024-02-01");
    assert.equal(capturedHeaders?.get("api-key"), "test-key");
    assert.deepEqual(capturedBody, {
      prompt: "A test image",
      n: 1,
      size: "1024x1792",
      quality: "hd",
    });
    assert.equal(result.provider, "azure-openai");
    assert.equal(result.width, 1024);
    assert.equal(result.height, 1792);
    assert.ok(result.image.startsWith("data:image/png;base64,"));

    let downloadCount = 0;
    globalThis.fetch = async (input, init) => {
      downloadCount += 1;
      if (init?.method === "POST") {
        return new Response(
          JSON.stringify({ data: [{ url: "https://images.example.com/generated.png" }] }),
          { headers: { "content-type": "application/json" } }
        );
      }
      assert.equal(String(input), "https://images.example.com/generated.png");
      return new Response(Buffer.from("downloaded-image"), {
        headers: { "content-type": "image/png" },
      });
    };

    const urlResult = await generateWithProvider("azure-openai", request);
    assert.equal(downloadCount, 2);
    assert.ok(urlResult.image.startsWith("data:image/png;base64,"));
    console.log("Azure OpenAI provider integration tests passed.");
  } finally {
    globalThis.fetch = previousFetch;
    clearCooldowns();
    for (const key of envKeys) {
      const value = previousEnv.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

if (process.argv[1]?.includes("azure-openai-provider.test")) {
  runAzureOpenAIProviderTests().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
