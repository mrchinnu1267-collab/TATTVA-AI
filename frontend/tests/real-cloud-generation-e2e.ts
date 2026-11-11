import assert from "node:assert";
import { generateImage } from "../app/lib/image-engine";

async function main() {
  console.log("\n🎨 Executing Real End-to-End Image Generation Integration Test...\n");

  const prompt = "A high-resolution 3D digital render of Doraemon the robotic cat";
  console.log(`Prompt: "${prompt}"`);
  console.log("Calling generateImage({ prompt, verify: false, quality: 'fast' })...");

  const started = Date.now();
  try {
    const result = await generateImage({
      prompt,
      verify: false,
      quality: "fast",
    });

    const elapsed = ((Date.now() - started) / 1000).toFixed(2);
    console.log(`\n🎉 Generation Succeeded in ${elapsed}s!`);
    console.log(`- Provider: ${result.provider}`);
    console.log(`- Model: ${result.model}`);
    console.log(`- Seed: ${result.seed}`);
    console.log(`- Dimensions: ${result.metadata.width}x${result.metadata.height}`);
    console.log(`- Image format: ${result.image.slice(0, 30)}...`);
    console.log(`- Total data URI length: ${result.image.length} characters`);

    assert.ok(result.image.startsWith("data:image/"), "Output must be a valid data URI");
    assert.ok(result.image.length > 50_000, "Image data size should be non-trivial (>50KB)");
    assert.ok(result.provider, "Provider must be identified");

    console.log("\n✅ Real Image Generation Test Verified Successfully!\n");
    process.exit(0);
  } catch (err: any) {
    console.error("\n❌ Real Image Generation Test Failed:", err.message);
    process.exit(1);
  }
}

main();

