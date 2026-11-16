/**
 * TATTVA AI - Output Routing & Generation Intent Verification Test Suite
 * Validates accurate classification and dispatch between Image Generation Engine
 * (Cloudflare FLUX.1 Schnell + Gemini Vision) and Document Generation Engine (PPTX/XLSX/DOCX).
 */

import assert from "node:assert/strict";
import { detectDocumentIntent } from "../app/lib/document-engine/intent";
import { classifyIntent } from "../app/lib/ai-orchestrator/intent-classifier";
import { aiOrchestrator } from "../app/lib/ai-orchestrator";

export async function runOutputRoutingTests() {
  console.log("\n================================================================================");
  console.log("🎯 TATTVA AI - OUTPUT ROUTING & INTENT DISPATCH VERIFICATION SUITE");
  console.log("================================================================================\n");

  // ===========================================================================
  // TEST GROUP 1: IMAGE GENERATION INTENT DETECTION (Poster, Banner, Flyer, Logo, Wallpaper, Illustration, Image)
  // ===========================================================================
  console.log("▶ [TEST 1] Verifying visual requests route to Image Generation Engine (NOT Document Engine)...");

  const visualQueries = [
    { prompt: "Create a poster for Vignan Mahotsav", term: "poster" },
    { prompt: "Design an event poster for the annual tech fest", term: "event poster" },
    { prompt: "Design a banner for AI Summit 2026", term: "banner" },
    { prompt: "Make a promotional flyer for the indie music fest", term: "flyer" },
    { prompt: "Create a minimalist vector logo for a coffee shop", term: "logo" },
    { prompt: "Generate an illustration of a cybernetic dragon in a neon alley", term: "illustration" },
    { prompt: "Generate a 4k wallpaper of cosmic nebulas and auroras", term: "wallpaper" },
    { prompt: "Generate an image of a golden retriever playing in autumn leaves", term: "image" },
    { prompt: "Draw a digital painting of a serene Japanese garden", term: "drawing/painting" },
    { prompt: "Create a photo of an astronaut on Mars looking at Earth", term: "photo" },
  ];

  for (const { prompt, term } of visualQueries) {
    // 1. Document intent must NOT hijack pure image/visual requests
    const docIntent = detectDocumentIntent(prompt, { history: [], hasAttachments: false });
    assert.equal(
      docIntent.isDocumentRequest,
      false,
      `Expected prompt "${prompt}" containing "${term}" to NOT be detected as document request (got isDocumentRequest: ${docIntent.isDocumentRequest})`
    );

    // 2. Intent classifier must accurately identify primaryIntent as "image_generation"
    const classified = await classifyIntent(prompt, false, false);
    assert.equal(
      classified.primaryIntent,
      "image_generation",
      `Expected prompt "${prompt}" containing "${term}" to have primaryIntent "image_generation" (got: ${classified.primaryIntent})`
    );
    console.log(`  ✓ "${prompt}" -> image_generation (Document Engine bypassed)`);
  }

  // ===========================================================================
  // TEST GROUP 2: EXPLICIT PRESENTATION (PPTX) INTENT ROUTING
  // ===========================================================================
  console.log("\n▶ [TEST 2] Verifying explicit presentation requests generate PPTX slides...");

  const presentationQueries = [
    { prompt: "Create a 5 slide presentation on Quantum Computing", expectedFormat: "pptx" },
    { prompt: "Prepare a PowerPoint on Renewable Energy Innovations", expectedFormat: "pptx" },
    { prompt: "Create a slide deck about Transformer Architecture", expectedFormat: "pptx" },
    { prompt: "Generate 8 slides on Space Exploration History", expectedFormat: "pptx" },
  ];

  for (const { prompt, expectedFormat } of presentationQueries) {
    const docIntent = detectDocumentIntent(prompt, { history: [], hasAttachments: false });
    assert.equal(
      docIntent.isDocumentRequest,
      true,
      `Expected "${prompt}" to be detected as document request`
    );
    assert.equal(
      docIntent.archetype,
      "presentation",
      `Expected archetype "presentation" for "${prompt}" (got: ${docIntent.archetype})`
    );
    assert.equal(
      docIntent.format,
      expectedFormat,
      `Expected format "${expectedFormat}" for "${prompt}" (got: ${docIntent.format})`
    );
    console.log(`  ✓ "${prompt}" -> Presentation [format: ${docIntent.format}, archetype: ${docIntent.archetype}]`);
  }

  // ===========================================================================
  // TEST GROUP 3: OTHER DOCUMENT FORMATS (Spreadsheets XLSX, Research Reports DOCX)
  // ===========================================================================
  console.log("\n▶ [TEST 3] Verifying document engine preserves spreadsheets and Word docs...");

  const otherDocQueries = [
    { prompt: "Generate an Excel budget sheet for marketing expenses", expectedArchetype: "spreadsheet", expectedFormat: "xlsx" },
    { prompt: "Create a spreadsheet tracking daily team tasks", expectedArchetype: "spreadsheet", expectedFormat: "xlsx" },
    { prompt: "Write a research report on Deep Sea Oceanography in Word", expectedArchetype: "research_report", expectedFormat: "docx" },
    { prompt: "Create a Word document analyzing quarterly revenue", expectedArchetype: "research_report", expectedFormat: "docx" },
  ];

  for (const { prompt, expectedArchetype, expectedFormat } of otherDocQueries) {
    const docIntent = detectDocumentIntent(prompt, { history: [], hasAttachments: false });
    assert.equal(
      docIntent.isDocumentRequest,
      true,
      `Expected "${prompt}" to be detected as document request`
    );
    assert.equal(
      docIntent.archetype,
      expectedArchetype,
      `Expected archetype "${expectedArchetype}" for "${prompt}" (got: ${docIntent.archetype})`
    );
    assert.equal(
      docIntent.format,
      expectedFormat,
      `Expected format "${expectedFormat}" for "${prompt}" (got: ${docIntent.format})`
    );
    console.log(`  ✓ "${prompt}" -> [format: ${docIntent.format}, archetype: ${docIntent.archetype}]`);
  }

  // ===========================================================================
  // TEST GROUP 4: DISAMBIGUATION (Presentation about posters / banners)
  // ===========================================================================
  console.log("\n▶ [TEST 4] Verifying explicit slides/presentation override visual terms...");

  const disambiguationQueries = [
    { prompt: "Create a 5 slide presentation on poster design history", expectedFormat: "pptx" },
    { prompt: "Prepare a PowerPoint on digital banner advertising strategy", expectedFormat: "pptx" },
    { prompt: "Give me slides about brand logo evolution", expectedFormat: "pptx" },
  ];

  for (const { prompt, expectedFormat } of disambiguationQueries) {
    const docIntent = detectDocumentIntent(prompt, { history: [], hasAttachments: false });
    assert.equal(
      docIntent.isDocumentRequest,
      true,
      `Expected presentation query "${prompt}" to be document request`
    );
    assert.equal(
      docIntent.format,
      expectedFormat,
      `Expected format "${expectedFormat}" for "${prompt}" (got: ${docIntent.format})`
    );
    console.log(`  ✓ "${prompt}" -> Correctly resolved to Presentation (${docIntent.format})`);
  }

  // ===========================================================================
  // TEST GROUP 5: END-TO-END ORCHESTRATOR DISPATCH (Poster -> Image, Not PPTX)
  // ===========================================================================
  console.log("\n▶ [TEST 5] Testing End-to-End Orchestrator Dispatch for 'Create a poster for Vignan Mahotsav'...");

  // Mock server environment variables for test execution if needed
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    process.env.CLOUDFLARE_API_TOKEN = "mock_cf_token_for_routing_test";
  }
  if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
    process.env.CLOUDFLARE_ACCOUNT_ID = "mock_cf_account_for_routing_test";
  }

  // Intercept fetch to mock Cloudflare Workers AI and Gemini Vision without external network dependencies
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    // Mock Cloudflare Workers AI FLUX.1 Schnell response
    if (urlStr.includes("api.cloudflare.com") && urlStr.includes("@cf/black-forest-labs/flux-1-schnell")) {
      const mockImageBuffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );
      return new Response(mockImageBuffer, {
        status: 200,
        headers: { "Content-Type": "image/png" },
      });
    }

    // Mock Gemini API responses for verification or fallback
    if (urlStr.includes("generativelanguage.googleapis.com")) {
      const mockGeminiBody = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    score: 96,
                    verdict: "pass",
                    categoryScores: {
                      main_subject: 98,
                      object_presence: 96,
                      object_count: 95,
                      color_accuracy: 94,
                      spatial_accuracy: 95,
                      background_accuracy: 96,
                      style_accuracy: 98,
                      text_accuracy: 96,
                    },
                    identifiedFeatures: ["Vignan Mahotsav poster layout", "festival graphics"],
                    issues: [],
                    suggestedFix: "",
                  }),
                },
              ],
            },
          },
        ],
      };
      return new Response(JSON.stringify(mockGeminiBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return originalFetch(input, init);
  };

  try {
    const posterResponse = await aiOrchestrator.processRequest({
      context: {
        userId: "test_user_routing",
      },
      messages: [
        {
          role: "user",
          content: "Create a poster for Vignan Mahotsav",
        },
      ],
    });

    // Verify critical assertions:
    // 1. Kind must be "image", NOT "text" with PPTX attachment!
    assert.equal(posterResponse.kind, "image", `Expected kind to be "image", got "${posterResponse.kind}"`);

    // 2. Must NOT have any PPTX attachment!
    const hasPptxAttachment = (posterResponse.attachments || []).some((att) =>
      att.name.endsWith(".pptx")
    );
    assert.equal(hasPptxAttachment, false, "Response must NOT have a PPTX attachment!");
    assert.equal(Boolean((posterResponse as any).generatedDocument), false, "Response must NOT produce a generatedDocument PPTX!");

    // 3. Must return an actual PNG or JPG image data URI!
    assert.ok(posterResponse.image, "Response must include generated image data URI");
    assert.ok(
      posterResponse.image.startsWith("data:image/png;base64,") ||
      posterResponse.image.startsWith("data:image/jpeg;base64,") ||
      posterResponse.image.startsWith("http"),
      "Response image must be valid image data URI or URL"
    );

    // 4. Must use Cloudflare provider and FLUX.1 Schnell model!
    assert.equal(posterResponse.provider, "cloudflare", `Expected provider "cloudflare", got "${posterResponse.provider}"`);
    assert.equal(posterResponse.modelUsed, "@cf/black-forest-labs/flux-1-schnell", `Expected FLUX.1 Schnell model, got "${posterResponse.modelUsed}"`);

    console.log("  ✓ End-to-End Dispatch successfully generated PNG image via Cloudflare FLUX.1 Schnell!");
    console.log(`  ✓ Response kind: "${posterResponse.kind}", provider: "${posterResponse.provider}", model: "${posterResponse.modelUsed}"`);
    console.log(`  ✓ Image payload: ${posterResponse.image.slice(0, 45)}... (zero PPTX generated)`);
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log("\n================================================================================");
  console.log("🎉 ALL OUTPUT ROUTING & INTENT DISPATCH TESTS PASSED SUCCESSFULLY!");
  console.log("================================================================================\n");
}

if (process.argv[1]?.includes("output-routing-intent.test.ts")) {
  runOutputRoutingTests().catch((err) => {
    console.error("❌ Output routing test suite failed:", err);
    process.exit(1);
  });
}
