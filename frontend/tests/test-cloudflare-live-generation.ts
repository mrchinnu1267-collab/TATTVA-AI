import * as dotenv from "dotenv";
import * as path from "node:path";
import * as fs from "node:fs";
import { generateWithCloudflare, calculateCloudflareUsage } from "../app/lib/image-engine/cloudflare/cloudflare-adapter";

// Explicitly load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  console.log("=== TATTVA AI - Live Cloudflare Workers AI FLUX.1 Schnell Test ===");
  const prompt = "A photorealistic studio photograph of a vintage red sports car on a wet asphalt road at dusk with reflection";
  console.log(`Prompt: "${prompt}"`);
  console.log("Resolution: 1024x1024, Steps: 4");

  const usage = calculateCloudflareUsage(1024, 1024, 4);
  console.log(`Estimated Neurons: ${usage.estimatedNeurons} (within 10,000/day free allowance)`);

  const started = Date.now();
  console.log("Sending generation request to Cloudflare Workers AI...");

  try {
    const result = await generateWithCloudflare({
      prompt,
      negativePrompt: "",
      width: 1024,
      height: 1024,
      steps: 4,
      guidance: 3.5,
      seed: 424242,
      aspectRatio: "1:1",
      quality: "balanced",
    });

    const elapsed = Date.now() - started;
    console.log(`Generation successful in ${elapsed}ms (${(elapsed / 1000).toFixed(2)}s)!`);
    console.log(`Provider: ${result.provider}, Model: ${result.model}`);
    console.log(`Data URI length: ${result.image.length} characters`);

    // Verify JPEG Magic Bytes
    const base64Data = result.image.replace(/^data:image\/[a-z]+;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, "base64");
    console.log(`Decoded Image Size: ${(imgBuffer.length / 1024).toFixed(2)} KB (${imgBuffer.length} bytes)`);

    const isJpeg = imgBuffer[0] === 0xff && imgBuffer[1] === 0xd8;
    const isPng = imgBuffer[0] === 0x89 && imgBuffer[1] === 0x50 && imgBuffer[2] === 0x4e && imgBuffer[3] === 0x47;
    console.log(`Valid Image Format: ${isJpeg ? "JPEG" : isPng ? "PNG" : "UNKNOWN"}`);

    // Save test image to disk
    const outputDir = path.resolve(process.cwd(), "public", "generated-tests");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, "cloudflare-flux-test.jpg");
    fs.writeFileSync(outputPath, imgBuffer);
    console.log(`Image saved successfully to: ${outputPath}`);

    console.log("\n=== TEST PASSED: Real Cloudflare Workers AI Image Generated! ===");
  } catch (err: any) {
    console.error("Cloudflare Generation Failed:", err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});

