/**
 * TATTVA AI - Phase C: Multi-Model Router & Benchmark System Test Suite
 * 50 Comprehensive Routing Test Cases across:
 * - Simple image generation (1-5)
 * - Complex photorealistic scenes (6-11)
 * - Multiple objects (12-16)
 * - Strict object positioning (17-21)
 * - Reference-based generation (22-26)
 * - Background replacement (27-31)
 * - Character preservation (32-36)
 * - Poster & typography generation (37-41)
 * - Image editing & localized inpainting (42-45)
 * - Provider quota failures & fallback chains (46-48)
 * - Speed prioritization & offline mode (49-50)
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  routeImageRequest,
  SUPPORTED_MODELS,
  listAvailableModels,
  rankModelsByCategory,
  getBenchmarkMetric,
  recordGenerationOutcome,
} from "../app/lib/image-engine/multi-model-router";

// 128x128 valid base64 PNG fixture for reference tests
const VALID_REF_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAQMAAAD58POIAAAABlBMVEUAAAD///+l2Z/dAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAANUlEQVRIx+3RsQ0AMAzDwCL5/8wUaIeOBAi6F9k1d120BwAAAAAAAAAA4F8HAAAAAP7gAgz4AGjZ7QW1AAAAAElFTkSuQmCC";

interface RoutingTestCase {
  id: number;
  category: string;
  prompt: string;
  referenceImage?: string;
  quality?: "fast" | "balanced" | "max";
  isOffline?: boolean;
  expectedWorkflow: string;
  expectedProviderPriority: string[];
  disallowedProviders?: string[];
  description: string;
}

const ROUTING_50_TEST_CASES: RoutingTestCase[] = [
  // 1-5: Simple Image Generation
  {
    id: 1,
    category: "Simple Image Generation",
    prompt: "A red ceramic coffee mug on a wooden tabletop",
    expectedWorkflow: "text_to_image",
    expectedProviderPriority: ["huggingface", "gemini", "openai", "local"],
    description: "Single object simple scene",
  },
  {
    id: 2,
    category: "Simple Image Generation",
    prompt: "A fluffy white cat resting peacefully on a blue rug",
    expectedWorkflow: "text_to_image",
    expectedProviderPriority: ["huggingface", "gemini", "openai"],
    description: "Simple domestic animal prompt",
  },
  {
    id: 3,
    category: "Simple Image Generation",
    prompt: "A ripe yellow banana against a neutral gray studio background",
    expectedWorkflow: "text_to_image",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Single fruit studio isolation",
  },
  {
    id: 4,
    category: "Simple Image Generation",
    prompt: "An acoustic wooden guitar leaning against a brick wall",
    expectedWorkflow: "text_to_image",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Single musical instrument",
  },
  {
    id: 5,
    category: "Simple Image Generation",
    prompt: "A single green oak leaf floating on still water",
    expectedWorkflow: "text_to_image",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Minimalist natural object",
  },

  // 6-11: Complex Photorealistic Scenes
  {
    id: 6,
    category: "Photorealism",
    prompt: "National Geographic photograph of an elderly Sherpa guide in the Himalayas, shot on Nikon Z9 85mm f/1.4 lens, natural sunlight, raw photo",
    expectedWorkflow: "photorealism",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "High-end portrait photorealism with camera specs",
  },
  {
    id: 7,
    category: "Photorealism",
    prompt: "Photorealistic macro photograph of a honeybee pollinating a purple lavender flower, extreme depth of field, 35mm lens",
    expectedWorkflow: "photorealism",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Macro wildlife photorealism",
  },
  {
    id: 8,
    category: "Photorealism",
    prompt: "Architectural photograph of a modern brutalist concrete pavilion reflected in a still pool, dslr quality, golden hour lighting",
    expectedWorkflow: "photorealism",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Architectural photorealism",
  },
  {
    id: 9,
    category: "Photorealism",
    prompt: "Raw 8k photo of a rainy cobblestone street in Edinburgh at twilight with warm light spilling from pub windows",
    expectedWorkflow: "photorealism",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Urban twilight photorealism",
  },
  {
    id: 10,
    category: "Photorealism",
    prompt: "National Geographic photo of a bengal tiger stalking through misty bamboo forests, true-to-life fur texture",
    expectedWorkflow: "photorealism",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Wildlife action photorealism",
  },
  {
    id: 11,
    category: "Photorealism",
    prompt: "Cinematic photograph of an artisan glassblower shaping molten amber glass in a dark workshop, radiant heat glow",
    expectedWorkflow: "photorealism",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Artisan crafts photorealism",
  },

  // 12-16: Multiple Objects
  {
    id: 12,
    category: "Multiple Objects",
    prompt: "A crystal vase holding exactly three red roses, two white lilies, and five sprigs of baby's breath",
    expectedWorkflow: "text_to_image",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Exact flower count arrangement",
  },
  {
    id: 13,
    category: "Multiple Objects",
    prompt: "A hiker's picnic spread featuring a sourdough loaf, a wedge of cheddar cheese, red grapes, and a canteen on a checkered blanket",
    expectedWorkflow: "text_to_image",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Multi-item still life",
  },
  {
    id: 14,
    category: "Multiple Objects",
    prompt: "Four vintage leather-bound encyclopedias, a brass magnifying glass, and a quill pen on a scholar's mahogany desk",
    expectedWorkflow: "text_to_image",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Scholar's desk assemblage",
  },
  {
    id: 15,
    category: "Multiple Objects",
    prompt: "Three colorful glazed ceramic bowls filled with spices: golden turmeric, red paprika, and black peppercorns",
    expectedWorkflow: "text_to_image",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Culinary spice assortment",
  },
  {
    id: 16,
    category: "Multiple Objects",
    prompt: "An artist toolbox containing oil paint tubes, palette knives, linseed oil bottle, and bristle brushes",
    expectedWorkflow: "text_to_image",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Artisan tools collection",
  },

  // 17-21: Strict Object Positioning
  {
    id: 17,
    category: "Spatial Positioning",
    prompt: "A living room with a brown velvet sofa on the left, a tall bookshelf on the right, and a fireplace in the center",
    expectedWorkflow: "text_to_image",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Interior tripartite positioning",
  },
  {
    id: 18,
    category: "Spatial Positioning",
    prompt: "A landscape with blooming sunflowers in the foreground, a red barn in the midground, and snow mountains in the background",
    expectedWorkflow: "high_complexity_scene",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Foreground / midground / background layers",
  },
  {
    id: 19,
    category: "Spatial Positioning",
    prompt: "A conference table with a presentation screen at the top, executive chairs around, and a podium to the right",
    expectedWorkflow: "text_to_image",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Directional indoor layout",
  },
  {
    id: 20,
    category: "Spatial Positioning",
    prompt: "A coastal road flanked by telephone poles on the left and crashing ocean waves to the right",
    expectedWorkflow: "text_to_image",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Bilateral perspective positioning",
  },
  {
    id: 21,
    category: "Spatial Positioning",
    prompt: "A centered grand piano spotlighted on a dark theater stage with tiered red velvet seats surrounding in the distance",
    expectedWorkflow: "text_to_image",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Centered focal point with peripheral seating",
  },

  // 22-26: Reference-Based Generation (CRITICAL: Must NEVER select OpenAI!)
  {
    id: 22,
    category: "Reference-Based Generation",
    prompt: "Generate an image variation keeping the visual style and structure of this reference image",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "image_to_image",
    expectedProviderPriority: ["gemini", "huggingface", "local"],
    disallowedProviders: ["openai"],
    description: "General reference image conditioning",
  },
  {
    id: 23,
    category: "Reference-Based Generation",
    prompt: "Render this character exploring a magical enchanted forest with glowing blue flora",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "character_preservation",
    expectedProviderPriority: ["gemini", "huggingface", "local"],
    disallowedProviders: ["openai"],
    description: "Character conditioning with reference",
  },
  {
    id: 24,
    category: "Reference-Based Generation",
    prompt: "Recreate this exact scene composition but shift the lighting to dramatic midnight moonlight",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "composition_transfer",
    expectedProviderPriority: ["gemini", "huggingface", "local"],
    disallowedProviders: ["openai"],
    description: "Composition transfer from reference",
  },
  {
    id: 25,
    category: "Reference-Based Generation",
    prompt: "Create an anime version in the style of this attached concept art",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "style_transfer",
    expectedProviderPriority: ["gemini", "huggingface", "local"],
    disallowedProviders: ["openai"],
    description: "Style transfer from reference",
  },
  {
    id: 26,
    category: "Reference-Based Generation",
    prompt: "Produce an image-to-image render preserving the structural silhouette of this reference",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "image_to_image",
    expectedProviderPriority: ["gemini", "huggingface", "local"],
    disallowedProviders: ["openai"],
    description: "Silhouette-conditioned img2img",
  },

  // 27-31: Background Replacement
  {
    id: 27,
    category: "Background Replacement",
    prompt: "Change only the background to a sunny tropical beach with turquoise waves",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "background_replacement",
    expectedProviderPriority: ["gemini", "local", "huggingface"],
    disallowedProviders: ["openai"],
    description: "Tropical beach background replacement",
  },
  {
    id: 28,
    category: "Background Replacement",
    prompt: "Replace the background with a bustling Tokyo street market at night with neon lights",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "background_replacement",
    expectedProviderPriority: ["gemini", "local", "huggingface"],
    disallowedProviders: ["openai"],
    description: "Tokyo neon background swap",
  },
  {
    id: 29,
    category: "Background Replacement",
    prompt: "Remove the background and place the character in an ancient Egyptian pyramid chamber",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "background_replacement",
    expectedProviderPriority: ["gemini", "local", "huggingface"],
    disallowedProviders: ["openai"],
    description: "Pyramid interior background swap",
  },
  {
    id: 30,
    category: "Background Replacement",
    prompt: "Change background to a snowy pine mountain peak at sunrise",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "background_replacement",
    expectedProviderPriority: ["gemini", "local", "huggingface"],
    disallowedProviders: ["openai"],
    description: "Snowy mountain background replacement",
  },
  {
    id: 31,
    category: "Background Replacement",
    prompt: "Keep the subject and replace the background with an opulent Versailles ballroom",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "background_replacement",
    expectedProviderPriority: ["gemini", "local", "huggingface"],
    disallowedProviders: ["openai"],
    description: "Ballroom background swap",
  },

  // 32-36: Character Preservation
  {
    id: 32,
    category: "Character Preservation",
    prompt: "Keep the same character and have him sitting inside a cozy coffee shop reading a book",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "character_preservation",
    expectedProviderPriority: ["gemini", "local", "huggingface"],
    disallowedProviders: ["openai"],
    description: "Consistent character in coffee shop",
  },
  {
    id: 33,
    category: "Character Preservation",
    prompt: "Maintain the same person with identical facial features walking through autumn park foliage",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "character_preservation",
    expectedProviderPriority: ["gemini", "local", "huggingface"],
    disallowedProviders: ["openai"],
    description: "Facial feature identity lock",
  },
  {
    id: 34,
    category: "Character Preservation",
    prompt: "Preserve the same character identity wearing a futuristic silver astronaut suit",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "character_preservation",
    expectedProviderPriority: ["gemini", "local", "huggingface"],
    disallowedProviders: ["openai"],
    description: "Costume change with identity preservation",
  },
  {
    id: 35,
    category: "Character Preservation",
    prompt: "Consistent character depicted smiling warmly in front of the Eiffel Tower",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "character_preservation",
    expectedProviderPriority: ["gemini", "local", "huggingface"],
    disallowedProviders: ["openai"],
    description: "Consistent character at tourist landmark",
  },
  {
    id: 36,
    category: "Character Preservation",
    prompt: "Keep the same cat with identical black and white fur pattern sleeping in a sunny window",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "character_preservation",
    expectedProviderPriority: ["gemini", "local", "huggingface"],
    disallowedProviders: ["openai"],
    description: "Animal identity preservation",
  },

  // 37-41: Poster & Typography Generation
  {
    id: 37,
    category: "Poster & Typography",
    prompt: 'Bold movie poster for a sci-fi thriller with the title "NEO TOKYO 2099" in glowing orange letters',
    expectedWorkflow: "poster_typography",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Movie poster with quoted title",
  },
  {
    id: 38,
    category: "Poster & Typography",
    prompt: 'Vintage travel poster featuring the Amalfi Coast with bold header text "VISIT ITALY"',
    expectedWorkflow: "poster_typography",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Travel poster with location header",
  },
  {
    id: 39,
    category: "Poster & Typography",
    prompt: 'Music festival promotional banner with the text "SUMMER ECHOES" in modern serif font',
    expectedWorkflow: "poster_typography",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Festival banner with typography",
  },
  {
    id: 40,
    category: "Poster & Typography",
    prompt: 'Art deco cocktail bar menu cover with golden lettering "THE VELVET HOUR"',
    expectedWorkflow: "poster_typography",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Art deco typography cover",
  },
  {
    id: 41,
    category: "Poster & Typography",
    prompt: 'Futuristic product advertisement poster with bold tagline "PURE HORIZON"',
    expectedWorkflow: "poster_typography",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Commercial poster with typography",
  },

  // 42-45: Image Editing & Inpainting
  {
    id: 42,
    category: "Image Editing",
    prompt: "Change the clothing color to midnight navy blue while keeping the rest intact",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "inpainting",
    expectedProviderPriority: ["gemini", "local", "huggingface"],
    disallowedProviders: ["openai"],
    description: "Targeted garment color edit",
  },
  {
    id: 43,
    category: "Image Editing",
    prompt: "Add an object: a vintage leather briefcase on the bench without modifying existing subjects",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "inpainting",
    expectedProviderPriority: ["gemini", "local", "huggingface"],
    disallowedProviders: ["openai"],
    description: "Object addition into existing scene",
  },
  {
    id: 44,
    category: "Image Editing",
    prompt: "Inpaint and remove the sunglasses from the face",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "inpainting",
    expectedProviderPriority: ["gemini", "local", "huggingface"],
    disallowedProviders: ["openai"],
    description: "Facial inpainting removal",
  },
  {
    id: 45,
    category: "Image Editing",
    prompt: "Change hair color to auburn while keeping the original pose and expression",
    referenceImage: VALID_REF_IMAGE,
    expectedWorkflow: "inpainting",
    expectedProviderPriority: ["gemini", "local", "huggingface"],
    disallowedProviders: ["openai"],
    description: "Hair recoloring edit",
  },

  // 46-48: Provider Quota Failures & Fallback Chains
  {
    id: 46,
    category: "Quota & Fallback",
    prompt: "A beautiful golden sunset over ocean waves",
    expectedWorkflow: "text_to_image",
    expectedProviderPriority: ["huggingface", "gemini", "openai", "local"],
    description: "Fallback chain health verification",
  },
  {
    id: 47,
    category: "Quota & Fallback",
    prompt: "Cyberpunk street with neon holograms and flying cars",
    expectedWorkflow: "text_to_image",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Multi-tier fallback assembly",
  },
  {
    id: 48,
    category: "Quota & Fallback",
    prompt: "Portrait of a royal queen wearing an emerald tiara",
    expectedWorkflow: "portrait_generation",
    expectedProviderPriority: ["huggingface", "gemini"],
    description: "Portrait fallback chain assembly",
  },

  // 49-50: Speed Prioritization & Offline Mode
  {
    id: 49,
    category: "Speed Prioritization",
    prompt: "Quick sketch of a running horse, fast draft quality",
    quality: "fast",
    expectedWorkflow: "fast_generation",
    expectedProviderPriority: ["huggingface"],
    description: "Fast generation prioritization",
  },
  {
    id: 50,
    category: "Offline Execution",
    prompt: "Confidential product mockup rendered with complete local privacy",
    isOffline: true,
    expectedWorkflow: "product_photography",
    expectedProviderPriority: ["local"],
    disallowedProviders: ["gemini", "openai", "huggingface"],
    description: "Strict offline local CUDA execution",
  },
];

describe("PHASE C: Intelligent Multi-Model Router & Benchmark System (50 Test Cases)", () => {
  test("1. Verifies that all 50 routing test cases are evaluated without errors", () => {
    assert.strictEqual(ROUTING_50_TEST_CASES.length, 50, "Must have exactly 50 distinct test cases");

    for (const testCase of ROUTING_50_TEST_CASES) {
      const decision = routeImageRequest({
        prompt: testCase.prompt,
        referenceImage: testCase.referenceImage,
        quality: testCase.quality,
        isOffline: testCase.isOffline,
      });

      assert.ok(decision.primaryModel, `Test ${testCase.id} must select a primary model`);
      assert.ok(decision.fallbackChain.length > 0, `Test ${testCase.id} must assemble a fallback chain`);
      assert.ok(decision.confidence >= 0.70, `Test ${testCase.id} confidence must be >= 0.70 (got ${decision.confidence})`);
      assert.ok(decision.selectionRationale.length > 10, `Test ${testCase.id} must provide clear selection rationale`);
      assert.strictEqual(typeof decision.estimatedCostUsd, "number", `Test ${testCase.id} must estimate cost`);
      assert.strictEqual(typeof decision.estimatedLatencyMs, "number", `Test ${testCase.id} must estimate latency`);
    }
  });

  test("2. Detects Photorealism workflow and prioritizes FLUX.1 / Gemini", () => {
    const photorealCases = ROUTING_50_TEST_CASES.filter((c) => c.category === "Photorealism");
    assert.ok(photorealCases.length >= 6, "Must have at least 6 photorealism cases");

    for (const testCase of photorealCases) {
      const decision = routeImageRequest({ prompt: testCase.prompt });
      assert.strictEqual(decision.workflow, "photorealism", `Test ${testCase.id} must detect photorealism`);
      assert.ok(
        decision.primaryModel.family === "flux" || decision.primaryModel.family === "gemini",
        `Test ${testCase.id} primary model should be FLUX or Gemini`
      );
    }
  });

  test("3. Detects Poster & Typography workflow when quoted text exists", () => {
    const posterCases = ROUTING_50_TEST_CASES.filter((c) => c.category === "Poster & Typography");
    assert.ok(posterCases.length >= 5, "Must have at least 5 poster cases");

    for (const testCase of posterCases) {
      const decision = routeImageRequest({ prompt: testCase.prompt });
      assert.strictEqual(decision.workflow, "poster_typography");
      assert.strictEqual(decision.typographyOverlayNeeded, true, "Quoted text requires typography overlay");
      assert.strictEqual(decision.primaryModel.family, "flux", "FLUX is the premier typography model");
    }
  });

  test("4. Reference Image Anti-Discard Guard: NEVER selects OpenAI DALL-E 3 for reference inputs", () => {
    const referenceCases = ROUTING_50_TEST_CASES.filter((c) => Boolean(c.referenceImage));
    assert.ok(referenceCases.length >= 15, "Must have at least 15 reference image test cases");

    for (const testCase of referenceCases) {
      const decision = routeImageRequest({
        prompt: testCase.prompt,
        referenceImage: testCase.referenceImage,
      });

      assert.strictEqual(decision.referenceSafe, true, `Test ${testCase.id} must be flagged referenceSafe`);
      assert.notStrictEqual(decision.primaryModel.providerId, "openai", `Test ${testCase.id} primary model must NOT be OpenAI`);
      assert.ok(
        !decision.fallbackChain.includes("openai"),
        `Test ${testCase.id} fallback chain must NEVER include OpenAI when referenceImage is supplied`
      );
    }
  });

  test("5. Classifies Character Preservation and Background Replacement workflows", () => {
    const charDecision = routeImageRequest({
      prompt: "Keep the same character and place him inside a modern library",
      referenceImage: VALID_REF_IMAGE,
    });
    assert.strictEqual(charDecision.workflow, "character_preservation");

    const bgDecision = routeImageRequest({
      prompt: "Change only the background to a tropical beach at sunset",
      referenceImage: VALID_REF_IMAGE,
    });
    assert.strictEqual(bgDecision.workflow, "background_replacement");
  });

  test("6. Quality Benchmark Ranking accurately orders models by category", () => {
    const photorealRanks = rankModelsByCategory("photorealism");
    assert.ok(photorealRanks.length >= 3, "Must rank at least 3 models in photorealism");
    assert.strictEqual(photorealRanks[0].modelId, "flux-1-dev", "FLUX.1-dev must rank #1 in photorealism benchmark");

    const posterRanks = rankModelsByCategory("poster_typography");
    assert.ok(posterRanks.length >= 2, "Must rank models in poster_typography");
    assert.strictEqual(posterRanks[0].modelId, "flux-1-dev", "FLUX.1-dev must rank #1 in typography");

    const charRanks = rankModelsByCategory("character_preservation");
    assert.ok(charRanks.length >= 2, "Must rank models in character_preservation");
    assert.strictEqual(charRanks[0].modelId, "gemini-3.1-flash-image", "Gemini 3.1 Flash Image must rank #1 in character conditioning");
  });

  test("7. Speed prioritization selects fast models when quality is 'fast'", () => {
    const fastDecision = routeImageRequest({
      prompt: "Quick concept sketch of a sports car",
      quality: "fast",
    });
    assert.strictEqual(fastDecision.workflow, "fast_generation");
    assert.ok(fastDecision.estimatedLatencyMs <= 2500, "Fast generation latency must be <= 2500ms");
  });

  test("8. Offline mode restricts execution strictly to local engine", () => {
    const offlineDecision = routeImageRequest({
      prompt: "Confidential blueprint render",
      isOffline: true,
    });
    assert.strictEqual(offlineDecision.executionMode, "local");
    assert.strictEqual(offlineDecision.primaryModel.providerId, "local");
    assert.deepStrictEqual(offlineDecision.fallbackChain, ["local"], "Offline fallback chain must only contain local");
  });

  test("9. Benchmark system records empirical generation outcomes without fabrication", () => {
    recordGenerationOutcome({
      modelId: "flux-1-schnell",
      providerId: "huggingface",
      category: "fast_generation",
      success: true,
      latencyMs: 1950,
      accuracyScore: 92,
    });

    const metric = getBenchmarkMetric("flux-1-schnell", "fast_generation");
    assert.ok(metric, "Metric must be recorded");
    assert.ok(metric.sampleCount > 0, "Sample count must be updated");
    assert.ok(metric.failureRate <= 0.05, "Failure rate must reflect successes");
  });
});

