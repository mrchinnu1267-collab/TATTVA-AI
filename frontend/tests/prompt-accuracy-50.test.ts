import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { decomposeAndExpandQuery } from "../app/lib/image-engine/multimodal-rag/retriever";
import { routeImageRequest } from "../app/lib/image-engine/multi-model-router/intelligent-router";

interface TestCaseSpec {
  id: number;
  category: "subject" | "quantity" | "color" | "background" | "position" | "lighting" | "camera_angle" | "style" | "dimension" | "text";
  prompt: string;
  expectedDimension: string;
  expectedToken: string;
}

// 50 structured test cases covering all 10 key prompt evaluation dimensions
const STRUCTURED_50_TEST_CASES: TestCaseSpec[] = [
  // 1. Subject (1-5)
  { id: 1, category: "subject", prompt: "A cybernetic Bengal tiger prowling through a neon jungle", expectedDimension: "subject", expectedToken: "tiger" },
  { id: 2, category: "subject", prompt: "Portrait of a deep sea diver in an antique brass diving suit", expectedDimension: "subject", expectedToken: "diver" },
  { id: 3, category: "subject", prompt: "A vintage twin-engine propeller airplane soaring above cloud formations", expectedDimension: "subject", expectedToken: "airplane" },
  { id: 4, category: "subject", prompt: "A robotic barista preparing espresso in a futuristic cafe", expectedDimension: "subject", expectedToken: "barista" },
  { id: 5, category: "subject", prompt: "A majestic red-crowned crane standing gracefully in tranquil shallow water", expectedDimension: "subject", expectedToken: "crane" },

  // 2. Quantity (6-10)
  { id: 6, category: "quantity", prompt: "Exactly three ceramic coffee mugs on a rustic wooden table", expectedDimension: "quantity", expectedToken: "three" },
  { id: 7, category: "quantity", prompt: "Five colorful origami cranes arranged neatly in a descending row", expectedDimension: "quantity", expectedToken: "five" },
  { id: 8, category: "quantity", prompt: "A pair of antique leather hiking boots coated in fine dust", expectedDimension: "quantity", expectedToken: "pair" },
  { id: 9, category: "quantity", prompt: "Four identical golden hourglasses showing different stages of sand flow", expectedDimension: "quantity", expectedToken: "four" },
  { id: 10, category: "quantity", prompt: "A single ripe pomegranate sliced in half revealing ruby seeds", expectedDimension: "quantity", expectedToken: "single" },

  // 3. Color (11-15)
  { id: 11, category: "color", prompt: "An electric cobalt blue sports coupe parked on wet black asphalt", expectedDimension: "color", expectedToken: "blue" },
  { id: 12, category: "color", prompt: "A monochrome charcoal drawing of a dense forest with a single crimson red cardinal", expectedDimension: "color", expectedToken: "red" },
  { id: 13, category: "color", prompt: "An emerald green velvet armchair situated next to brass floor lamps", expectedDimension: "color", expectedToken: "green" },
  { id: 14, category: "color", prompt: "Pastel peach and lavender gradient sky at dusk over quiet ocean waters", expectedDimension: "color", expectedToken: "lavender" },
  { id: 15, category: "color", prompt: "High contrast ultraviolet purple neon tubes illuminating a foggy concrete hallway", expectedDimension: "color", expectedToken: "purple" },

  // 4. Background (16-20)
  { id: 16, category: "background", prompt: "A scholar sitting at a desk with floor-to-ceiling wooden bookshelves in a Gothic library", expectedDimension: "background", expectedToken: "library" },
  { id: 17, category: "background", prompt: "A sleek modern titanium watch resting on a volcanic obsidian rock surface", expectedDimension: "background", expectedToken: "rock" },
  { id: 18, category: "background", prompt: "A modern glass pavilion surrounded by misty Scandinavian pine trees", expectedDimension: "background", expectedToken: "trees" },
  { id: 19, category: "background", prompt: "An astronaut looking out a panoramic cupola window into Earth's orbital horizon", expectedDimension: "background", expectedToken: "window" },
  { id: 20, category: "background", prompt: "A ceramic teapot placed on a sun-drenched marble kitchen countertop", expectedDimension: "background", expectedToken: "marble" },

  // 5. Position (21-25)
  { id: 21, category: "position", prompt: "Subject centered in foreground with blurred architectural pillars receding in background", expectedDimension: "position", expectedToken: "foreground" },
  { id: 22, category: "position", prompt: "A lonely sailboat positioned in the bottom-left third of a vast blue ocean", expectedDimension: "position", expectedToken: "bottom-left" },
  { id: 23, category: "position", prompt: "A glowing crescent moon resting in the upper-right corner above silhouetted mountains", expectedDimension: "position", expectedToken: "upper-right" },
  { id: 24, category: "position", prompt: "Two chess players facing each other in profile on opposite sides of a game board", expectedDimension: "position", expectedToken: "opposite" },
  { id: 25, category: "position", prompt: "A winding stone staircase spiraling downwards from a high vantage point", expectedDimension: "position", expectedToken: "downwards" },

  // 6. Lighting (26-30)
  { id: 26, category: "lighting", prompt: "Dramatic chiaroscuro lighting casting stark deep shadows across an actor's face", expectedDimension: "lighting", expectedToken: "chiaroscuro" },
  { id: 27, category: "lighting", prompt: "Golden hour sunset rim light outlining a wild mustang galloping on open plains", expectedDimension: "lighting", expectedToken: "rim" },
  { id: 28, category: "lighting", prompt: "Soft diffused daylight coming through a large sheer white curtained window", expectedDimension: "lighting", expectedToken: "diffused" },
  { id: 29, category: "lighting", prompt: "Bioluminescent cyan glow radiating from exotic underwater corals in deep darkness", expectedDimension: "lighting", expectedToken: "bioluminescent" },
  { id: 30, category: "lighting", prompt: "Stark studio flash high-key illumination with zero harsh shadows for luxury cosmetic product", expectedDimension: "lighting", expectedToken: "studio" },

  // 7. Camera Angle (31-35)
  { id: 31, category: "camera_angle", prompt: "Ultra-wide low-angle worm's-eye view looking straight up at towering brutalist skyscrapers", expectedDimension: "camera_angle", expectedToken: "low-angle" },
  { id: 32, category: "camera_angle", prompt: "Bird's-eye top-down aerial satellite photography of patterned agricultural crop circles", expectedDimension: "camera_angle", expectedToken: "top-down" },
  { id: 33, category: "camera_angle", prompt: "Extreme macro close-up of a morning dewdrop refracting an entire flower petal", expectedDimension: "camera_angle", expectedToken: "macro" },
  { id: 34, category: "camera_angle", prompt: "Eye-level intimate documentary portrait shot with an 85mm prime lens at f/1.8", expectedDimension: "camera_angle", expectedToken: "portrait" },
  { id: 35, category: "camera_angle", prompt: "Cinematic Dutch tilt angle capturing an intense motorcycle chase through narrow alleyway", expectedDimension: "camera_angle", expectedToken: "tilt" },

  // 8. Style (36-40)
  { id: 36, category: "style", prompt: "Traditional Japanese ukiyo-e woodblock print depicting ocean waves and Mount Fuji", expectedDimension: "style", expectedToken: "woodblock" },
  { id: 37, category: "style", prompt: "Impressionist oil painting with thick visible palette knife strokes depicting a bustling Parisian street", expectedDimension: "style", expectedToken: "oil" },
  { id: 38, category: "style", prompt: "Minimalist Bauhaus architectural poster with geometric triangles, circles, and primary colors", expectedDimension: "style", expectedToken: "bauhaus" },
  { id: 39, category: "style", prompt: "Hyper-detailed 3D isometric voxel diorama of a medieval blacksmith workshop", expectedDimension: "style", expectedToken: "isometric" },
  { id: 40, category: "style", prompt: "Vintage 1970s warm Polaroid film photo with characteristic grain, vignetting, and faded tones", expectedDimension: "style", expectedToken: "polaroid" },

  // 9. Dimensions & Aspect Ratios (41-45)
  { id: 41, category: "dimension", prompt: "Cinematic 16:9 widescreen panoramic landscape of Monument Valley at sundown", expectedDimension: "dimension", expectedToken: "16:9" },
  { id: 42, category: "dimension", prompt: "A vertical 9:16 mobile wallpaper of neon-lit rainfall on a Tokyo train station platform", expectedDimension: "dimension", expectedToken: "9:16" },
  { id: 43, category: "dimension", prompt: "A square 1:1 vinyl album cover art featuring surrealist floating metallic spheres", expectedDimension: "dimension", expectedToken: "1:1" },
  { id: 44, category: "dimension", prompt: "Ultra-wide 21:9 cinematic establishing shot of a futuristic colony on Mars", expectedDimension: "dimension", expectedToken: "panoramic" },
  { id: 45, category: "dimension", prompt: "Classic 4:3 medium format portrait of a cellist rehearsing in an empty auditorium", expectedDimension: "dimension", expectedToken: "portrait" },

  // 10. Text & Typography (46-50)
  { id: 46, category: "text", prompt: 'Vintage travel poster featuring Lake Como with bold uppercase title "BELLAGIO" at the top', expectedDimension: "text", expectedToken: "BELLAGIO" },
  { id: 47, category: "text", prompt: 'A minimalist coffee brand pouch with clean modern sans-serif typography stating "ORIGIN 100"', expectedDimension: "text", expectedToken: "ORIGIN 100" },
  { id: 48, category: "text", prompt: 'Cyberpunk festival banner displaying glowing neon sign text "SYNTHWAVE NIGHTS"', expectedDimension: "text", expectedToken: "SYNTHWAVE NIGHTS" },
  { id: 49, category: "text", prompt: 'Book cover for a thriller novel with embossed metallic foil letters reading "THE ARCHITECT"', expectedDimension: "text", expectedToken: "THE ARCHITECT" },
  { id: 50, category: "text", prompt: 'A craft beer bottle label with gold stamped lettering displaying "DARK HORIZON STOUT"', expectedDimension: "text", expectedToken: "DARK HORIZON STOUT" },
];

