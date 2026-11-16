import assert from "node:assert/strict";
import { generateWithProvider, ImageProviderError } from "../app/lib/image-engine/providers";

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
  // Azure OpenAI is deactivated in favor of exclusive Cloudflare Workers AI
  await assert.rejects(
    () => generateWithProvider("azure-openai", request),
    (error: unknown) =>
      error instanceof ImageProviderError &&
      !error.retryable &&
      error.message.includes("deactivated") &&
      error.message.includes("Cloudflare Workers AI")
  );
  console.log("Azure OpenAI provider deactivation tests passed.");
}

if (process.argv[1]?.includes("azure-openai-provider.test")) {
  runAzureOpenAIProviderTests().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
