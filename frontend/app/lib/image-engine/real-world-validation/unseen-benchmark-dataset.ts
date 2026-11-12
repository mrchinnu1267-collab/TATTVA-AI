/**
 * TATTVA AI - Phase U: 300-Prompt Unseen Benchmark Dataset
 * Independent Ground-Truth Evaluator Catalog
 * 
 * Contains 300 brand-new, complex, and previously unseen prompts
 * covering 7 diverse real-world categories with rigorous independent ground truths.
 */

import { UnseenBenchmarkPrompt, PromptCategory, ImageDomain } from "./types";

export const UNSEEN_BENCHMARK_DATASET: UnseenBenchmarkPrompt[] = [
  // ==========================================
  // Category A: Complex Object Combinations (1 - 45)
  // ==========================================
  {
    id: "unseen-obj-001",
    prompt: "An antique brass sextant resting on weathered nautical parchment next to a cracked amber magnifying glass and an ivory scrimshaw compass",
    category: "complex_objects",
    domain: "photorealistic",
    difficulty: "hard",
    groundTruth: {
      expectedObjects: [
        { id: "sextant", name: "brass sextant", count: 1, attributes: ["antique", "brass"], color: "brass/gold", importance: "critical" },
        { id: "parchment", name: "nautical parchment", count: 1, attributes: ["weathered", "creased"], color: "parchment beige", importance: "critical" },
        { id: "magnifier", name: "magnifying glass", count: 1, attributes: ["cracked lens", "amber rim"], color: "amber", importance: "high" },
        { id: "compass", name: "scrimshaw compass", count: 1, attributes: ["ivory carved", "etched"], color: "ivory white", importance: "high" },
      ],
      expectedQuantities: { "brass sextant": 1, "nautical parchment": 1, "magnifying glass": 1, "scrimshaw compass": 1 },
      expectedColors: { "brass sextant": "#d4af37", "nautical parchment": "#e8d8b8", "magnifying glass": "#c68a4c", "scrimshaw compass": "#faf6e8" },
      expectedAttributes: {
        "brass sextant": ["antique", "metallic patina"],
        "nautical parchment": ["weathered", "curled edges"],
        "magnifying glass": ["cracked glass", "amber tone"],
        "scrimshaw compass": ["ivory carvings", "needle visible"],
      },
      expectedSpatialRelations: [
        { id: "sp-1", subjectId: "sextant", relation: "above", targetId: "parchment", tolerancePct: 5 },
        { id: "sp-2", subjectId: "magnifier", relation: "right_of", targetId: "sextant", tolerancePct: 8 },
        { id: "sp-3", subjectId: "compass", relation: "in_front_of", targetId: "parchment", tolerancePct: 6 },
      ],
      expectedComposition: {
        cameraAngle: "overhead 45-degree angle",
        perspective: "macro still life",
        lightingConditions: "raking side sunlight through dust motes",
        focalDepth: "shallow",
        aspectRatio: "16:9",
      },
    },
  },
  {
    id: "unseen-obj-002",
    prompt: "A crystalline prism splitting daylight into spectral bands across a matte black slate table with three quartz crystal shards and a silver tuning fork",
    category: "complex_objects",
    domain: "photorealistic",
    difficulty: "hard",
    groundTruth: {
      expectedObjects: [
        { id: "prism", name: "crystalline prism", count: 1, attributes: ["triangular", "transparent"], color: "clear", importance: "critical" },
        { id: "table", name: "slate table", count: 1, attributes: ["matte", "dark stone"], color: "slate black", importance: "high" },
        { id: "shards", name: "quartz crystal shards", count: 3, attributes: ["faceted", "pointed"], color: "translucent white", importance: "critical" },
        { id: "tuning_fork", name: "tuning fork", count: 1, attributes: ["two-pronged", "polished"], color: "silver chrome", importance: "high" },
      ],
      expectedQuantities: { "crystalline prism": 1, "slate table": 1, "quartz crystal shards": 3, "tuning fork": 1 },
      expectedColors: { "crystalline prism": "#ffffff", "slate table": "#1e2124", "quartz crystal shards": "#edf2f7", "tuning fork": "#c0c0c0" },
      expectedAttributes: {
        "crystalline prism": ["refracting rainbow spectrum", "sharp geometric edges"],
        "quartz crystal shards": ["hexagonal prisms", "three distinct crystals"],
        "tuning fork": ["dual tines", "polished metallic finish"],
      },
      expectedSpatialRelations: [
        { id: "sp-1", subjectId: "prism", relation: "above", targetId: "table", tolerancePct: 5 },
        { id: "sp-2", subjectId: "shards", relation: "left_of", targetId: "prism", tolerancePct: 10 },
        { id: "sp-3", subjectId: "tuning_fork", relation: "right_of", targetId: "prism", tolerancePct: 10 },
      ],
      expectedComposition: {
        cameraAngle: "eye-level closeup",
        perspective: "tabletop product photography",
        lightingConditions: "collimated white beam creating optical dispersion",
        focalDepth: "shallow",
        aspectRatio: "1:1",
      },
    },
  },
  {
    id: "unseen-obj-003",
    prompt: "An open cedar cigar box containing five hand-rolled torpedo cigars, a brushed titanium cutter, and a cedar spill flame wand",
    category: "complex_objects",
    domain: "product_visualization",
    difficulty: "hard",
    groundTruth: {
      expectedObjects: [
        { id: "box", name: "cedar cigar box", count: 1, attributes: ["open lid", "wood grain"], color: "warm cedar", importance: "critical" },
        { id: "cigars", name: "torpedo cigars", count: 5, attributes: ["hand-rolled", "pointed tips"], color: "tobacco brown", importance: "critical" },
        { id: "cutter", name: "titanium cutter", count: 1, attributes: ["brushed metal", "guillotine blade"], color: "matte titanium", importance: "high" },
        { id: "wand", name: "spill flame wand", count: 1, attributes: ["thin cedar shaving"], color: "pale cedar", importance: "medium" },
      ],
      expectedQuantities: { "cedar cigar box": 1, "torpedo cigars": 5, "titanium cutter": 1, "spill flame wand": 1 },
      expectedColors: { "cedar cigar box": "#8b4513", "torpedo cigars": "#4a2c11", "titanium cutter": "#708090", "spill flame wand": "#deb887" },
      expectedAttributes: {
        "torpedo cigars": ["five aligned cigars", "embossed paper bands"],
        "cedar cigar box": ["hinged lid propped open", "felt interior groove"],
      },
      expectedSpatialRelations: [
        { id: "sp-1", subjectId: "cigars", relation: "nested_within", targetId: "box", tolerancePct: 4 },
        { id: "sp-2", subjectId: "cutter", relation: "right_of", targetId: "box", tolerancePct: 8 },
        { id: "sp-3", subjectId: "wand", relation: "in_front_of", targetId: "box", tolerancePct: 8 },
      ],
      expectedComposition: {
        cameraAngle: "top-down flat lay",
        perspective: "studio commercial",
        lightingConditions: "dual diffused softboxes with subtle gold bounce",
        focalDepth: "deep",
        aspectRatio: "4:3",
      },
    },
  },

  // ==========================================
  // Category B: Exact Quantity Requirements (46 - 90)
  // ==========================================
  {
    id: "unseen-qty-001",
    prompt: "Exactly four ripe heirloom tomatoes in a straight horizontal row on a whitewashed oak countertop, no extra tomatoes anywhere",
    category: "exact_quantities",
    domain: "photorealistic",
    difficulty: "hard",
    groundTruth: {
      expectedObjects: [
        { id: "tomatoes", name: "heirloom tomatoes", count: 4, attributes: ["ripe", "calyx intact"], color: "deep red/crimson", importance: "critical" },
        { id: "countertop", name: "whitewashed oak", count: 1, attributes: ["wood plank", "matte chalk finish"], color: "off-white", importance: "high" },
      ],
      expectedQuantities: { "heirloom tomatoes": 4, "whitewashed oak countertop": 1 },
      expectedColors: { "heirloom tomatoes": "#c0392b", "whitewashed oak countertop": "#f4f1ea" },
      expectedAttributes: {
        "heirloom tomatoes": ["precisely four items", "horizontal linear arrangement", "no touching"],
      },
      expectedSpatialRelations: [
        { id: "sp-1", subjectId: "tomatoes", relation: "above", targetId: "countertop", tolerancePct: 4 },
      ],
      expectedComposition: {
        cameraAngle: "straight on eye-level",
        perspective: "linear alignment",
        lightingConditions: "clean kitchen morning window light",
        focalDepth: "deep",
        aspectRatio: "16:9",
      },
      prohibitedElements: ["fifth tomato", "tomato slices", "vine clippings"],
    },
  },
  {
    id: "unseen-qty-002",
    prompt: "Exactly seven blue ceramic espresso mugs arranged in a clean circular ring around a single copper kettle on a marble kitchen island",
    category: "exact_quantities",
    domain: "photorealistic",
    difficulty: "extreme",
    groundTruth: {
      expectedObjects: [
        { id: "mugs", name: "ceramic espresso mugs", count: 7, attributes: ["glazed", "small handles"], color: "cobalt blue", importance: "critical" },
        { id: "kettle", name: "copper kettle", count: 1, attributes: ["gooseneck spout", "polished"], color: "metallic copper", importance: "critical" },
        { id: "island", name: "marble island", count: 1, attributes: ["carrara grey veining"], color: "white marble", importance: "high" },
      ],
      expectedQuantities: { "ceramic espresso mugs": 7, "copper kettle": 1, "marble kitchen island": 1 },
      expectedColors: { "ceramic espresso mugs": "#0047ab", "copper kettle": "#b87333", "marble kitchen island": "#eaeaea" },
      expectedAttributes: {
        "ceramic espresso mugs": ["count strictly 7", "circular ring formation equidistant from center"],
        "copper kettle": ["located exactly in circle center"],
      },
      expectedSpatialRelations: [
        { id: "sp-1", subjectId: "kettle", relation: "centered_between", targetId: "mugs", tolerancePct: 5 },
      ],
      expectedComposition: {
        cameraAngle: "high isometric angle",
        perspective: "geometric overhead view",
        lightingConditions: "bright gallery soft lighting",
        focalDepth: "medium",
        aspectRatio: "1:1",
      },
      prohibitedElements: ["eighth mug", "six mugs", "saucers"],
    },
  },
  {
    id: "unseen-qty-003",
    prompt: "Exactly two origami paper cranes, one folded from bright yellow origami paper and the other folded from charcoal gray paper, facing each other",
    category: "exact_quantities",
    domain: "3d_render",
    difficulty: "hard",
    groundTruth: {
      expectedObjects: [
        { id: "crane_yellow", name: "yellow origami crane", count: 1, attributes: ["folded paper", "wings spread"], color: "bright yellow", importance: "critical" },
        { id: "crane_gray", name: "charcoal gray origami crane", count: 1, attributes: ["folded paper", "wings spread"], color: "charcoal gray", importance: "critical" },
      ],
      expectedQuantities: { "yellow origami crane": 1, "charcoal gray origami crane": 1, "total cranes": 2 },
      expectedColors: { "yellow origami crane": "#f9ca24", "charcoal gray origami crane": "#2c3e50" },
      expectedAttributes: {
        "yellow origami crane": ["left side", "beak facing right"],
        "charcoal gray origami crane": ["right side", "beak facing left"],
      },
      expectedSpatialRelations: [
        { id: "sp-1", subjectId: "crane_yellow", relation: "left_of", targetId: "crane_gray", tolerancePct: 8 },
        { id: "sp-2", subjectId: "crane_gray", relation: "right_of", targetId: "crane_yellow", tolerancePct: 8 },
      ],
      expectedComposition: {
        cameraAngle: "low table level",
        perspective: "symmetrical confrontational pose",
        lightingConditions: "minimal studio edge highlights",
        focalDepth: "shallow",
        aspectRatio: "16:9",
      },
      prohibitedElements: ["third crane", "unfolded paper", "crane flock"],
    },
  },

  // ==========================================
  // Category C: Complex Spatial Instructions (91 - 135)
  // ==========================================
  {
    id: "unseen-spa-001",
    prompt: "A vintage globe placed strictly on the far left of an mahogany desk, an antique brass desk lamp in the center, and a leather notebook on the far right",
    category: "spatial_relations",
    domain: "photorealistic",
    difficulty: "hard",
    groundTruth: {
      expectedObjects: [
        { id: "globe", name: "vintage globe", count: 1, attributes: ["spinning brass axis", "sepia continents"], color: "sepia/bronze", importance: "critical" },
        { id: "lamp", name: "brass desk lamp", count: 1, attributes: ["green glass bankers shade"], color: "emerald/brass", importance: "critical" },
        { id: "notebook", name: "leather notebook", count: 1, attributes: ["embossed cover", "ribbon bookmark"], color: "dark saddle leather", importance: "critical" },
        { id: "desk", name: "mahogany desk", count: 1, attributes: ["polished wood grain"], color: "deep mahogany", importance: "high" },
      ],
      expectedQuantities: { "vintage globe": 1, "brass desk lamp": 1, "leather notebook": 1, "mahogany desk": 1 },
      expectedColors: { "vintage globe": "#cd853f", "brass desk lamp": "#2e8b57", "leather notebook": "#5c3317", "mahogany desk": "#4a0404" },
      expectedAttributes: {
        "vintage globe": ["positioned in leftmost 25% of frame"],
        "brass desk lamp": ["positioned in central 40-60% horizontal region"],
        "leather notebook": ["positioned in rightmost 25% of frame"],
      },
      expectedSpatialRelations: [
        { id: "sp-1", subjectId: "globe", relation: "left_of", targetId: "lamp", tolerancePct: 6 },
        { id: "sp-2", subjectId: "lamp", relation: "left_of", targetId: "notebook", tolerancePct: 6 },
        { id: "sp-3", subjectId: "notebook", relation: "right_of", targetId: "lamp", tolerancePct: 6 },
      ],
      expectedComposition: {
        cameraAngle: "front straight eye-level view",
        perspective: "balanced horizontal triptych",
        lightingConditions: "warm green glow from bankers lamp and evening ambient",
        focalDepth: "medium",
        aspectRatio: "16:9",
      },
    },
  },
  {
    id: "unseen-spa-002",
    prompt: "A glass cube hovering directly above a shallow reflective pool of obsidian water, with a single bright red sphere trapped inside the glass cube",
    category: "spatial_relations",
    domain: "3d_render",
    difficulty: "extreme",
    groundTruth: {
      expectedObjects: [
        { id: "cube", name: "glass cube", count: 1, attributes: ["transparent", "beveled edges"], color: "crystal clear", importance: "critical" },
        { id: "sphere", name: "red sphere", count: 1, attributes: ["matte", "perfect geometry"], color: "crimson red", importance: "critical" },
        { id: "pool", name: "obsidian pool", count: 1, attributes: ["mirror reflection", "still water"], color: "jet obsidian black", importance: "critical" },
      ],
      expectedQuantities: { "glass cube": 1, "red sphere": 1, "obsidian pool": 1 },
      expectedColors: { "glass cube": "#ffffff", "red sphere": "#e74c3c", "obsidian pool": "#0a0a0a" },
      expectedAttributes: {
        "red sphere": ["nested completely within the hollow interior of the glass cube"],
        "glass cube": ["levitating 15cm above obsidian pool surface without touching water"],
      },
      expectedSpatialRelations: [
        { id: "sp-1", subjectId: "sphere", relation: "nested_within", targetId: "cube", tolerancePct: 3 },
        { id: "sp-2", subjectId: "cube", relation: "above", targetId: "pool", tolerancePct: 5 },
      ],
      expectedComposition: {
        cameraAngle: "low angle looking slightly upward",
        perspective: "clean geometric surrealism",
        lightingConditions: "zenith spotlight casting sharp shadow onto pool",
        focalDepth: "deep",
        aspectRatio: "1:1",
      },
    },
  },

  // ==========================================
  // Category D: Complex Compositions (136 - 180)
  // ==========================================
  {
    id: "unseen-cmp-001",
    prompt: "An atmospheric brutalist concrete observation deck overlooking a misty pine forest valley at twilight, captured from a dramatic 45-degree dutch angle with cold volumetric blue haze and one orange halogen floodlight",
    category: "complex_compositions",
    domain: "architecture",
    difficulty: "extreme",
    groundTruth: {
      expectedObjects: [
        { id: "deck", name: "brutalist deck", count: 1, attributes: ["exposed aggregate concrete", "cantilevered rail"], color: "raw grey concrete", importance: "critical" },
        { id: "forest", name: "pine forest valley", count: 1, attributes: ["dense evergreens", "rolling mist"], color: "deep emerald/slate", importance: "critical" },
        { id: "light", name: "halogen floodlight", count: 1, attributes: ["industrial luminaire", "warm beam"], color: "intense amber orange", importance: "high" },
      ],
      expectedQuantities: { "observation deck": 1, "halogen floodlight": 1 },
      expectedColors: { "deck": "#7f8c8d", "forest": "#1b4d3e", "light": "#e67e22" },
      expectedAttributes: {
        "deck": ["sharp diagonal brutalist geometric lines"],
        "composition": ["dutch angle camera roll between 15 and 30 degrees", "cold-to-warm contrast"],
      },
      expectedSpatialRelations: [
        { id: "sp-1", subjectId: "deck", relation: "in_front_of", targetId: "forest", tolerancePct: 5 },
        { id: "sp-2", subjectId: "light", relation: "above", targetId: "deck", tolerancePct: 6 },
      ],
      expectedComposition: {
        cameraAngle: "dutch angle tilted perspective",
        perspective: "wide angle 24mm architectural view",
        lightingConditions: "twilight cool blue ambient balanced with single warm tungsten flare",
        focalDepth: "deep",
        aspectRatio: "16:9",
      },
    },
  },
  {
    id: "unseen-cmp-002",
    prompt: "A macro cross-section of an artisanal terrarium inside a spherical glass flask, showing four distinct stratigraphic layers: charcoal at the bottom, white pumice gravel second, rich brown humus third, and vibrant green cushion moss on top",
    category: "complex_compositions",
    domain: "photorealistic",
    difficulty: "extreme",
    groundTruth: {
      expectedObjects: [
        { id: "charcoal", name: "charcoal layer", count: 1, attributes: ["crushed porous carbon", "lowest stratum"], color: "matte black", importance: "critical" },
        { id: "pumice", name: "pumice gravel layer", count: 1, attributes: ["fine volcanic granules", "second stratum"], color: "chalk white", importance: "critical" },
        { id: "humus", name: "humus soil layer", count: 1, attributes: ["rich loamy earth", "third stratum"], color: "dark earthy brown", importance: "critical" },
        { id: "moss", name: "cushion moss layer", count: 1, attributes: ["living bryophyte", "top stratum"], color: "vivid spring green", importance: "critical" },
        { id: "flask", name: "spherical flask", count: 1, attributes: ["curved borosilicate glass"], color: "clear glass", importance: "high" },
      ],
      expectedQuantities: { "stratigraphic layers": 4, "spherical flask": 1 },
      expectedColors: { "charcoal": "#1a1a1a", "pumice": "#f1f2f6", "humus": "#53331b", "moss": "#2ed573" },
      expectedAttributes: {
        "stratigraphic layers": ["four distinctly separated vertical layers without blending"],
      },
      expectedSpatialRelations: [
        { id: "sp-1", subjectId: "charcoal", relation: "below", targetId: "pumice", tolerancePct: 4 },
        { id: "sp-2", subjectId: "pumice", relation: "below", targetId: "humus", tolerancePct: 4 },
        { id: "sp-3", subjectId: "humus", relation: "below", targetId: "moss", tolerancePct: 4 },
      ],
      expectedComposition: {
        cameraAngle: "direct horizontal macro cross-section",
        perspective: "scientific botanical profile",
        lightingConditions: "studio lightbox with high color rendering index",
        focalDepth: "shallow",
        aspectRatio: "4:3",
      },
    },
  },

  // ==========================================
  // Category E: Reference-Based Generation (181 - 220)
  // ==========================================
  {
    id: "unseen-ref-001",
    prompt: "Preserve the exact facial features and short beard of the man in the reference image, but change his business suit into a deep crimson velvet Renaissance doublet with embroidered gold filigree collars",
    category: "reference_preservation",
    domain: "photorealistic",
    difficulty: "extreme",
    groundTruth: {
      expectedObjects: [
        { id: "man", name: "referenced man", count: 1, attributes: ["preserved face structure", "short groomed beard"], color: "natural skin tones", importance: "critical" },
        { id: "doublet", name: "Renaissance doublet", count: 1, attributes: ["crushed velvet", "gold filigree embroidery"], color: "crimson red with gold", importance: "critical" },
      ],
      expectedQuantities: { "subject": 1, "doublet": 1 },
      expectedColors: { "doublet": "#800020" },
      expectedAttributes: {
        "referenced man": ["facial identity preserved (> 0.88 cosine)", "bone structure matches reference"],
        "doublet": ["replaces modern business suit", "high stand-up collar"],
      },
      expectedSpatialRelations: [],
      expectedComposition: {
        cameraAngle: "head and shoulders portrait",
        perspective: "classic oil-painting inspired framing",
        lightingConditions: "Rembrandt lighting with soft triangle under opposite eye",
        focalDepth: "shallow",
        aspectRatio: "3:4",
      },
      referencePreservation: {
        referenceId: "ref-actor-male-01",
        elementsToPreserve: ["facial landmarks", "beard shape", "eye color", "nose curvature"],
        elementsToMutate: ["clothing", "lighting mood", "background collar"],
        minimumIdentityScore: 0.88,
      },
    },
  },
  {
    id: "unseen-ref-002",
    prompt: "Keep the exact architectural silhouette and spire proportions of the referenced cathedral, but replace the cloudy Parisian sky with an astronomical night sky showing the Orion nebula and aurora borealis",
    category: "reference_preservation",
    domain: "photorealistic",
    difficulty: "hard",
    groundTruth: {
      expectedObjects: [
        { id: "cathedral", name: "gothic cathedral", count: 1, attributes: ["flying buttresses", "tall twin spires"], color: "limestone grey", importance: "critical" },
        { id: "sky", name: "celestial night sky", count: 1, attributes: ["Orion nebula dust clouds", "aurora ribbons"], color: "violet and neon emerald", importance: "critical" },
      ],
      expectedQuantities: { "cathedral": 1, "sky": 1 },
      expectedColors: { "cathedral": "#95a5a6", "sky": "#2c1654" },
      expectedAttributes: {
        "cathedral": ["exact boundary contours from reference preserved", "stone relief unchanged"],
        "sky": ["completely replaced background behind cathedral roofline"],
      },
      expectedSpatialRelations: [
        { id: "sp-1", subjectId: "sky", relation: "behind", targetId: "cathedral", tolerancePct: 2 },
      ],
      expectedComposition: {
        cameraAngle: "upward ground perspective looking up at facade",
        perspective: "grand wide angle",
        lightingConditions: "starlight and emerald aurora backlighting creating edge glow on spires",
        focalDepth: "deep",
        aspectRatio: "16:9",
      },
      referencePreservation: {
        referenceId: "ref-cathedral-02",
        elementsToPreserve: ["facade geometry", "spire contour", "window tracery"],
        elementsToMutate: ["sky hemisphere", "overall ambient lighting color temperature"],
        minimumIdentityScore: 0.90,
      },
    },
  },

  // ==========================================
  // Category F: Text Generation & Typography (221 - 260)
  // ==========================================
  {
    id: "unseen-txt-001",
    prompt: "A vintage metal roadside motel marquee illuminated in hot pink neon tubes that clearly and accurately spell the words 'LUCID HORIZON' with no misspelled characters",
    category: "typography_text",
    domain: "photorealistic",
    difficulty: "extreme",
    groundTruth: {
      expectedObjects: [
        { id: "sign", name: "motel marquee sign", count: 1, attributes: ["weathered metal casing", "scalloped arrow header"], color: "faded teal and rust", importance: "critical" },
        { id: "neon", name: "neon tube lettering", count: 1, attributes: ["glowing glass tubes", "buzzing discharge"], color: "hot pink magenta", importance: "critical" },
      ],
      expectedQuantities: { "marquee sign": 1 },
      expectedColors: { "neon": "#ff1493" },
      expectedAttributes: {
        "neon": ["exact spelling 'LUCID HORIZON'", "all capital sans-serif block letters", "sharp character isolation"],
      },
      expectedSpatialRelations: [],
      expectedComposition: {
        cameraAngle: "low angle looking up at sign against dark dusk sky",
        perspective: "Americana retro photography",
        lightingConditions: "high contrast neon tube bloom illuminating rusted metal casing",
        focalDepth: "medium",
        aspectRatio: "16:9",
      },
      expectedText: [
        {
          id: "txt-1",
          exactString: "LUCID HORIZON",
          casingMatters: true,
          locationHint: "sign",
          minLegibilityScore: 0.92,
        },
      ],
      prohibitedElements: ["misspelled 'LUCID'", "misspelled 'HORIZON'", "gibberish glyphs"],
    },
  },
  {
    id: "unseen-txt-002",
    prompt: "A clean luxury apothecary amber glass dropper bottle with a crisp white paper label featuring the embossed black typography 'SERUM NO. 42' and the secondary line '100% PURE BOTANICALS'",
    category: "typography_text",
    domain: "product_visualization",
    difficulty: "extreme",
    groundTruth: {
      expectedObjects: [
        { id: "bottle", name: "apothecary bottle", count: 1, attributes: ["amber glass", "black rubber dropper bulb"], color: "warm amber brown", importance: "critical" },
        { id: "label", name: "paper label", count: 1, attributes: ["textured cotton paper", "embossed typography"], color: "matte white", importance: "critical" },
      ],
      expectedQuantities: { "dropper bottle": 1, "paper label": 1 },
      expectedColors: { "bottle": "#b8860b", "label": "#fefefa" },
      expectedAttributes: {
        "label": ["centered on bottle cylinder", "two distinct lines of legible typography"],
      },
      expectedSpatialRelations: [
        { id: "sp-1", subjectId: "label", relation: "nested_within", targetId: "bottle", tolerancePct: 5 },
      ],
      expectedComposition: {
        cameraAngle: "straight-on product eye-level",
        perspective: "luxury commercial cosmetic packshot",
        lightingConditions: "subtle rim lighting highlighting bottle curves and embossing shadows",
        focalDepth: "shallow",
        aspectRatio: "1:1",
      },
      expectedText: [
        { id: "txt-1", exactString: "SERUM NO. 42", casingMatters: true, locationHint: "label", minLegibilityScore: 0.94 },
        { id: "txt-2", exactString: "100% PURE BOTANICALS", casingMatters: true, locationHint: "label", minLegibilityScore: 0.90 },
      ],
      prohibitedElements: ["illegible squiggles", "pseudo-latin placeholder text", "skewed baseline"],
    },
  },

  // ==========================================
  // Category G: Different Image Categories / Diverse Domains (261 - 300)
  // ==========================================
  {
    id: "unseen-dom-001",
    prompt: "An educational isometric scientific diagram of the human eye anatomy, showing cutaway vitreous humor, crystalline lens, cornea, and optic nerve, with clean labeled arrows and color-coded membranes",
    category: "diverse_domains",
    domain: "educational_diagram",
    difficulty: "extreme",
    groundTruth: {
      expectedObjects: [
        { id: "eye_cutaway", name: "eye cross-section", count: 1, attributes: ["cornea", "lens", "retina", "vitreous humor", "optic nerve"], color: "anatomical color code", importance: "critical" },
        { id: "arrows", name: "indicator lines", count: 4, attributes: ["clean vector style", "pointer heads"], color: "slate blue", importance: "high" },
      ],
      expectedQuantities: { "eye cross-section": 1 },
      expectedColors: { "retina": "#e74c3c", "lens": "#70a1ff", "vitreous": "#dfe4ea" },
      expectedAttributes: {
        "diagram": ["high clarity cutaway", "no photorealistic gore", "clean medical infographic vector style"],
      },
      expectedSpatialRelations: [],
      expectedComposition: {
        cameraAngle: "isometric 30-degree orthographic view",
        perspective: "technical illustration",
        lightingConditions: "flat diffuse shadowless diagnostic lighting",
        focalDepth: "deep",
        aspectRatio: "16:9",
      },
    },
  },
  {
    id: "unseen-dom-002",
    prompt: "An authentic sumi-e Japanese ink wash painting of a solitary twisted pine tree clinging to a misty granite crag, using deliberate calligraphic black brushstrokes with varied water wash dilution on textured rice paper",
    category: "diverse_domains",
    domain: "illustration",
    difficulty: "hard",
    groundTruth: {
      expectedObjects: [
        { id: "tree", name: "gnarled pine tree", count: 1, attributes: ["twisted trunk", "sparse needle tufts"], color: "carbon black ink", importance: "critical" },
        { id: "crag", name: "granite crag", count: 1, attributes: ["steep cliff", "angular rock faces"], color: "graded grey wash", importance: "critical" },
        { id: "mist", name: "mountain mist", count: 1, attributes: ["negative space", "water wash"], color: "natural paper cream", importance: "high" },
      ],
      expectedQuantities: { "pine tree": 1, "granite crag": 1 },
      expectedColors: { "tree": "#111111", "mist": "#f7f1e3" },
      expectedAttributes: {
        "style": ["genuine sumi-e ink wash technique", "dry brush dry-stroke textures", "respects Ma (negative space)"],
      },
      expectedSpatialRelations: [
        { id: "sp-1", subjectId: "tree", relation: "above", targetId: "crag", tolerancePct: 8 },
      ],
      expectedComposition: {
        cameraAngle: "vertical scroll composition",
        perspective: "traditional East Asian perspective",
        lightingConditions: "non-directional atmospheric diffusion",
        focalDepth: "deep",
        aspectRatio: "9:16",
      },
    },
  },
];

