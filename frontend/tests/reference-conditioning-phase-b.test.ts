/**
 * TATTVA AI - Phase B: Advanced Reference Image Conditioning Test Suite
 * Automated tests for:
 * 1. Reference-image preservation across pipeline and retries
 * 2. Provider fallback with reference image integrity
 * 3. Image-to-image intent classification and strength controls
 * 4. Missing reference images handling
 * 5. Unsupported provider capabilities checks
 * 6. Format, dimension, and file size validation
 * 7. Failed image processing and error safety
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  validateReferenceImage,
  MAX_REFERENCE_IMAGE_SIZE_BYTES,
  MIN_DIMENSION_PX,
  MAX_DIMENSION_PX,
} from "../app/lib/image-engine/reference-conditioning/validator";
import {
  classifyConditioningIntent,
  analyzeReferenceImage,
} from "../app/lib/image-engine/reference-conditioning/analyzer";
import {
  checkProviderReferenceSupport,
  filterCompatibleReferenceProviders,
  PROVIDER_REFERENCE_CAPABILITIES,
} from "../app/lib/image-engine/reference-conditioning/capabilities";
import { createReferenceConditioningPlan } from "../app/lib/image-engine/reference-conditioning";
import { compileImagePrompt } from "../app/lib/image-engine/prompt-compiler";
import { resolveProviderOrder, generateWithProvider, ImageProviderError } from "../app/lib/image-engine/providers";

// 1x1 valid base64 PNG fixture
const VALID_1X1_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

// 128x128 valid base64 PNG fixture
const VALID_128X128_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAQMAAAD58POIAAAABlBMVEUAAAD///+l2Z/dAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVRIx+3RsQ0AMAzDwCL5/8wUaIeOBAi6F9k1d120BwAAAAAAAAAA4F8HAAAAAP7gAgz4AGjZ7QW1AAAAAElFTkSuQmCC";

describe("PHASE B: Advanced Reference Image Conditioning Engine", () => {
  // ===========================================================================
  // 1. Validation & Image Format Sanitizer
  // ===========================================================================
  describe("1. Image Validation & Input Interface", () => {
    test("Accepts valid PNG data URI and parses metadata", () => {
      const res = validateReferenceImage(VALID_128X128_PNG);
      assert.strictEqual(res.isValid, true, "Valid PNG must pass validation");
      assert.strictEqual(res.format, "png");
      assert.strictEqual(res.mimeType, "image/png");
      assert.ok(res.width && res.width >= 64, "Width must be parsed");
      assert.ok(res.height && res.height >= 64, "Height must be parsed");
      assert.ok(res.fileSizeBytes && res.fileSizeBytes > 0, "Size must be computed");
    });

    test("Rejects empty or missing reference image", () => {
      const emptyRes = validateReferenceImage("");
      assert.strictEqual(emptyRes.isValid, false);
      assert.ok(emptyRes.error?.includes("cannot be empty"));

      const nullRes = validateReferenceImage(null as any);
      assert.strictEqual(nullRes.isValid, false);
    });

    test("Rejects invalid / malformed data URI format", () => {
      const malformedRes = validateReferenceImage("not-a-valid-data-uri-string");
      assert.strictEqual(malformedRes.isValid, false);
      assert.ok(malformedRes.error?.includes("Expected a standard data URI"));
    });

    test("Rejects unsupported mime types (e.g. BMP, SVG, TIFF, plain text)", () => {
      const bmpUri = "data:image/bmp;base64,Qk0AAAAAAAAAAAA...";
      const res = validateReferenceImage(bmpUri);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.error?.includes("Unsupported image format"));
    });

    test("Rejects image exceeding 15MB file size limit", () => {
      // Simulate base64 string larger than 15MB
      const hugeBase64 = "A".repeat(Math.ceil((16 * 1024 * 1024 * 4) / 3));
      const hugeUri = `data:image/png;base64,${hugeBase64}`;
      const res = validateReferenceImage(hugeUri);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.error?.includes("exceeds maximum allowed limit of 15 MB"));
    });

    test("Rejects image with dimensions below 64px", () => {
      // 1x1 image is below the 64px limit
      const res = validateReferenceImage(VALID_1X1_PNG);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.error?.includes("below minimum supported resolution of 64x64"));
    });
  });

  // ===========================================================================
  // 2. Reference Image Analysis & User Instruction Intents
  // ===========================================================================
  describe("2. Intent Classification & Strength Controls", () => {
    test('Classifies "Keep the same character" and sets appropriate strength (0.70)', () => {
      const intent = classifyConditioningIntent("Keep the same character and place him in a snow covered mountain");
      assert.strictEqual(intent.intentType, "keep_character");
      assert.strictEqual(intent.recommendedStrength, 0.70);
      assert.ok(intent.preservationDirectives.some((d) => d.toLowerCase().includes("identity") || d.toLowerCase().includes("facial")));
      assert.ok(intent.lockedEntities.includes("primary character"));
    });

    test('Classifies "Change only the background" and sets background strength (0.80)', () => {
      const intent = classifyConditioningIntent("Change only the background to a tropical beach at sunset");
      assert.strictEqual(intent.intentType, "change_background");
      assert.strictEqual(intent.recommendedStrength, 0.80);
      assert.ok(intent.lockedEntities.includes("foreground subject"));
      assert.ok(intent.targetModifications.includes("background environment"));
    });

    test('Classifies "Preserve the original composition" and sets composition strength (0.65)', () => {
      const intent = classifyConditioningIntent("Preserve the original composition and framing, but change style to cyberpunk");
      assert.strictEqual(intent.intentType, "preserve_composition");
      assert.strictEqual(intent.recommendedStrength, 0.65);
      assert.ok(intent.lockedEntities.includes("camera perspective"));
    });

    test('Classifies "Change the clothing color" and sets targeted strength (0.75)', () => {
      const intent = classifyConditioningIntent("Change the clothing color to deep sapphire blue while keeping everything else");
      assert.strictEqual(intent.intentType, "change_color");
      assert.strictEqual(intent.recommendedStrength, 0.75);
      assert.ok(intent.targetModifications.includes("garment color"));
    });

    test('Classifies "Add an object without modifying existing subjects" and sets strength (0.60)', () => {
      const intent = classifyConditioningIntent("Add a silver trophy on the desk without modifying existing subjects");
      assert.strictEqual(intent.intentType, "add_object");
      assert.strictEqual(intent.recommendedStrength, 0.60);
      assert.ok(intent.lockedEntities.includes("existing subjects"));
    });

    test('Classifies style transfer instruction', () => {
      const intent = classifyConditioningIntent("In the style of an expressive oil painting with visible brushstrokes");
      assert.strictEqual(intent.intentType, "style_transfer");
      assert.strictEqual(intent.recommendedStrength, 0.65);
    });
  });

  // ===========================================================================
  // 3. Provider Capabilities & Fallback Protection
  // ===========================================================================
  describe("3. Provider Capability Checks & Anti-Discard Protection", () => {
    test("Accurately identifies supported and unsupported reference providers", () => {
      const geminiCap = checkProviderReferenceSupport("gemini");
      assert.strictEqual(geminiCap.supportsReferenceImage, true);
      assert.strictEqual(geminiCap.supportsStrength, false);

      const localCap = checkProviderReferenceSupport("local");
      assert.strictEqual(localCap.supportsReferenceImage, true);
      assert.strictEqual(localCap.supportsStrength, true);

      const hfCap = checkProviderReferenceSupport("huggingface");
      assert.strictEqual(hfCap.supportsReferenceImage, true);
      assert.strictEqual(hfCap.supportsStrength, true);

      const openaiCap = checkProviderReferenceSupport("openai");
      assert.strictEqual(openaiCap.supportsReferenceImage, false, "OpenAI DALL-E 3 must be marked unsupported for reference images");
    });

    test("Filters out incompatible providers so reference image is NEVER silently discarded", () => {
      const order = ["huggingface", "gemini", "openai", "local"] as const;
      const { compatibleProviders, incompatibleProviders, warningMessage } = filterCompatibleReferenceProviders(
        [...order],
        true
      );

      assert.ok(!compatibleProviders.includes("openai"), "OpenAI must be filtered out for reference-conditioned requests");
      assert.ok(compatibleProviders.includes("huggingface"), "Hugging Face must be retained");
      assert.ok(compatibleProviders.includes("gemini"), "Gemini must be retained");
      assert.ok(compatibleProviders.includes("local"), "Local engine must be retained");
      assert.ok(incompatibleProviders.includes("openai"), "OpenAI must be flagged in incompatible providers");
      assert.ok(warningMessage?.includes("Never silently discarding reference image"));
    });

    test("OpenAI generator throws explicit ImageProviderError when reference image is supplied", async () => {
      await assert.rejects(
        async () => {
          await generateWithProvider("openai", {
            prompt: "A cute dog",
            negativePrompt: "",
            width: 1024,
            height: 1024,
            steps: 20,
            guidance: 7,
            seed: 42,
            aspectRatio: "1:1",
            quality: "balanced",
            referenceImage: VALID_128X128_PNG,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof ImageProviderError);
          assert.ok(err.message.includes("OpenAI DALL-E 3 does not support reference-image conditioning"));
          assert.ok(err.message.includes("Reference images are never silently discarded"));
          return true;
        }
      );
    });
  });

  // ===========================================================================
  // 4. Reference Image Preservation Across Compilation & Router
  // ===========================================================================
  describe("4. Reference Image Preservation & Conditioning Plan", () => {
    test("Preserves referenceImage and strength in compiled prompt", () => {
      const compiled = compileImagePrompt({
        prompt: "Keep the same character and change the background to an art museum",
        referenceImage: VALID_128X128_PNG,
        strength: 0.65,
        style: "realistic",
        aspectRatio: "16:9",
      });

      assert.strictEqual(compiled.referenceImage, VALID_128X128_PNG, "Reference image must be preserved in compiled prompt");
      assert.strictEqual(compiled.strength, 0.65, "Custom strength must be preserved in compiled prompt");
      assert.ok(compiled.promptsByProvider, "Provider-specific prompts must be generated");
    });

    test("Creates full Reference Conditioning Plan end-to-end", async () => {
      const plan = await createReferenceConditioningPlan({
        prompt: "Keep the same character, change only the background to a futuristic neon library",
        referenceImage: VALID_128X128_PNG,
        style: "cyberpunk",
        aspectRatio: "16:9",
        requestedStrength: 0.75,
      });

      assert.strictEqual(plan.validation.isValid, true);
      assert.strictEqual(plan.intent.intentType, "keep_character");
      assert.strictEqual(plan.effectiveStrength, 0.75);
      assert.ok(plan.promptsByProvider.gemini.includes("Preserve from reference"));
      assert.ok(plan.promptsByProvider.huggingface.includes("primary character"));
      assert.strictEqual(plan.referenceImage, VALID_128X128_PNG);
    });

    test("Fallback provider ordering prioritizes reference-capable backends when referenceImage is supplied", () => {
      const textOrder = resolveProviderOrder(undefined, "balanced", false);
      assert.strictEqual(textOrder[0], "huggingface");

      const referenceOrder = resolveProviderOrder(undefined, "balanced", true);
      assert.ok(!referenceOrder.includes("openai"), "OpenAI must not be in reference order");
      assert.ok(referenceOrder.includes("gemini"), "Gemini must be in reference order");
      assert.ok(referenceOrder.includes("local"), "Local must be in reference order");
      assert.ok(referenceOrder.includes("huggingface"), "Hugging Face must be in reference order");
    });
  });
});