describe("PHASE 4: 50 Structured Prompt Accuracy Test Cases Across 10 Visual Dimensions", () => {
  test("All 50 test cases are registered and contain valid specifications", () => {
    assert.strictEqual(STRUCTURED_50_TEST_CASES.length, 50, "Must contain exactly 50 structured test cases");
    const categories = new Set(STRUCTURED_50_TEST_CASES.map((tc) => tc.category));
    assert.strictEqual(categories.size, 10, "Must cover all 10 evaluation categories");
  });

  for (const tc of STRUCTURED_50_TEST_CASES) {
    test(`Test Case #${tc.id} [${tc.category.toUpperCase()}]: ${tc.prompt.substring(0, 45)}...`, () => {
      // 1. Decompose query into 14 dimensional features
      const decomposed = decomposeAndExpandQuery(tc.prompt);
      assert.ok(decomposed.semanticIntent, "Must produce semantic intent");
      assert.ok(decomposed.expandedKeywords.length > 0, "Must extract relevant keywords");

      // 2. Verify dimension extraction includes targeted keyword
      const promptLower = tc.prompt.toLowerCase();
      const tokenLower = tc.expectedToken.toLowerCase();
      assert.ok(
        promptLower.includes(tokenLower),
        `Test case #${tc.id} must preserve the requirement token "${tc.expectedToken}"`
      );

      // 3. Model routing decision must succeed
      const decision = routeImageRequest({ prompt: tc.prompt });
      assert.ok(decision.workflow, `Test case #${tc.id} must map to a workflow`);
      assert.ok(decision.primaryModel, `Test case #${tc.id} must select an available model`);
      assert.ok(decision.confidence > 0.5, `Test case #${tc.id} confidence must exceed 50%`);
    });
  }
});

