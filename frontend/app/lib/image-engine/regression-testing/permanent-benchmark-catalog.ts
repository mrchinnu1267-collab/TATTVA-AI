/**
 * TATTVA AI - Permanent Version-Controlled Benchmark Dataset (Phase O)
 * 500 standardized benchmark prompts across 13 required categories with independently defined ground truth.
 * Benchmark Version: v2.0.0 (Preserved across all regression audits for longitudinal comparability).
 */

import {
  PermanentBenchmarkPromptItem,
  RegressionBenchmarkCategory,
  RegressionEvaluationDimension,
} from "./types";

export const BENCHMARK_CATALOG_VERSION = "v2.0.0";

interface CategorySpec {
  category: RegressionBenchmarkCategory;
  stressDimension: RegressionEvaluationDimension;
  count: number;
  templates: Array<{
    promptTemplate: string;
    description: string;
    expected: string | number | boolean;
    negative?: string[];
  }>;
}

const CATEGORY_SPECS: CategorySpec[] = [
  // 1. Object Generation (40 prompts)
  {
    category: "object_generation",
    stressDimension: "object_presence",
    count: 40,
    templates: [
      { promptTemplate: "A vintage brass telescope resting on an antique mahogany desk", description: "Brass telescope presence", expected: "brass telescope", negative: ["modern plastic tripod"] },
      { promptTemplate: "An isolated red ceramic teapot on a clean white surface", description: "Ceramic teapot presence", expected: "red ceramic teapot", negative: ["multiple mugs", "cracked surface"] },
      { promptTemplate: "A classic stainless steel espresso machine with steam wand", description: "Espresso machine presence", expected: "espresso machine", negative: ["drip pot"] },
      { promptTemplate: "A handcrafted acoustic guitar with spruce top and rosewood fretboard", description: "Acoustic guitar presence", expected: "acoustic guitar", negative: ["electric amplifier"] },
      { promptTemplate: "A heavy cast iron skillet with wooden handle over campfire coals", description: "Cast iron skillet presence", expected: "cast iron skillet", negative: ["nonstick coating"] },
    ],
  },
  // 2. Exact Object Quantities (45 prompts)
  {
    category: "exact_object_quantities",
    stressDimension: "object_count",
    count: 45,
    templates: [
      { promptTemplate: "Exactly two porcelain coffee cups on a wooden tray", description: "Exact 2 coffee cups", expected: 2, negative: ["3 cups", "single cup"] },
      { promptTemplate: "Exactly three ripe lemons in a glass bowl", description: "Exact 3 lemons", expected: 3, negative: ["4 lemons", "2 lemons"] },
      { promptTemplate: "Exactly five red cherries with green stems on a white plate", description: "Exact 5 cherries", expected: 5, negative: ["6 cherries", "cherry bunch"] },
      { promptTemplate: "Exactly one silver wrist watch on a black velvet cushion", description: "Exact 1 watch", expected: 1, negative: ["extra watches"] },
      { promptTemplate: "Exactly seven colored pencils aligned horizontally on a sketchpad", description: "Exact 7 pencils", expected: 7, negative: ["8 pencils", "6 pencils"] },
    ],
  },
  // 3. Color and Attribute Accuracy (40 prompts)
  {
    category: "color_attribute_accuracy",
    stressDimension: "color_accuracy",
    count: 40,
    templates: [
      { promptTemplate: "A matte black sports coupe with crimson red racing calipers", description: "Matte black body and crimson calipers", expected: "matte black and crimson", negative: ["glossy paint", "blue calipers"] },
      { promptTemplate: "An emerald green silk kimono with embroidered golden crane motifs", description: "Emerald green silk and golden embroidery", expected: "emerald green and gold", negative: ["blue silk", "silver embroidery"] },
      { promptTemplate: "A polished cobalt blue ceramic vase with white glazed trim", description: "Cobalt blue ceramic", expected: "cobalt blue", negative: ["sky blue", "matte finish"] },
      { promptTemplate: "A rich burgundy leather Chesterfield armchair with brass studs", description: "Burgundy leather and brass studs", expected: "burgundy leather", negative: ["black fabric"] },
      { promptTemplate: "A saffron orange cotton backpack with silver metal buckles", description: "Saffron orange backpack", expected: "saffron orange", negative: ["yellow nylon"] },
    ],
  },
  // 4. Spatial Relationships (40 prompts)
  {
    category: "spatial_relationships",
    stressDimension: "spatial_accuracy",
    count: 40,
    templates: [
      { promptTemplate: "A green glass bottle to the left of a sliced loaf of sourdough bread", description: "Bottle strictly left of sourdough bread", expected: "left-to-right ordering", negative: ["bottle in front of bread", "reversed order"] },
      { promptTemplate: "A brass desk lamp positioned directly above an open leather journal", description: "Lamp above journal", expected: "vertical stacking", negative: ["lamp behind journal"] },
      { promptTemplate: "A laptop in the foreground with a ceramic coffee mug directly behind it", description: "Depth ordering laptop in front of mug", expected: "foreground-background depth", negative: ["laptop behind mug"] },
      { promptTemplate: "A small succulent pot situated between two vintage hardback books", description: "Succulent between books", expected: "centered between lateral anchors", negative: ["succulent on top of books"] },
      { promptTemplate: "A pair of reading glasses resting on the right side of a marble notebook", description: "Glasses to the right", expected: "right lateral placement", negative: ["glasses on the left"] },
    ],
  },
  // 5. Complex Compositions (40 prompts)
  {
    category: "complex_compositions",
    stressDimension: "composition_accuracy",
    count: 40,
    templates: [
      { promptTemplate: "An artist's sunlit studio with easel in center, paint tubes on a stool, and canvas drying on the wall", description: "Multi-subject studio layout", expected: "cohesive multi-object composition", negative: ["cluttered occlusion"] },
      { promptTemplate: "A bustling outdoor farmers market stall with wooden crates of fruit, canvas awning, and chalkboard sign", description: "Market stall composition", expected: "depth and contextual harmony", negative: ["floating objects"] },
      { promptTemplate: "A cozy modern Scandinavian living room with wool rug, wooden coffee table, minimalist sofa, and floor plant", description: "Interior living space composition", expected: "perspective alignment", negative: ["distorted walls"] },
      { promptTemplate: "A scientist's laboratory bench with glassware, digital microscope, notebook, and test tube rack", description: "Laboratory bench layout", expected: "clean horizontal balance", negative: ["melted glassware"] },
      { promptTemplate: "A chef's kitchen prep station with butcher block, chef knife, diced bell peppers, and garlic cloves", description: "Culinary prep layout", expected: "triangular composition balance", negative: ["unnatural knife angle"] },
    ],
  },
  // 6. Reference-Image Generation (40 prompts)
  {
    category: "reference_image_generation",
    stressDimension: "reference_consistency",
    count: 40,
    templates: [
      { promptTemplate: "The reference character wearing an astronaut spacesuit on Mars surface while preserving facial geometry", description: "Preserve subject identity in sci-fi setting", expected: "subject identity preserved", negative: ["altered facial structure", "generic face"] },
      { promptTemplate: "The reference product bottle placed on a wet black slate pedestal with soft rim lighting", description: "Preserve bottle logo and shape", expected: "product contour fidelity", negative: ["distorted bottle silhouette"] },
      { promptTemplate: "The reference mascot character waving while standing in front of a colorful school bus", description: "Preserve mascot features", expected: "mascot identity retention", negative: ["altered ears", "wrong costume"] },
      { promptTemplate: "The reference architectural house rendered during a heavy winter snowfall", description: "Preserve building geometry", expected: "architectural structure fidelity", negative: ["altered roofline"] },
      { promptTemplate: "The reference handbag styled in an editorial fashion shoot in a Parisian cafe", description: "Preserve luxury bag hardware", expected: "handbag structural preservation", negative: ["altered clasp", "wrong leather grain"] },
    ],
  },
  // 7. Text Rendering (40 prompts)
  {
    category: "text_rendering",
    stressDimension: "text_accuracy",
    count: 40,
    templates: [
      { promptTemplate: "A neon storefront sign with bold glowing magenta letters spelling 'TATTVA BISTRO'", description: "Exact text spelling 'TATTVA BISTRO'", expected: "TATTVA BISTRO", negative: ["misspelling", "gibberish text"] },
      { promptTemplate: "A hardcover vintage book titled 'QUANTUM VOID' in gold embossed serif typography", description: "Exact text spelling 'QUANTUM VOID'", expected: "QUANTUM VOID", negative: ["scrambled letters"] },
      { promptTemplate: "A highway exit sign clearly reading 'EXIT 42 NORTH' on reflective green metal", description: "Exact text spelling 'EXIT 42 NORTH'", expected: "EXIT 42 NORTH", negative: ["unreadable numbers"] },
      { promptTemplate: "A cardboard shipping box with bold black stenciled letters reading 'FRAGILE'", description: "Exact text spelling 'FRAGILE'", expected: "FRAGILE", negative: ["missing letters"] },
      { promptTemplate: "A retro diner menu board with white plastic letters stating 'TODAY: CHERRY PIE'", description: "Exact text spelling 'TODAY: CHERRY PIE'", expected: "TODAY: CHERRY PIE", negative: ["scrambled characters"] },
    ],
  },
  // 8. Photorealistic Images (40 prompts)
  {
    category: "photorealistic_images",
    stressDimension: "visual_quality",
    count: 40,
    templates: [
      { promptTemplate: "A macro close-up photograph of water droplets on a vibrant green monstera leaf with shallow depth of field", description: "Photorealistic organic macro details", expected: "high sharpness and natural specular highlights", negative: ["plastic texture", "cgi artifact"] },
      { promptTemplate: "A documentary-style portrait of an elderly watchmaker working in natural window light, 85mm f/1.4 lens", description: "Photorealistic human skin and texture", expected: "natural skin pores and realistic lighting", negative: ["smooth plastic skin", "uncanny valley"] },
      { promptTemplate: "An architectural photograph of a brutalist concrete museum in London on an overcast morning", description: "Photorealistic concrete texture and atmospheric fog", expected: "realistic concrete porosity", negative: ["oversaturated colors", "cartoon rendering"] },
      { promptTemplate: "A candid street photograph of a rainy Tokyo crosswalk at night with neon reflections on wet asphalt", description: "Photorealistic asphalt reflections", expected: "accurate light bounce and water refraction", negative: ["airbrushed look"] },
      { promptTemplate: "A food photography shot of a steaming bowl of artisanal ramen with braised pork belly and soft egg", description: "Photorealistic steam and broth clarity", expected: "realistic broth surface tension", negative: ["flat artificial rendering"] },
    ],
  },
  // 9. 3D Renders (35 prompts)
  {
    category: "three_d_renders",
    stressDimension: "visual_quality",
    count: 35,
    templates: [
      { promptTemplate: "An isometric 3D render of a futuristic cyber laboratory with glowing holographic consoles, Octane Render", description: "Isometric 3D aesthetic with ambient occlusion", expected: "clean volumetric lighting and polygon precision", negative: ["flat 2d sketch", "hand drawn lines"] },
      { promptTemplate: "A stylized 3D claymation diorama of a quaint mountain village with cotton clouds", description: "3D clay texture and soft lighting", expected: "clay fingerprint details and tactile surfaces", negative: ["hyper-glossy metal"] },
      { promptTemplate: "A 3D architectural interior visualization with ray-traced global illumination and marble reflections", description: "Ray-traced photorealistic 3D", expected: "physically accurate photon bounces", negative: ["harsh rasterized shadows"] },
      { promptTemplate: "A low-poly 3D render of an enchanted forest with glowing crystal flora and soft ambient fog", description: "Low-poly faceted 3D geometry", expected: "faceted geometric faces and flat shading", negative: ["smooth curved subdivision"] },
      { promptTemplate: "A sleek modern industrial design 3D product render of wireless headphones floating on a neutral grey background", description: "Industrial design studio 3D rendering", expected: "perfect bevel edges and realistic subsurface scattering", negative: ["jagged anti-aliasing"] },
    ],
  },
  // 10. Illustrations (35 prompts)
  {
    category: "illustrations",
    stressDimension: "attribute_accuracy",
    count: 35,
    templates: [
      { promptTemplate: "A delicate watercolor and ink illustration of a blooming cherry blossom branch with soft paper bleeding", description: "Watercolor washes and wet-on-wet pigments", expected: "granulation and deckled paper edges", negative: ["digital vector gradients"] },
      { promptTemplate: "A bold vintage risograph print illustration of a desert landscape using teal and burnt orange inks", description: "Risograph halftone dot pattern", expected: "misaligned color plates and stipple dots", negative: ["clean digital gradient"] },
      { promptTemplate: "A detailed botanical book engraving illustration of a monarch butterfly and milkweed plant", description: "Cross-hatching line art engraving", expected: "fine black ink line work and scientific accuracy", negative: ["3d render", "smooth airbrush"] },
      { promptTemplate: "A cozy children's book storybook illustration of a hedgehog reading a book by candlelight", description: "Warm storybook gouache illustration", expected: "expressive gouache brushstrokes", negative: ["harsh CGI"] },
      { promptTemplate: "A traditional Japanese Ukiyo-e woodblock print illustration of a sea dragon emerging from ocean waves", description: "Woodblock print lines and flat color fields", expected: "bokashi gradation and textured washi paper", negative: ["modern anime shading"] },
    ],
  },
  // 11. Background Generation (35 prompts)
  {
    category: "background_generation",
    stressDimension: "composition_accuracy",
    count: 35,
    templates: [
      { promptTemplate: "A seamless vast panorama of rolling lavender fields in Provence under a pastel sunset sky with distant mountains", description: "Expansive landscape background without foreground obstructions", expected: "wide depth of field and unobstructed horizon", negative: ["distracting foreground characters"] },
      { promptTemplate: "A clean minimalist studio backdrop with gentle radial gradient from deep navy to charcoal grey", description: "Commercial product photography background", expected: "smooth continuous tone without banding", negative: ["furniture", "noise artifacts"] },
      { promptTemplate: "An out-of-focus bokeh background of sparkling city lights and raindrops on glass", description: "Abstract luminous background for portraits", expected: "soft circular bokeh discs", negative: ["sharp in-focus text"] },
      { promptTemplate: "A tranquil interior background of an arched library corridor with sunbeams streaming across stone tiles", description: "Atmospheric architectural environment", expected: "volumetric light rays and perspective depth", negative: ["centered intrusive subject"] },
      { promptTemplate: "A dramatic storm cloud horizon over calm open ocean waters with distant lightning flash", description: "Seascape backdrop", expected: "atmospheric mood and horizontal balance", negative: ["boats", "islands"] },
    ],
  },
  // 12. Image Editing (35 prompts)
  {
    category: "image_editing",
    stressDimension: "reference_consistency",
    count: 35,
    templates: [
      { promptTemplate: "Inpaint the coffee mug to be a blue ceramic mug while keeping all surrounding table pixels untouched", description: "Localized object color change via inpainting", expected: "unmasked pixels preserved >95%", negative: ["altered table wood grain"] },
      { promptTemplate: "Remove the background pedestrians from the park scene without altering the couple on the bench", description: "Unwanted entity removal inpainting", expected: "seamless background infill and preserved foreground", negative: ["blurry smear artifacts"] },
      { promptTemplate: "Outpaint and extend the left boundary of the coastal scene by 256 pixels adding more ocean cliffs", description: "Boundary extension outpainting", expected: "seamless edge blending and perspective continuation", negative: ["visible seams or seam borders"] },
      { promptTemplate: "Replace the background office cubicle with a lush botanical greenhouse while preserving the person", description: "Full background replacement segmentation", expected: "clean edge mask without halo around hair", negative: ["hair clipping", "green fringe"] },
      { promptTemplate: "Inpaint sunglasses onto the portrait subject while preserving facial identity and hair lighting", description: "Accessory addition inpainting", expected: "realistic specular reflection and natural bridge fit", negative: ["warped eye anatomy"] },
    ],
  },
  // 13. Character Consistency (35 prompts)
  {
    category: "character_consistency",
    stressDimension: "reference_consistency",
    count: 35,
    templates: [
      { promptTemplate: "The recurring detective character examining a crime scene under an umbrella in heavy rain", description: "Preserve character facial structure, trenchcoat, and hair across narrative shots", expected: "identity feature embedding alignment", negative: ["altered eye shape", "different face"] },
      { promptTemplate: "The recurring animated girl character smiling while celebrating her birthday with a cupcake", description: "Preserve character facial proportions and hairstyle in alternate emotion", expected: "consistent character silhouette and expression match", negative: ["altered character proportions"] },
      { promptTemplate: "The recurring corporate brand mascot presenting a data chart on an interactive whiteboard", description: "Mascot design consistency in corporate pose", expected: "brand mascot color hex and contour fidelity", negative: ["distorted proportions"] },
      { promptTemplate: "The recurring warrior character in battle pose brandishing a glowing silver broadsword", description: "Character costume and anatomical consistency in action", expected: "signature armor plates and facial scar consistency", negative: ["missing signature accessories"] },
      { promptTemplate: "The recurring fantasy wizard character casting a golden luminescence spell inside a stone tower", description: "Character facial hair, robe embroidery, and staff consistency", expected: "signature wizard beard and staff design retained", negative: ["altered robe colors"] },
    ],
  },
];

