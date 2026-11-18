import assert from "node:assert";
import { GET as imageRootGet, POST as imageRootPost } from "../app/api/image/route";
import { GET as imageSlugGet, POST as imageSlugPost } from "../app/api/image/[...slug]/route";
import { GET as enhanceGet, POST as enhancePost } from "../app/api/enhance-prompt/route";
import { aiOrchestrator } from "../app/lib/ai-orchestrator";
import { moderateTextPrompt } from "../app/lib/content-moderation";

export async function runImageGenerationRemovalVerificationTests() {
  console.log("\n🧪 Running Image Generation Removal Verification Test Suite...");

  // 1. Verify /api/image Root Returns 404 Retired Response
  {
    const resGet = await imageRootGet();
    const dataGet = await resGet.json();
    assert.strictEqual(resGet.status, 404, "Root GET /api/image must return 404");
    assert.strictEqual(dataGet.retired, true, "Root GET /api/image must return retired: true");

    const resPost = await imageRootPost();
    const dataPost = await resPost.json();
    assert.strictEqual(resPost.status, 404, "Root POST /api/image must return 404");
    assert.strictEqual(dataPost.retired, true, "Root POST /api/image must return retired: true");
    console.log("  ✓ /api/image root endpoint retired with 404");
  }

  // 2. Verify /api/image/[...slug] Retired Catch-All Returns 404
  {
    const resSlugGet = await imageSlugGet();
    const dataSlugGet = await resSlugGet.json();
    assert.strictEqual(resSlugGet.status, 404, "Slug GET /api/image/* must return 404");
    assert.strictEqual(dataSlugGet.retired, true, "Slug GET /api/image/* must return retired: true");

    const resSlugPost = await imageSlugPost();
    const dataSlugPost = await resSlugPost.json();
    assert.strictEqual(resSlugPost.status, 404, "Slug POST /api/image/* must return 404");
    assert.strictEqual(dataSlugPost.retired, true, "Slug POST /api/image/* must return retired: true");
    console.log("  ✓ /api/image/[...slug] subroutes retired with 404");
  }

  // 3. Verify /api/enhance-prompt Retired Endpoint Returns 404
  {
    const resGet = await enhanceGet();
    assert.strictEqual(resGet.status, 404, "/api/enhance-prompt GET must return 404");
    const resPost = await enhancePost();
    assert.strictEqual(resPost.status, 404, "/api/enhance-prompt POST must return 404");
    console.log("  ✓ /api/enhance-prompt retired with 404");
  }

  // 4. Verify AI Orchestrator Retired Capability Message on Image Prompts
  {
    const result = await aiOrchestrator.processRequest({
      messages: [{ role: "user", content: "Generate a realistic picture of an astronaut riding a horse on Mars in 4k" }],
    });

    assert.ok(result.content.includes("permanently retired"), "Orchestrator must explain image generation is retired");
    assert.strictEqual(result.intent, "general_chat", "Orchestrator routes retired intent safely to conversational chat");
    console.log("  ✓ AI Orchestrator correctly handles retired image generation intent with polite notice");
  }

  // 5. Verify Content Moderation Remains Fully Operational Without Image Engine
  {
    const safeCheck = moderateTextPrompt("Write a poem about the sunrise over the mountains");
    assert.strictEqual(safeCheck.isSafe, true, "Safe text prompt must pass moderation");

    const unsafeCheck = moderateTextPrompt("explicit pornographic sexual content with minors");
    assert.strictEqual(unsafeCheck.isSafe, false, "Unsafe text prompt must be blocked");
    console.log("  ✓ Content moderation engine verified operational and decoupled from image engine");
  }

  console.log("🎉 Image Generation Removal Verification passed with 100% compliance!\n");
}