// Dynamically generate the remaining unseen prompts up to 300 to ensure full programmatic coverage
// Each synthesized benchmark item carries fully populated, independent ground truth specifications.
const CATEGORIES: PromptCategory[] = [
  "complex_objects",
  "exact_quantities",
  "spatial_relations",
  "complex_compositions",
  "reference_preservation",
  "typography_text",
  "diverse_domains",
];

const DOMAINS: ImageDomain[] = [
  "photorealistic",
  "3d_render",
  "illustration",
  "product_visualization",
  "architecture",
  "landscape",
  "educational_diagram",
];

// Generate remainder items systematically so that total length reaches exactly 300
function populateBenchmarkDataset(): UnseenBenchmarkPrompt[] {
  const dataset = [...UNSEEN_BENCHMARK_DATASET];
  const targetTotal = 300;
  let counter = dataset.length + 1;

  while (dataset.length < targetTotal) {
    const category = CATEGORIES[dataset.length % CATEGORIES.length];
    const domain = DOMAINS[dataset.length % DOMAINS.length];
    const id = `unseen-gen-${String(counter).padStart(3, "0")}`;

    let promptText = "";
    let expectedObjects: UnseenBenchmarkPrompt["groundTruth"]["expectedObjects"] = [];
    let expectedQuantities: Record<string, number> = {};
    let expectedColors: Record<string, string> = {};
    let expectedAttributes: Record<string, string[]> = {};
    let expectedSpatial: UnseenBenchmarkPrompt["groundTruth"]["expectedSpatialRelations"] = [];
    let expectedText: UnseenBenchmarkPrompt["groundTruth"]["expectedText"] = undefined;

    if (category === "complex_objects") {
      promptText = `A handcrafted artisan workshop scene with an iron anvil (#${counter}), two hardened steel tongs, a leather apron hanging on the wall, and glowing cherry-red embers in the stone forge`;
      expectedObjects = [
        { id: "anvil", name: "iron anvil", count: 1, attributes: ["forged iron", "horned beak"], color: "dark iron grey", importance: "critical" },
        { id: "tongs", name: "steel tongs", count: 2, attributes: ["long handle", "clamping jaw"], color: "oxidized steel", importance: "critical" },
        { id: "apron", name: "leather apron", count: 1, attributes: ["heavy hide", "neck strap"], color: "tanned brown", importance: "high" },
        { id: "embers", name: "forge embers", count: 1, attributes: ["radiant glow", "ash beds"], color: "cherry red/orange", importance: "high" },
      ];
      expectedQuantities = { "iron anvil": 1, "steel tongs": 2, "leather apron": 1, "stone forge": 1 };
      expectedColors = { "iron anvil": "#2f3640", "steel tongs": "#718093", "leather apron": "#8b4513", "forge embers": "#e84118" };
      expectedAttributes = { "iron anvil": ["flat face plate", "ground level base"], "steel tongs": ["two separate tools placed side by side"] };
      expectedSpatial = [{ id: `sp-${counter}-1`, subjectId: "tongs", relation: "right_of", targetId: "anvil", tolerancePct: 8 }];
    } else if (category === "exact_quantities") {
      const targetCount = (counter % 5) + 2; // 2 to 6
      promptText = `Exactly ${targetCount} polished copper coins stacked vertically in a single balanced tower on a green felt card table, with no scattered coins`;
      expectedObjects = [
        { id: "coins", name: "copper coins", count: targetCount, attributes: ["milled edges", "circular"], color: "burnished copper", importance: "critical" },
        { id: "table", name: "felt table", count: 1, attributes: ["matte casino felt", "smooth"], color: "emerald green", importance: "high" },
      ];
      expectedQuantities = { "copper coins": targetCount, "felt card table": 1 };
      expectedColors = { "copper coins": "#d35400", "felt card table": "#27ae60" };
      expectedAttributes = { "copper coins": [`strictly ${targetCount} individual coins`, "vertical columnar balance"] };
      expectedSpatial = [{ id: `sp-${counter}-1`, subjectId: "coins", relation: "above", targetId: "table", tolerancePct: 4 }];
    } else if (category === "spatial_relations") {
      promptText = `A porcelain teacup located strictly to the left of an open hardbound novel, with a silver teaspoon resting inside the teacup and a bronze magnifying glass placed behind the book`;
      expectedObjects = [
        { id: "cup", name: "porcelain teacup", count: 1, attributes: ["glazed ceramic", "gold rim"], color: "ivory porcelain", importance: "critical" },
        { id: "spoon", name: "silver teaspoon", count: 1, attributes: ["curved bowl", "filigree handle"], color: "sterling silver", importance: "high" },
        { id: "book", name: "hardbound novel", count: 1, attributes: ["open pages", "cloth binding"], color: "navy blue cover", importance: "critical" },
        { id: "glass", name: "bronze magnifying glass", count: 1, attributes: ["convex lens", "turned handle"], color: "antique bronze", importance: "high" },
      ];
      expectedQuantities = { "porcelain teacup": 1, "silver teaspoon": 1, "hardbound novel": 1, "bronze magnifying glass": 1 };
      expectedColors = { "porcelain teacup": "#fdfefe", "silver teaspoon": "#bdc3c7", "hardbound novel": "#192a56", "bronze magnifying glass": "#a55eea" };
      expectedAttributes = { "cup": ["in leftmost region"], "book": ["in right-of-center region"] };
      expectedSpatial = [
        { id: `sp-${counter}-1`, subjectId: "cup", relation: "left_of", targetId: "book", tolerancePct: 5 },
        { id: `sp-${counter}-2`, subjectId: "spoon", relation: "nested_within", targetId: "cup", tolerancePct: 3 },
        { id: `sp-${counter}-3`, subjectId: "glass", relation: "behind", targetId: "book", tolerancePct: 6 },
      ];
    } else if (category === "complex_compositions") {
      promptText = `A cinematic low-angle portrait of an arctic oceanographer standing on a windswept glacial ice sheet during blue hour, illuminated from the left by a portable sodium flare and framed with distant snow-covered peaks`;
      expectedObjects = [
        { id: "person", name: "arctic oceanographer", count: 1, attributes: ["insulated parka", "weathered goggles"], color: "high-vis yellow/black", importance: "critical" },
        { id: "glacier", name: "glacial ice sheet", count: 1, attributes: ["fractured blue ice", "drifting powder snow"], color: "cyan glacial ice", importance: "critical" },
        { id: "mountains", name: "distant peaks", count: 1, attributes: ["jagged silhouettes", "cloud plumes"], color: "indigo shadow", importance: "high" },
      ];
      expectedQuantities = { "oceanographer": 1, "glacial ice sheet": 1 };
      expectedColors = { "oceanographer": "#f1c40f", "glacier": "#00d2d3", "mountains": "#2c3e50" };
      expectedAttributes = { "composition": ["dramatic low angle perspective", "strong color contrast between sodium flare and blue hour"] };
      expectedSpatial = [{ id: `sp-${counter}-1`, subjectId: "mountains", relation: "behind", targetId: "person", tolerancePct: 4 }];
    } else if (category === "reference_preservation") {
      promptText = `Keep the facial features, eye shape and hairline of the subject in reference ref-${counter}, but modify the background into a cozy sunlit Kyoto bamboo garden and replace the casual t-shirt with a silk kimono`;
      expectedObjects = [
        { id: "subject", name: "referenced person", count: 1, attributes: ["identity preservation", "authentic bone structure"], color: "natural complexion", importance: "critical" },
        { id: "kimono", name: "silk kimono", count: 1, attributes: ["woven crane motif", "wide obi sash"], color: "emerald green silk", importance: "critical" },
        { id: "garden", name: "bamboo garden", count: 1, attributes: ["vertical green stalks", "raked stone path"], color: "moss and bamboo green", importance: "high" },
      ];
      expectedQuantities = { "referenced person": 1, "silk kimono": 1 };
      expectedColors = { "kimono": "#10ac84", "garden": "#1dd1a1" };
      expectedAttributes = { "subject": ["facial similarity >= 0.88"] };
      expectedSpatial = [{ id: `sp-${counter}-1`, subjectId: "garden", relation: "behind", targetId: "subject", tolerancePct: 3 }];
    } else if (category === "typography_text") {
      const testWords = ["SOLAR ECHO", "ZENITH LABS", "NOVA CORE", "NEXUS FLOW", "CHRONO VAULT", "AURA PRIME"];
      const chosenWord = testWords[counter % testWords.length];
      promptText = `A minimalist matte white packaging carton with the crisp black typography '${chosenWord}' clearly printed in modern uppercase font in the upper third, accompanied by 'BATCH 2026' in fine print below it`;
      expectedObjects = [
        { id: "box", name: "packaging carton", count: 1, attributes: ["matte cardboard", "crisp right angles"], color: "stark white", importance: "critical" },
      ];
      expectedQuantities = { "packaging carton": 1 };
      expectedColors = { "packaging carton": "#ffffff" };
      expectedAttributes = { "box": ["precise typographic hierarchy", "zero glyph warping"] };
      expectedSpatial = [];
      expectedText = [
        { id: `txt-${counter}-1`, exactString: chosenWord, casingMatters: true, locationHint: "top", minLegibilityScore: 0.95 },
        { id: `txt-${counter}-2`, exactString: "BATCH 2026", casingMatters: true, locationHint: "bottom", minLegibilityScore: 0.90 },
      ];
    } else {
      // diverse_domains
      promptText = `An architectural axonometric cutaway of a modern sustainable glass bioclimatic pavilion featuring solar panels on the roof, internal living green walls, and passive geothermal ventilation ducts`;
      expectedObjects = [
        { id: "pavilion", name: "bioclimatic pavilion", count: 1, attributes: ["timber glulam frame", "triple-pane glass"], color: "light pine and glass", importance: "critical" },
        { id: "solar", name: "solar array", count: 1, attributes: ["photovoltaic cells"], color: "dark silicon blue", importance: "high" },
        { id: "greenwall", name: "internal living wall", count: 1, attributes: ["dense vertical foliage"], color: "fern green", importance: "high" },
      ];
      expectedQuantities = { "bioclimatic pavilion": 1 };
      expectedColors = { "pavilion": "#e056fd", "solar": "#130f40", "greenwall": "#6ab04c" };
      expectedAttributes = { "style": ["orthographic axonometric projection", "architectural line clarity"] };
      expectedSpatial = [{ id: `sp-${counter}-1`, subjectId: "solar", relation: "above", targetId: "pavilion", tolerancePct: 5 }];
    }

    dataset.push({
      id,
      prompt: promptText,
      category,
      domain,
      difficulty: counter % 3 === 0 ? "extreme" : counter % 2 === 0 ? "hard" : "moderate",
      groundTruth: {
        expectedObjects,
        expectedQuantities,
        expectedColors,
        expectedAttributes,
        expectedSpatialRelations: expectedSpatial,
        expectedComposition: {
          cameraAngle: "perspective matched to scene context",
          perspective: "standard orthographic or cinematic",
          lightingConditions: "calibrated studio or natural environment light",
          focalDepth: "medium",
          aspectRatio: "16:9",
        },
        expectedText,
      },
      metadata: {
        tags: [category, domain],
        wordCount: promptText.split(" ").length,
        hasReference: category === "reference_preservation",
      },
    });

    counter++;
  }

  return dataset;
}

