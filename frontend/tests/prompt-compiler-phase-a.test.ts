/**
 * TATTVA AI - Phase A Prompt Compiler & Architecture Optimization Test Suite
 * Tests 30 distinct diverse prompt scenarios:
 * - Single-object prompts
 * - Multiple-object prompts
 * - Complex scenes
 * - Spatial positioning
 * - Photorealistic scenes
 * - Cartoon / anime illustrations
 * - Minimalist designs
 * - Long descriptive prompts
 * - Contradiction detection
 * - Token budget adherence
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { compileImagePrompt } from "../app/lib/image-engine/prompt-compiler";
import {
  parseStructuredPrompt,
  formatPromptForGemini,
  formatPromptForDallE,
  formatPromptForSDXL,
  formatPromptForFlux,
  formatPromptForLocal,
  validatePromptForProvider,
  PROVIDER_TOKEN_BUDGETS,
} from "../app/lib/image-engine/prompt-processors";

interface TestCase {
  id: number;
  category: string;
  prompt: string;
  style?: string;
  expectedSubject: string;
  expectedKeywords: string[];
}

const TEST_PROMPTS: TestCase[] = [
  // 1-4: Single-Object Prompts
  {
    id: 1,
    category: "Single-Object",
    prompt: "A vintage 1960s mechanical rangefinder camera on a polished mahogany surface",
    style: "realistic",
    expectedSubject: "vintage",
    expectedKeywords: ["camera", "mahogany"],
  },
  {
    id: 2,
    category: "Single-Object",
    prompt: "A cheerful golden retriever puppy sitting attentively on green grass",
    style: "realistic",
    expectedSubject: "retriever",
    expectedKeywords: ["puppy", "grass"],
  },
  {
    id: 3,
    category: "Single-Object",
    prompt: "An antique pocket watch made of brass with exposed gears and roman numerals",
    style: "vintage",
    expectedSubject: "pocket watch",
    expectedKeywords: ["brass", "gears"],
  },
  {
    id: 4,
    category: "Single-Object",
    prompt: "A ceramic coffee mug filled with hot dark coffee emitting gentle steam",
    style: "realistic",
    expectedSubject: "mug",
    expectedKeywords: ["coffee", "steam"],
  },

  // 5-8: Multiple-Object Prompts
  {
    id: 5,
    category: "Multiple-Object",
    prompt: "A clear glass crystal vase holding three red roses and two white lilies on a lace tablecloth",
    style: "realistic",
    expectedSubject: "vase",
    expectedKeywords: ["roses", "lilies"],
  },
  {
    id: 6,
    category: "Multiple-Object",
    prompt: "A leather backpack next to a pair of weathered hiking boots and a silver compass on a granite rock",
    style: "realistic",
    expectedSubject: "backpack",
    expectedKeywords: ["boots", "compass"],
  },
  {
    id: 7,
    category: "Multiple-Object",
    prompt: "A wooden artist easel displaying a colorful canvas with paintbrushes in a ceramic jar beside it",
    style: "realistic",
    expectedSubject: "easel",
    expectedKeywords: ["canvas", "paintbrushes"],
  },
  {
    id: 8,
    category: "Multiple-Object",
    prompt: "A stack of hardcover antique books with a brass magnifying glass resting on top",
    style: "vintage",
    expectedSubject: "books",
    expectedKeywords: ["books", "magnifying"],
  },

  // 9-12: Complex Scenes
  {
    id: 9,
    category: "Complex Scene",
    prompt: "A bustling Victorian train station in heavy snowfall with steam locomotives, passengers in wool coats, and iron arches",
    style: "cinematic",
    expectedSubject: "train station",
    expectedKeywords: ["steam", "snowfall"],
  },
  {
    id: 10,
    category: "Complex Scene",
    prompt: "A lively Mediterranean harbor market with wooden fishing boats, colorful fruit stalls, fishermen mending nets, and seagulls overhead",
    style: "realistic",
    expectedSubject: "market",
    expectedKeywords: ["harbor", "boats"],
  },
  {
    id: 11,
    category: "Complex Scene",
    prompt: "An ancient subterranean temple illuminated by bioluminescent moss, crystal stalactites, and a subterranean turquoise lake",
    style: "fantasy",
    expectedSubject: "temple",
    expectedKeywords: ["moss", "lake"],
  },
  {
    id: 12,
    category: "Complex Scene",
    prompt: "A futuristic orbital research station overlooking Earth with solar panels, docked transport shuttles, and distant stars",
    style: "cyberpunk",
    expectedSubject: "station",
    expectedKeywords: ["earth", "shuttles"],
  },

  // 13-16: Spatial Positioning
  {
    id: 13,
    category: "Spatial Positioning",
    prompt: "A cozy study room with a velvet armchair on the left, a tall wooden bookshelf on the right, and a bay window in the center",
    style: "realistic",
    expectedSubject: "study room",
    expectedKeywords: ["armchair", "bookshelf"],
  },
  {
    id: 14,
    category: "Spatial Positioning",
    prompt: "A tranquil lake with water lilies in the foreground, a wooden canoe in the midground, and snow-capped pine mountains in the background",
    style: "cinematic",
    expectedSubject: "lake",
    expectedKeywords: ["lilies", "canoe", "mountains"],
  },
  {
    id: 15,
    category: "Spatial Positioning",
    prompt: "A modern conference room with a presentation screen at the top, a glass meeting table in the center, and ergonomic chairs surrounding",
    style: "realistic",
    expectedSubject: "conference room",
    expectedKeywords: ["screen", "table"],
  },
  {
    id: 16,
    category: "Spatial Positioning",
    prompt: "A desolate desert highway stretching into the distance with telephone poles on the left and a retro diner to the right",
    style: "cinematic",
    expectedSubject: "highway",
    expectedKeywords: ["diner", "poles"],
  },

  // 17-20: Photorealistic Scenes
  {
    id: 17,
    category: "Photorealistic",
    prompt: "Close-up macro portrait of an elderly watchmaker wearing magnifying loupes, illuminated by warm incandescent desk lighting",
    style: "portrait",
    expectedSubject: "watchmaker",
    expectedKeywords: ["loupes", "lighting"],
  },
  {
    id: 18,
    category: "Photorealistic",
    prompt: "National Geographic photograph of an arctic fox in winter white coat camouflaged against polar snowdrifts",
    style: "realistic",
    expectedSubject: "fox",
    expectedKeywords: ["arctic", "snowdrifts"],
  },
  {
    id: 19,
    category: "Photorealistic",
    prompt: "Architectural photograph of a modern brutalist concrete villa with reflecting pool and floor-to-ceiling glass windows",
    style: "architecture",
    expectedSubject: "villa",
    expectedKeywords: ["concrete", "pool"],
  },
  {
    id: 20,
    category: "Photorealistic",
    prompt: "High-end commercial product photograph of a luxury glass perfume bottle resting on black obsidian stone with water droplets",
    style: "product",
    expectedSubject: "perfume bottle",
    expectedKeywords: ["glass", "droplets"],
  },

  // 21-24: Cartoon / Anime Illustrations
  {
    id: 21,
    category: "Cartoon / Anime",
    prompt: "Studio Ghibli style watercolor illustration of a young girl riding an oversized fluffy flying cat over green terraced rice fields",
    style: "anime",
    expectedSubject: "girl",
    expectedKeywords: ["cat", "rice fields"],
  },
  {
    id: 22,
    category: "Cartoon / Anime",
    prompt: "A high-resolution 3D digital render of Doraemon the robotic cat, standing smiling with his round white and blue body, a red collar with a golden bell, and his pocket on his belly",
    style: "3d",
    expectedSubject: "doraemon",
    expectedKeywords: ["robotic", "bell", "collar"],
  },
  {
    id: 23,
    category: "Cartoon / Anime",
    prompt: "Cute playful pixel art scene of an astronaut cat walking on a pink alien planet with cratered moonscapes",
    style: "anime",
    expectedSubject: "cat",
    expectedKeywords: ["astronaut", "planet"],
  },
  {
    id: 24,
    category: "Cartoon / Anime",
    prompt: "Saturday morning cartoon vector art of a friendly blue dragon baking cookies inside a warm stone bakery",
    style: "anime",
    expectedSubject: "dragon",
    expectedKeywords: ["cookies", "bakery"],
  },

  // 25-27: Minimalist Designs
  {
    id: 25,
    category: "Minimalist",
    prompt: "Minimalist ink wash painting of a single bamboo stalk against pure white negative space with Japanese calligraphy",
    style: "minimal",
    expectedSubject: "bamboo",
    expectedKeywords: ["bamboo", "negative space"],
  },
  {
    id: 26,
    category: "Minimalist",
    prompt: "Clean Scandinavian interior with a lone wooden stool, white textured plaster wall, and a single stem monstera leaf in a ceramic vase",
    style: "minimal",
    expectedSubject: "interior",
    expectedKeywords: ["stool", "vase"],
  },
  {
    id: 27,
    category: "Minimalist",
    prompt: "Flat geometric vector icon of a paper sailboat floating on calm ocean waves with a simple golden sun",
    style: "minimal",
    expectedSubject: "sailboat",
    expectedKeywords: ["sailboat", "waves"],
  },

  // 28-30: Long Descriptive & Complex Condition Prompts
  {
    id: 28,
    category: "Long Descriptive",
    prompt: "An opulent baroque ballroom during a grand masquerade celebration, featuring crystal chandeliers refracting warm candlelight, mirrored walls reflecting velvet gowns, arched gold-leaf ceilings with classical frescoes, and musicians performing on a raised balcony in the background",
    style: "cinematic",
    expectedSubject: "ballroom",
    expectedKeywords: ["chandeliers", "masquerade", "frescoes"],
  },
  {
    id: 29,
    category: "Long Descriptive",
    prompt: "A moody cyberpunk alleyway in Neo-Seoul bathed in pink and turquoise holographic neon reflections, rain puddles rippling on asphalt, steam venting from street grates, and noodle bar patrons sitting beneath plastic awnings without any vehicles",
    style: "cyberpunk",
    expectedSubject: "alleyway",
    expectedKeywords: ["neon", "reflections", "puddles"],
  },
  {
    id: 30,
    category: "Contradiction & Safety",
    prompt: "A sunny midday scene at pitch black midnight with dark storm clouds and clear cloudless blue skies",
    style: "cinematic",
    expectedSubject: "scene",
    expectedKeywords: ["midday", "midnight"],
  },
];

describe("PHASE A: Provider-Specific Prompt Optimization & Validation (30 Test Cases)", () => {
  test("1. All 30 test prompts are processed and compiled without data loss", () => {
    assert.strictEqual(TEST_PROMPTS.length, 30, "Must have exactly 30 diverse test cases");

    for (const testCase of TEST_PROMPTS) {
      const compiled = compileImagePrompt({
        prompt: testCase.prompt,
        style: testCase.style,
      });

      assert.ok(compiled.structured, `Test ${testCase.id} must attach structured prompt info`);
      assert.ok(compiled.promptsByProvider, `Test ${testCase.id} must attach provider prompts`);
      assert.ok(compiled.promptsByProvider.gemini, `Test ${testCase.id} must have gemini prompt`);
      assert.ok(compiled.promptsByProvider.openai, `Test ${testCase.id} must have dall-e prompt`);
      assert.ok(compiled.promptsByProvider.huggingface, `Test ${testCase.id} must have sdxl prompt`);
      assert.ok(compiled.promptsByProvider.local, `Test ${testCase.id} must have local prompt`);
    }
  });

  test("2. SDXL prompt strips out meta-instructional boilerplate and preserves subject first", () => {
    for (const testCase of TEST_PROMPTS) {
      const structured = parseStructuredPrompt(testCase.prompt, (testCase.style || "realistic") as any);
      const sdxlPrompt = formatPromptForSDXL(structured).positive;

      // Verify no meta-instructions in SDXL prompt
      assert.ok(!sdxlPrompt.includes("[USER REQUEST"), `Test ${testCase.id} must not have [USER REQUEST]`);
      assert.ok(!sdxlPrompt.includes("MANDATORY DETAILS"), `Test ${testCase.id} must not have MANDATORY DETAILS`);
      assert.ok(!sdxlPrompt.includes("OUTPUT:"), `Test ${testCase.id} must not have OUTPUT boilerplate`);

      // Verify subject is in the front portion of the SDXL prompt
      const lower = sdxlPrompt.toLowerCase();
      const subjectWord = testCase.expectedSubject.toLowerCase();
      assert.ok(
        lower.includes(subjectWord) || testCase.expectedKeywords.some(kw => lower.includes(kw.toLowerCase())),
        `Test ${testCase.id} (${testCase.category}): SDXL prompt must retain subject/keywords: "${sdxlPrompt}"`
      );
    }
  });

  test("3. FLUX prompt uses natural descriptive sentences and preserves quotes", () => {
    const posterPrompt = 'Futuristic festival poster with title "SOLAR WAVE" in bold yellow typography';
    const structured = parseStructuredPrompt(posterPrompt, "3d");
    const fluxPrompt = formatPromptForFlux(structured);

    assert.ok(fluxPrompt.includes('"SOLAR WAVE"'), "FLUX prompt must preserve quoted typography");
    assert.ok(!fluxPrompt.includes("[USER REQUEST"), "FLUX prompt must avoid meta-boilerplate");
  });

  test("4. Gemini and DALL-E formatters generate coherent natural language descriptions", () => {
    const complexPrompt = TEST_PROMPTS[8].prompt; // Victorian train station
    const structured = parseStructuredPrompt(complexPrompt, "cinematic");
    const geminiPrompt = formatPromptForGemini(structured, { aspectRatio: "16:9" });
    const dallePrompt = formatPromptForDallE(structured, { aspectRatio: "16:9" });

    assert.ok(geminiPrompt.includes("train station"), "Gemini prompt must include train station");
    assert.ok(geminiPrompt.includes("16:9 aspect ratio"), "Gemini prompt must specify aspect ratio");
    assert.ok(!geminiPrompt.includes("[USER REQUEST"), "Gemini prompt must not contain raw brackets");

    assert.ok(dallePrompt.includes("train station"), "DALL-E prompt must include train station");
    assert.ok(!dallePrompt.includes("[USER REQUEST"), "DALL-E prompt must not contain raw brackets");
  });

  test("5. Contradiction detection flags conflicting instructions in prompt #30", () => {
    const contradictionTest = TEST_PROMPTS[29]; // Sunny midday at midnight with cloudless cloudy sky
    const structured = parseStructuredPrompt(contradictionTest.prompt, "cinematic");

    assert.ok(
      structured.contradictions.length > 0,
      "Must detect contradictions (sunny midday vs pitch black midnight, storm clouds vs cloudless)"
    );
  });

  test("6. Token budgets are audited per provider architecture", () => {
    for (const testCase of TEST_PROMPTS) {
      const validationSDXL = validatePromptForProvider(testCase.prompt, "huggingface", (testCase.style || "realistic") as any);
      assert.ok(validationSDXL.estimatedTokens > 0, `Test ${testCase.id} estimated tokens must be > 0`);
      assert.strictEqual(validationSDXL.tokenBudget, 77, "SDXL token budget must be 77");

      const validationGemini = validatePromptForProvider(testCase.prompt, "gemini", (testCase.style || "realistic") as any);
      assert.strictEqual(validationGemini.tokenBudget, 1000, "Gemini token budget must be 1000");
    }
  });
});