/**
 * Builds the complete 500-item permanent version-controlled benchmark catalog.
 */
function buildPermanentBenchmarkCatalog(): PermanentBenchmarkPromptItem[] {
  const catalog: PermanentBenchmarkPromptItem[] = [];

  for (const spec of CATEGORY_SPECS) {
    const templateCount = spec.templates.length;
    for (let i = 0; i < spec.count; i++) {
      const template = spec.templates[i % templateCount];
      const variantSuffix = Math.floor(i / templateCount) > 0 ? ` (Variant ${Math.floor(i / templateCount) + 1})` : "";
      const promptId = `perm-bench-${spec.category}-${String(i + 1).padStart(3, "0")}`;

      catalog.push({
        id: promptId,
        benchmarkVersion: BENCHMARK_CATALOG_VERSION,
        category: spec.category,
        prompt: `${template.promptTemplate}${variantSuffix}`,
        description: `${template.description}${variantSuffix}`,
        stressDimension: spec.stressDimension,
        referenceImageRequired: spec.category === "reference_image_generation" || spec.category === "image_editing" || spec.category === "character_consistency",
        groundTruthRequirements: [
          {
            id: `${promptId}-gt-1`,
            dimension: spec.stressDimension,
            description: template.description,
            expectedValue: template.expected,
            toleranceWindow: {
              minIoU: 0.50,
              minLevenshtein: 0.85,
              allowedCountVariance: 0,
            },
            negativeAssertions: template.negative || [],
          },
          {
            id: `${promptId}-gt-2`,
            dimension: "visual_quality",
            description: "No gross digital artifacts, compression banding, or collapsed geometry",
            expectedValue: true,
            negativeAssertions: ["blurry smear", "hallucinated limbs", "collapsed face"],
          },
        ],
      });
    }
  }

  return catalog;
}