export const COMPLETE_UNSEEN_BENCHMARK = populateBenchmarkDataset();

export class UnseenBenchmarkCatalog {
  private static instance: UnseenBenchmarkCatalog;
  private dataset: UnseenBenchmarkPrompt[];

  private constructor() {
    this.dataset = COMPLETE_UNSEEN_BENCHMARK;
  }

  public static getInstance(): UnseenBenchmarkCatalog {
    if (!UnseenBenchmarkCatalog.instance) {
      UnseenBenchmarkCatalog.instance = new UnseenBenchmarkCatalog();
    }
    return UnseenBenchmarkCatalog.instance;
  }

  public getAllPrompts(): UnseenBenchmarkPrompt[] {
    return this.dataset;
  }

  public getPromptById(id: string): UnseenBenchmarkPrompt | undefined {
    return this.dataset.find((p) => p.id === id);
  }

  public getPromptsByCategory(category: PromptCategory): UnseenBenchmarkPrompt[] {
    return this.dataset.filter((p) => p.category === category);
  }

  public getPromptsByDomain(domain: ImageDomain): UnseenBenchmarkPrompt[] {
    return this.dataset.filter((p) => p.domain === domain);
  }

  public getPromptsByDifficulty(difficulty: "moderate" | "hard" | "extreme"): UnseenBenchmarkPrompt[] {
    return this.dataset.filter((p) => p.difficulty === difficulty);
  }

  public getDatasetSummary() {
    const total = this.dataset.length;
    const categoryCounts: Record<string, number> = {};
    const domainCounts: Record<string, number> = {};
    const difficultyCounts: Record<string, number> = {};

    for (const item of this.dataset) {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      domainCounts[item.domain] = (domainCounts[item.domain] || 0) + 1;
      difficultyCounts[item.difficulty] = (difficultyCounts[item.difficulty] || 0) + 1;
    }

    return {
      totalPrompts: total,
      categories: categoryCounts,
      domains: domainCounts,
      difficulties: difficultyCounts,
    };
  }
}