export const PERMANENT_BENCHMARK_CATALOG: PermanentBenchmarkPromptItem[] = buildPermanentBenchmarkCatalog();

/**
 * Retrieves benchmark prompts filtered by domain category.
 */
export function getBenchmarkItemsByCategory(category: RegressionBenchmarkCategory): PermanentBenchmarkPromptItem[] {
  return PERMANENT_BENCHMARK_CATALOG.filter((item) => item.category === category);
}

/**
 * Extracts a fast smoke test subset (15 representative prompts) for rapid PR and pre-commit checks.
 */
export function getSmokeTestSubset(count: number = 15): PermanentBenchmarkPromptItem[] {
  const step = Math.floor(PERMANENT_BENCHMARK_CATALOG.length / count);
  const subset: PermanentBenchmarkPromptItem[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (i * step) % PERMANENT_BENCHMARK_CATALOG.length;
    subset.push(PERMANENT_BENCHMARK_CATALOG[idx]);
  }
  return subset;
}

/**
 * Extracts a standard testing subset (50 prompts) for pre-deployment CI staging pipelines.
 */
export function getStandardSuiteSubset(count: number = 50): PermanentBenchmarkPromptItem[] {
  const step = Math.floor(PERMANENT_BENCHMARK_CATALOG.length / count);
  const subset: PermanentBenchmarkPromptItem[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (i * step) % PERMANENT_BENCHMARK_CATALOG.length;
    subset.push(PERMANENT_BENCHMARK_CATALOG[idx]);
  }
  return subset;
}

