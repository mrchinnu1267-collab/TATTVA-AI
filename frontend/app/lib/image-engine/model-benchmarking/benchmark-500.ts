/**
 * TATTVA AI - 500-Prompt Comprehensive Accuracy Benchmark Dataset (Phase J)
 * Rigorously structured challenge catalog for evaluating image models across 7 core dimensions.
 * Exactly 500 prompts with explicit ground-truth expectations.
 */

import { BenchmarkPrompt500, BenchmarkCategory } from "./types";
import { ImageWorkflowType } from "../multi-model-router/types";

export const BENCHMARK_500_PROMPTS: BenchmarkPrompt500[] = [];

function registerPrompts(
  category: BenchmarkCategory,
  subcategory: string,
  workflow: ImageWorkflowType,
  items: Array<{
    prompt: string;
    expectedObjects?: string[];
    expectedCount?: number;
    expectedCountObject?: string;
    expectedColors?: Array<{ object: string; color: string }>;
    expectedMaterials?: Array<{ object: string; material: string }>;
    expectedSpatialRelations?: Array<{
      subject: string;
      relation: "left_of" | "right_of" | "above" | "below" | "in_front_of" | "behind";
      target: string;
    }>;
    expectedText?: string;
    expectedStyle?: string;
    expectedComposition?: {
      cameraAngle?: string;
      framing?: string;
      lighting?: string;
    };
    referenceImage?: string;
    preservationGoal?: string;
  }>
) {
  for (const item of items) {
    BENCHMARK_500_PROMPTS.push({
      id: BENCHMARK_500_PROMPTS.length + 1,
      category,
      subcategory,
      workflow,
      ...item,
    });
  }
}

// ============================================================================
// CATEGORY A: OBJECT ACCURACY (80 Prompts)
// Subcategories: Single Objects (20), Multiple Objects (20), Complex (20), Exact Quantities (20)
// ============================================================================

// A.1 Single Objects (20)
registerPrompts("object_accuracy", "single_objects", "text_to_image", [
  { prompt: "A vintage brass telescope resting on a wooden tripod", expectedObjects: ["telescope", "tripod"] },
  { prompt: "A solitary red ceramic mug with steaming black coffee", expectedObjects: ["ceramic mug", "coffee"] },
  { prompt: "An ornate Venetian masquerade mask decorated with gold filigree", expectedObjects: ["masquerade mask"] },
  { prompt: "A detailed mechanical pocket watch with open gears exposed", expectedObjects: ["pocket watch", "gears"] },
  { prompt: "A lone bonsai tree in an oval terracotta pot", expectedObjects: ["bonsai tree", "pot"] },
  { prompt: "A polished obsidian chess knight on a marble pedestal", expectedObjects: ["chess knight", "pedestal"] },
  { prompt: "A classic acoustic guitar leaning against an aged brick wall", expectedObjects: ["acoustic guitar", "brick wall"] },
  { prompt: "A vintage rotary telephone in pastel turquoise", expectedObjects: ["rotary telephone"] },
  { prompt: "A single ripe golden pineapple on a dark cutting board", expectedObjects: ["pineapple", "cutting board"] },
  { prompt: "A leather-bound antique journal closed with a brass buckle", expectedObjects: ["journal", "buckle"] },
  { prompt: "A handcrafted wooden violin with its bow resting across the strings", expectedObjects: ["violin", "bow"] },
  { prompt: "A vintage brass compass pointing towards north", expectedObjects: ["compass"] },
  { prompt: "A crystal decanter half-filled with amber scotch whiskey", expectedObjects: ["crystal decanter", "whiskey"] },
  { prompt: "An antique cast-iron sewing machine with ornate gold scrollwork", expectedObjects: ["sewing machine"] },
  { prompt: "A modern drone quadcopter hovering steadily in mid-air", expectedObjects: ["drone"] },
  { prompt: "A silver fountain pen with an engraved nib on parchment", expectedObjects: ["fountain pen", "parchment"] },
  { prompt: "A copper kettle emitting a plume of white steam", expectedObjects: ["copper kettle", "steam"] },
  { prompt: "A vintage leather baseball glove clutching an authentic scuffed baseball", expectedObjects: ["baseball glove", "baseball"] },
  { prompt: "A high-end studio microphone with an integrated pop filter", expectedObjects: ["microphone", "pop filter"] },
  { prompt: "A cast bronze miniature statue of an eagle landing on a rocky perch", expectedObjects: ["eagle statue", "perch"] },
]);

// A.2 Multiple Objects (20)
registerPrompts("object_accuracy", "multiple_objects", "text_to_image", [
  { prompt: "A laptop, a steaming ceramic mug, and a spiral notebook on a wooden desk", expectedObjects: ["laptop", "mug", "notebook", "desk"] },
  { prompt: "A glass vase with sunflowers, an open book, and a pair of reading glasses on a windowsill", expectedObjects: ["vase", "sunflowers", "book", "glasses"] },
  { prompt: "A basket of fresh baguettes beside a wheel of gouda cheese and green grapes", expectedObjects: ["baguettes", "cheese", "grapes"] },
  { prompt: "A bicycle with a front wicker basket containing a bundle of lavender flowers", expectedObjects: ["bicycle", "basket", "lavender"] },
  { prompt: "A ceramic teapot surrounded by three porcelain teacups on a bamboo tray", expectedObjects: ["teapot", "teacups", "bamboo tray"] },
  { prompt: "An artist's palette with oil paint dollops, three paintbrushes, and a stretched canvas", expectedObjects: ["palette", "paintbrushes", "canvas"] },
  { prompt: "A silver cocktail shaker, two martini glasses with green olives, and an ice bucket", expectedObjects: ["cocktail shaker", "martini glasses", "ice bucket"] },
  { prompt: "A pair of worn leather hiking boots next to a trekking backpack and a canteen", expectedObjects: ["hiking boots", "backpack", "canteen"] },
  { prompt: "A brass desk lamp illuminating an open world atlas and an antique magnifying glass", expectedObjects: ["desk lamp", "atlas", "magnifying glass"] },
  { prompt: "A wooden cutting board with a kitchen chef knife, three garlic bulbs, and a rosemary sprig", expectedObjects: ["cutting board", "knife", "garlic", "rosemary"] },
  { prompt: "A turntable record player playing a black vinyl disc next to an amplifier and vinyl sleeves", expectedObjects: ["turntable", "vinyl disc", "amplifier"] },
  { prompt: "A clay pitcher, two ceramic bowls, and a loaf of braided challah bread on linen", expectedObjects: ["pitcher", "bowls", "challah bread"] },
  { prompt: "A DSLR camera with a telephoto lens, an extra lens cap, and a camera strap", expectedObjects: ["camera", "telephoto lens", "lens cap"] },
  { prompt: "A bronze mortar and pestle surrounded by dried star anise and cinnamon sticks", expectedObjects: ["mortar and pestle", "star anise", "cinnamon"] },
  { prompt: "A vintage leather suitcase with travel stickers next to an umbrella and trench coat", expectedObjects: ["suitcase", "umbrella", "trench coat"] },
  { prompt: "A glass terrarium housing a succulent and miniature moss beside a misting spray bottle", expectedObjects: ["terrarium", "succulent", "spray bottle"] },
  { prompt: "An espresso machine with a portafilter, a metal milk pitcher, and two demitasse cups", expectedObjects: ["espresso machine", "portafilter", "milk pitcher", "cups"] },
  { prompt: "A wooden chessboard with carved chessmen in mid-game, an hourglass timer, and a score sheet", expectedObjects: ["chessboard", "hourglass", "score sheet"] },
  { prompt: "A microscope, three glass Petri dishes with cultures, and a test tube rack", expectedObjects: ["microscope", "petri dishes", "test tube rack"] },
  { prompt: "A mechanical typewriter, a crumpled paper ball, and a stack of blank typing paper", expectedObjects: ["typewriter", "paper ball", "paper stack"] },
]);

// A.3 Complex Objects (20)
registerPrompts("object_accuracy", "complex_objects", "text_to_image", [
  { prompt: "An intricate skeletonized tourbillon luxury wristwatch mechanism showcasing miniature rubies and gears", expectedObjects: ["tourbillon", "gears", "rubies"] },
  { prompt: "A transparent cutaway view of a jet turbofan engine revealing turbine blades and bypass ducts", expectedObjects: ["turbofan engine", "turbine blades"] },
  { prompt: "An elaborate Gothic church pipe organ with rows of polished pewter pipes and carved filigree woodwork", expectedObjects: ["pipe organ", "pewter pipes"] },
  { prompt: "A Victorian brass astrolabe instrument with movable graduated rings and celestial coordinate markings", expectedObjects: ["astrolabe", "graduated rings"] },
  { prompt: "A steampunk robotic dragonfly with filigree clockwork wings and brass articulated legs", expectedObjects: ["robotic dragonfly", "clockwork wings"] },
  { prompt: "A complex architectural model of a futuristic eco-skyscraper with terraced skygardens", expectedObjects: ["architectural model", "skygardens"] },
  { prompt: "A modular vintage modular synthesizer wall with tangled patch cables and backlit VU meters", expectedObjects: ["modular synthesizer", "patch cables", "meters"] },
  { prompt: "A museum-grade wooden ship model of an 18th-century frigate with complete rigging and sails", expectedObjects: ["ship model", "rigging", "sails"] },
  { prompt: "A high-end carbon-fiber road racing bicycle with integrated cockpit and aerodynamic disc wheels", expectedObjects: ["road bicycle", "disc wheels"] },
  { prompt: "A vintage twin-lens reflex medium format camera cutaway showing interior mirrors and film spool", expectedObjects: ["camera", "mirrors", "film spool"] },
  { prompt: "An ornate Japanese samurai kabuto helmet with golden antler crest and layered iron neck guard", expectedObjects: ["kabuto helmet", "antler crest"] },
  { prompt: "A glass scientific distillation apparatus with coiled condenser tubing and bubbling blue liquid", expectedObjects: ["distillation apparatus", "condenser"] },
  { prompt: "A futuristic cyborg prosthetic arm crafted from matte titanium, braided pneumatic hoses, and carbon fiber", expectedObjects: ["prosthetic arm", "pneumatic hoses"] },
  { prompt: "A detailed grandfather clock with moon phase dial, swinging mercury pendulum, and carved crown", expectedObjects: ["grandfather clock", "pendulum"] },
  { prompt: "A mechanical robotic humanoid hand holding a fragile glass prism refracting a spectrum rainbow", expectedObjects: ["robotic hand", "glass prism"] },
  { prompt: "An exploded diagram model of an electric guitar showing pickups, potentiometers, and maple neck", expectedObjects: ["electric guitar", "pickups", "potentiometers"] },
  { prompt: "A medieval siege trebuchet with rope tensioners, counterweight box, and sling mechanism", expectedObjects: ["trebuchet", "counterweight box"] },
  { prompt: "A deep-sea submersible spherical diving capsule with robotic manipulators and high-intensity quartz lights", expectedObjects: ["submersible", "manipulators", "quartz lights"] },
  { prompt: "A detailed model of the Saturn V rocket on its launch umbilical tower with detailed gantries", expectedObjects: ["saturn v rocket", "launch tower"] },
  { prompt: "An intricate 19th-century kaleidoscope interior view showing symmetrical hexagonal geometry of colored gems", expectedObjects: ["kaleidoscope", "hexagonal geometry"] },
]);

// A.4 Exact Quantities (20)
registerPrompts("object_accuracy", "exact_quantities", "text_to_image", [
  { prompt: "Exactly one red apple sitting on a white ceramic plate", expectedCount: 1, expectedCountObject: "apple" },
  { prompt: "Exactly two porcelain coffee cups on a wooden tray", expectedCount: 2, expectedCountObject: "coffee cup" },
  { prompt: "Exactly three golden oranges in a wicker basket", expectedCount: 3, expectedCountObject: "orange" },
  { prompt: "Exactly four glass marbles on a green felt surface", expectedCount: 4, expectedCountObject: "marble" },
  { prompt: "Exactly five yellow lemons arranged in a straight line", expectedCount: 5, expectedCountObject: "lemon" },
  { prompt: "Exactly six wooden pencils standing upright in a ceramic holder", expectedCount: 6, expectedCountObject: "pencil" },
  { prompt: "Exactly two red dice showing the number six on top", expectedCount: 2, expectedCountObject: "die" },
  { prompt: "Exactly three red wine glasses on a polished mahogany table", expectedCount: 3, expectedCountObject: "wine glass" },
  { prompt: "Exactly four silver keys on a steel split keyring", expectedCount: 4, expectedCountObject: "key" },
  { prompt: "Exactly five macarons in pastel shades lined up on a rectangular plate", expectedCount: 5, expectedCountObject: "macaron" },
  { prompt: "Exactly two white swans swimming side by side on a tranquil lake", expectedCount: 2, expectedCountObject: "swan" },
  { prompt: "Exactly three ceramic plant pots containing small green succulents", expectedCount: 3, expectedCountObject: "plant pot" },
  { prompt: "Exactly four hardcover books stacked vertically from largest to smallest", expectedCount: 4, expectedCountObject: "book" },
  { prompt: "Exactly seven ripe red strawberries on a white cloth napkin", expectedCount: 7, expectedCountObject: "strawberry" },
  { prompt: "Exactly eight chess pawns standing in their starting row on a wooden board", expectedCount: 8, expectedCountObject: "pawn" },
  { prompt: "Exactly three stainless steel spoons resting side by side", expectedCount: 3, expectedCountObject: "spoon" },
  { prompt: "Exactly five green billiard balls grouped on a pool table", expectedCount: 5, expectedCountObject: "billiard ball" },
  { prompt: "Exactly two golden wedding bands interlocking on dark velvet", expectedCount: 2, expectedCountObject: "wedding band" },
  { prompt: "Exactly four sushi nigiri pieces neatly plated on black slate", expectedCount: 4, expectedCountObject: "sushi nigiri" },
  { prompt: "Exactly three blue glass bottles with cork stoppers standing in a row", expectedCount: 3, expectedCountObject: "glass bottle" },
]);

// ============================================================================
// CATEGORY B: ATTRIBUTE ACCURACY (75 Prompts)
// Colors (20), Materials (15), Shapes (15), Clothing (15), Accessories (10)
// ============================================================================

// B.1 Specific Colors (20)
registerPrompts("attribute_accuracy", "colors", "text_to_image", [
  { prompt: "A bright crimson red sports car parked in front of a turquoise blue garage door", expectedColors: [{ object: "sports car", color: "crimson red" }, { object: "garage door", color: "turquoise blue" }] },
  { prompt: "A cobalt blue ceramic teapot next to a pastel yellow cup", expectedColors: [{ object: "teapot", color: "cobalt blue" }, { object: "cup", color: "pastel yellow" }] },
  { prompt: "A vibrant emerald green velvet armchair with deep purple throw pillows", expectedColors: [{ object: "armchair", color: "emerald green" }, { object: "pillows", color: "purple" }] },
  { prompt: "A matte navy blue bicycle leaning against a mustard yellow wall", expectedColors: [{ object: "bicycle", color: "navy blue" }, { object: "wall", color: "mustard yellow" }] },
  { prompt: "A bright orange safety cone resting on dark charcoal grey asphalt", expectedColors: [{ object: "safety cone", color: "orange" }, { object: "asphalt", color: "charcoal grey" }] },
  { prompt: "A magenta silk scarf draped over a cream-colored porcelain mannequin", expectedColors: [{ object: "scarf", color: "magenta" }, { object: "mannequin", color: "cream" }] },
  { prompt: "A glossy cherry red vintage electric guitar with a white pickguard", expectedColors: [{ object: "guitar", color: "cherry red" }, { object: "pickguard", color: "white" }] },
  { prompt: "An indigo denim jacket with brass golden buttons", expectedColors: [{ object: "jacket", color: "indigo" }, { object: "buttons", color: "golden" }] },
  { prompt: "A lavender purple orchid blossoming in a stark white marble pot", expectedColors: [{ object: "orchid", color: "lavender purple" }, { object: "pot", color: "white" }] },
  { prompt: "A jet black cat with piercing lime green eyes resting on a scarlet rug", expectedColors: [{ object: "cat", color: "jet black" }, { object: "eyes", color: "lime green" }, { object: "rug", color: "scarlet" }] },
  { prompt: "A copper orange pumpkin sitting beside a deep violet eggplant on burlap", expectedColors: [{ object: "pumpkin", color: "copper orange" }, { object: "eggplant", color: "violet" }] },
  { prompt: "A sunshine yellow rain jacket hanging on an olive green peg", expectedColors: [{ object: "rain jacket", color: "sunshine yellow" }, { object: "peg", color: "olive green" }] },
  { prompt: "A mint green retro refrigerator in a kitchen with terracotta orange tile floor", expectedColors: [{ object: "refrigerator", color: "mint green" }, { object: "floor", color: "terracotta orange" }] },
  { prompt: "A ruby red cocktail in a crystal coupe garnished with a dark green lime wheel", expectedColors: [{ object: "cocktail", color: "ruby red" }, { object: "lime wheel", color: "dark green" }] },
  { prompt: "A royal blue fountain pen with a silver chrome clip on beige stationery", expectedColors: [{ object: "pen", color: "royal blue" }, { object: "clip", color: "silver" }] },
  { prompt: "A bright fuchsia pink rose in a smoky grey glass vase", expectedColors: [{ object: "rose", color: "fuchsia pink" }, { object: "vase", color: "smoky grey" }] },
  { prompt: "A matte black coffee tumbler with a neon cyan silicone grip band", expectedColors: [{ object: "tumbler", color: "matte black" }, { object: "band", color: "neon cyan" }] },
  { prompt: "A pastel peach macaron next to a matcha green macaron on a slate coaster", expectedColors: [{ object: "macaron", color: "peach" }, { object: "coaster", color: "slate" }] },
  { prompt: "A forest green leather briefcase with antique gold brass clasps", expectedColors: [{ object: "briefcase", color: "forest green" }, { object: "clasps", color: "gold" }] },
  { prompt: "A bright coral orange sofa accented with teal blue lumbar pillows", expectedColors: [{ object: "sofa", color: "coral orange" }, { object: "pillows", color: "teal blue" }] },
]);

// B.2 Materials & Textures (15)
registerPrompts("attribute_accuracy", "materials", "text_to_image", [
  { prompt: "A weathered rough oak dining table with deep wood grain and natural knotholes", expectedMaterials: [{ object: "table", material: "oak wood" }] },
  { prompt: "A sleek brushed stainless steel kitchen faucet with reflective metallic finish", expectedMaterials: [{ object: "faucet", material: "stainless steel" }] },
  { prompt: "A smooth white Carrara marble tabletop with delicate grey veining", expectedMaterials: [{ object: "tabletop", material: "marble" }] },
  { prompt: "A distressed brown full-grain leather bomber jacket showing creased patina", expectedMaterials: [{ object: "jacket", material: "leather" }] },
  { prompt: "A thick chunky knitted wool blanket in oatmeal cream texture", expectedMaterials: [{ object: "blanket", material: "knitted wool" }] },
  { prompt: "A translucent ribbed frosted glass pendant light casting diffused glow", expectedMaterials: [{ object: "pendant light", material: "frosted glass" }] },
  { prompt: "A hammered copper cookware pan with hand-beaten dimple textures", expectedMaterials: [{ object: "pan", material: "hammered copper" }] },
  { prompt: "A matte black twill-weave carbon-fiber automotive hood panel", expectedMaterials: [{ object: "hood panel", material: "carbon fiber" }] },
  { prompt: "A coarse grey concrete architectural wall with formwork tie holes", expectedMaterials: [{ object: "wall", material: "concrete" }] },
  { prompt: "A glossy glazed terracotta planter pot with fine crazing in the enamel", expectedMaterials: [{ object: "pot", material: "terracotta" }] },
  { prompt: "A lustrous pleated silk evening dress catching shimmering highlights", expectedMaterials: [{ object: "dress", material: "silk" }] },
  { prompt: "A rugged porous black volcanic pumice rock resting on dry sand", expectedMaterials: [{ object: "rock", material: "volcanic pumice" }] },
  { prompt: "A cast-iron Dutch oven with textured pebbled enamel exterior", expectedMaterials: [{ object: "dutch oven", material: "cast iron" }] },
  { prompt: "A lightweight woven natural rattan armchair with cane webbed backrest", expectedMaterials: [{ object: "armchair", material: "rattan" }] },
  { prompt: "A faceted crystal prism with sharp beveled edges splitting white light", expectedMaterials: [{ object: "prism", material: "crystal" }] },
]);

// B.3 Shapes & Geometry (15)
registerPrompts("attribute_accuracy", "shapes", "text_to_image", [
  { prompt: "A perfect geometric spherical brass desk ornament resting on a cube pedestal", expectedObjects: ["brass sphere", "cube pedestal"] },
  { prompt: "A sharp triangular glass paperweight with beveled apex", expectedObjects: ["triangular paperweight"] },
  { prompt: "A hexagonal wooden wall shelf unit displaying small succulents", expectedObjects: ["hexagonal shelf"] },
  { prompt: "An octagonal Victorian beveled wall mirror with an ornate gilded frame", expectedObjects: ["octagonal mirror"] },
  { prompt: "A cylindrical concrete pen organizer holding metallic pens", expectedObjects: ["cylindrical organizer"] },
  { prompt: "A conical glass flask with calibrated volume markings on a laboratory bench", expectedObjects: ["conical flask"] },
  { prompt: "A crescent moon shaped golden pendant necklace resting on black velvet", expectedObjects: ["crescent pendant"] },
  { prompt: "A spiral Fibonacci nautilus seashell sliced in half displaying inner chambers", expectedObjects: ["nautilus seashell"] },
  { prompt: "A torus donut shaped ceramic vase with a single dried botanical branch", expectedObjects: ["torus vase"] },
  { prompt: "A rhombus diamond patterned ceramic tiled backsplash in modern kitchen", expectedObjects: ["diamond tile backsplash"] },
  { prompt: "A star dodecahedron geometric bronze lamp casting intricate shadow patterns", expectedObjects: ["dodecahedron lamp"] },
  { prompt: "An elliptical oval wooden coffee table with tapered dowel legs", expectedObjects: ["oval coffee table"] },
  { prompt: "A pyramid shaped crystal paperweight refracting ambient light", expectedObjects: ["pyramid paperweight"] },
  { prompt: "A trapezoidal modern architectural window overlooking a pine forest", expectedObjects: ["trapezoidal window"] },
  { prompt: "A spiral helical staircase constructed from polished oak curving upwards", expectedObjects: ["helical staircase"] },
]);

// B.4 Clothing & Attire (15)
registerPrompts("attribute_accuracy", "clothing", "text_to_image", [
  { prompt: "A portrait of a woman wearing a tailored charcoal tweed double-breasted blazer with peaked lapels", expectedObjects: ["tweed blazer"] },
  { prompt: "A man dressed in a traditional Scottish tartan kilt with sporran and knee-high wool socks", expectedObjects: ["tartan kilt", "sporran"] },
  { prompt: "A dancer wearing a flowing crimson chiffon flamenco dress with ruffled hems", expectedObjects: ["flamenco dress"] },
  { prompt: "A chef wearing a crisp white double-breasted kitchen jacket and a tall pleated toque hat", expectedObjects: ["chef jacket", "toque hat"] },
  { prompt: "A firefighter in full yellow protective turnout gear, reflective stripes, and helmet", expectedObjects: ["turnout gear", "helmet"] },
  { prompt: "A formal black tie tuxedo with satin shawl lapels and a hand-tied black silk bow tie", expectedObjects: ["tuxedo", "bow tie"] },
  { prompt: "A Japanese woman wearing a silk floral kimono tied with an embroidered gold obi sash", expectedObjects: ["kimono", "obi sash"] },
  { prompt: "An astronaut in an extravehicular EVA spacesuit with a gold-coated helmet visor", expectedObjects: ["spacesuit", "helmet visor"] },
  { prompt: "A medical surgeon in sterile ceil blue scrubs, surgical mask, and sterile gloves", expectedObjects: ["scrubs", "mask", "gloves"] },
  { prompt: "A cyclist in a streamlined aerodynamic yellow jersey, padded bib shorts, and cleated shoes", expectedObjects: ["cycling jersey", "bib shorts"] },
  { prompt: "A fisherman wearing heavy-duty orange waterproof bib overalls and rubber rain boots", expectedObjects: ["waterproof overalls", "rain boots"] },
  { prompt: "A classical ballerina wearing an ivory tutu with beaded bodice and pink satin pointe shoes", expectedObjects: ["tutu", "pointe shoes"] },
  { prompt: "A detective in a classic khaki trench coat with shoulder epaulets and a brown felt fedora", expectedObjects: ["trench coat", "fedora"] },
  { prompt: "A medieval knight clad in polished steel plate armor with an armet helmet and chainmail", expectedObjects: ["plate armor", "chainmail"] },
  { prompt: "A cozy winter outfit featuring a cream cable-knit turtleneck sweater and dark corduroy trousers", expectedObjects: ["cable-knit sweater", "corduroy trousers"] },
]);

// B.5 Accessories (10)
registerPrompts("attribute_accuracy", "accessories", "text_to_image", [
  { prompt: "A pair of tortoise-shell round eyeglasses resting on an open book", expectedObjects: ["round eyeglasses", "book"] },
  { prompt: "A silver curb-link chain necklace with an engraved medallion pendant", expectedObjects: ["chain necklace", "medallion"] },
  { prompt: "A wide-brimmed woven straw sun hat with a black grosgrain ribbon band", expectedObjects: ["straw hat", "ribbon band"] },
  { prompt: "A pair of aviator sunglasses with gold wire frames and green polarized lenses", expectedObjects: ["aviator sunglasses"] },
  { prompt: "A pair of brown leather driving gloves with knuckle cutouts and brass snap closures", expectedObjects: ["leather driving gloves"] },
  { prompt: "A classic Panama hat resting on a bamboo walking cane with silver handle", expectedObjects: ["panama hat", "walking cane"] },
  { prompt: "A mechanical titanium pocket knife with carbon fiber inlays folded on denim", expectedObjects: ["pocket knife"] },
  { prompt: "A set of three stacked beaded bracelets made from tiger's eye and lava stone", expectedObjects: ["beaded bracelets"] },
  { prompt: "A leather messenger satchel bag with brass buckle closures over shoulder strap", expectedObjects: ["messenger bag"] },
  { prompt: "A vintage brass monocle attached to a thin gold link chain resting on parchment", expectedObjects: ["monocle", "gold chain"] },
]);

// ============================================================================
// CATEGORY C: SPATIAL ACCURACY (75 Prompts)
// Left & Right (20), Above & Below (15), Front & Behind (15), Foreground/Background (15), Complex (10)
// ============================================================================

// C.1 Left & Right (20)
registerPrompts("spatial_accuracy", "left_and_right", "text_to_image", [
  { prompt: "A red sports car on the left side and a blue bicycle on the right side of a driveway", expectedSpatialRelations: [{ subject: "sports car", relation: "left_of", target: "bicycle" }] },
  { prompt: "A laptop computer positioned on the left and a ceramic coffee mug on the right of a desk", expectedSpatialRelations: [{ subject: "laptop", relation: "left_of", target: "coffee mug" }] },
  { prompt: "A ceramic vase with sunflowers on the left and a stack of books on the right of a wooden table", expectedSpatialRelations: [{ subject: "vase", relation: "left_of", target: "books" }] },
  { prompt: "A golden retriever sitting on the left and a black cat sitting on the right of a stone porch", expectedSpatialRelations: [{ subject: "dog", relation: "left_of", target: "cat" }] },
  { prompt: "A tall oak tree on the left and a red brick chimney house on the right", expectedSpatialRelations: [{ subject: "oak tree", relation: "left_of", target: "house" }] },
  { prompt: "A green glass bottle on the left and a clear drinking glass on the right", expectedSpatialRelations: [{ subject: "bottle", relation: "left_of", target: "glass" }] },
  { prompt: "A brass desk lamp on the right side and an open journal on the left side of a table", expectedSpatialRelations: [{ subject: "journal", relation: "left_of", target: "desk lamp" }] },
  { prompt: "A plate of sushi on the left and a small bowl of soy sauce on the right", expectedSpatialRelations: [{ subject: "sushi", relation: "left_of", target: "soy sauce" }] },
  { prompt: "A digital SLR camera on the left and a smartphone on the right on dark slate", expectedSpatialRelations: [{ subject: "camera", relation: "left_of", target: "smartphone" }] },
  { prompt: "A red apple on the right side and a green pear on the left side of a wooden cutting board", expectedSpatialRelations: [{ subject: "pear", relation: "left_of", target: "apple" }] },
  { prompt: "A glass of orange juice on the left and a fresh croissant on the right of a breakfast plate", expectedSpatialRelations: [{ subject: "juice", relation: "left_of", target: "croissant" }] },
  { prompt: "A blue passport on the left and silver airplane boarding pass on the right", expectedSpatialRelations: [{ subject: "passport", relation: "left_of", target: "boarding pass" }] },
  { prompt: "A white ceramic bowl on the left and a silver fork on the right of a napkin", expectedSpatialRelations: [{ subject: "bowl", relation: "left_of", target: "fork" }] },
  { prompt: "A desktop computer monitor on the left and an external hard drive on the right", expectedSpatialRelations: [{ subject: "monitor", relation: "left_of", target: "hard drive" }] },
  { prompt: "A soccer ball on the left side and a pair of yellow soccer cleats on the right side of grass", expectedSpatialRelations: [{ subject: "soccer ball", relation: "left_of", target: "cleats" }] },
  { prompt: "A brown leather wallet on the left and a set of metal keys on the right of an entryway table", expectedSpatialRelations: [{ subject: "wallet", relation: "left_of", target: "keys" }] },
  { prompt: "A tennis racket on the left and three yellow tennis balls on the right on clay court", expectedSpatialRelations: [{ subject: "racket", relation: "left_of", target: "tennis balls" }] },
  { prompt: "A ceramic teapot on the right and two teacups on the left of a round tray", expectedSpatialRelations: [{ subject: "teacups", relation: "left_of", target: "teapot" }] },
  { prompt: "A paintbrush on the left and a glass jar of rinse water on the right of an easel", expectedSpatialRelations: [{ subject: "paintbrush", relation: "left_of", target: "jar" }] },
  { prompt: "A loaf of sourdough bread on the left and a stick of golden butter on the right of a bread board", expectedSpatialRelations: [{ subject: "sourdough", relation: "left_of", target: "butter" }] },
]);

// C.2 Above & Below (15)
registerPrompts("spatial_accuracy", "above_and_below", "text_to_image", [
  { prompt: "A brass hanging pendant lamp hanging above a round wooden dining table", expectedSpatialRelations: [{ subject: "lamp", relation: "above", target: "table" }] },
  { prompt: "A wooden floating wall shelf positioned directly above an upholstered sofa", expectedSpatialRelations: [{ subject: "shelf", relation: "above", target: "sofa" }] },
  { prompt: "A gilded framed painting hanging on the wall above a brick fireplace mantel", expectedSpatialRelations: [{ subject: "painting", relation: "above", target: "mantel" }] },
  { prompt: "A hot air balloon floating high in the sky above a patchwork quilt of green farm fields", expectedSpatialRelations: [{ subject: "balloon", relation: "above", target: "fields" }] },
  { prompt: "A circular wall clock hanging above a white wooden doorway frame", expectedSpatialRelations: [{ subject: "clock", relation: "above", target: "doorway" }] },
  { prompt: "A sleek flat-screen television mounted on the wall above a low wooden credenza", expectedSpatialRelations: [{ subject: "television", relation: "above", target: "credenza" }] },
  { prompt: "Fluffy white cumulus clouds drifting in the blue sky above a snowy mountain ridge", expectedSpatialRelations: [{ subject: "clouds", relation: "above", target: "ridge" }] },
  { prompt: "A glass terrarium sitting on the top shelf directly above a row of leather encyclopedias", expectedSpatialRelations: [{ subject: "terrarium", relation: "above", target: "encyclopedias" }] },
  { prompt: "An arched stone bridge spanning across and above a flowing babbling brook", expectedSpatialRelations: [{ subject: "bridge", relation: "above", target: "brook" }] },
  { prompt: "A wooden birdhouse mounted on a post above a bed of blossoming red tulips", expectedSpatialRelations: [{ subject: "birdhouse", relation: "above", target: "tulips" }] },
  { prompt: "A ceiling fan with dark mahogany blades spinning above a queen-size bed", expectedSpatialRelations: [{ subject: "fan", relation: "above", target: "bed" }] },
  { prompt: "A full harvest moon shining in the night sky above a calm ocean bay", expectedSpatialRelations: [{ subject: "moon", relation: "above", target: "ocean" }] },
  { prompt: "A magnetic knife strip mounted above a stainless steel kitchen prep counter", expectedSpatialRelations: [{ subject: "knife strip", relation: "above", target: "counter" }] },
  { prompt: "A chalkboard menu hanging suspended above a coffee shop ordering counter", expectedSpatialRelations: [{ subject: "menu", relation: "above", target: "counter" }] },
  { prompt: "A chandelier with sparkling crystal droplets hanging above a grand staircase", expectedSpatialRelations: [{ subject: "chandelier", relation: "above", target: "staircase" }] },
]);

// C.3 In Front Of & Behind (15)
registerPrompts("spatial_accuracy", "front_and_behind", "text_to_image", [
  { prompt: "A wooden park bench standing directly in front of a blooming rose hedge", expectedSpatialRelations: [{ subject: "bench", relation: "in_front_of", target: "rose hedge" }] },
  { prompt: "A vintage sports car parked directly in front of a modern glass mansion", expectedSpatialRelations: [{ subject: "sports car", relation: "in_front_of", target: "mansion" }] },
  { prompt: "A dog sitting on the grass in front of its wooden doghouse", expectedSpatialRelations: [{ subject: "dog", relation: "in_front_of", target: "doghouse" }] },
  { prompt: "A microphone on a chrome stand placed in front of a closed red velvet stage curtain", expectedSpatialRelations: [{ subject: "microphone", relation: "in_front_of", target: "curtain" }] },
  { prompt: "A cyclist standing with their bicycle in front of the Eiffel Tower in Paris", expectedSpatialRelations: [{ subject: "cyclist", relation: "in_front_of", target: "eiffel tower" }] },
  { prompt: "A row of glass perfume bottles displayed in front of a backlit frosted mirror", expectedSpatialRelations: [{ subject: "bottles", relation: "in_front_of", target: "mirror" }] },
  { prompt: "A stone garden sundial standing on lawn in front of a row of cypress trees", expectedSpatialRelations: [{ subject: "sundial", relation: "in_front_of", target: "cypress trees" }] },
  { prompt: "An artist standing in front of their large oil painting on an easel", expectedSpatialRelations: [{ subject: "artist", relation: "in_front_of", target: "painting" }] },
  { prompt: "A small rowboat tied to a wooden dock in front of a distant foggy island", expectedSpatialRelations: [{ subject: "rowboat", relation: "in_front_of", target: "island" }] },
  { prompt: "A ceramic coffee cup sitting on an open book in front of a lit fireplace", expectedSpatialRelations: [{ subject: "coffee cup", relation: "in_front_of", target: "fireplace" }] },
  { prompt: "A street food vendor standing in front of their sizzling wok food stall", expectedSpatialRelations: [{ subject: "vendor", relation: "in_front_of", target: "food stall" }] },
  { prompt: "A bronze equestrian statue positioned in front of a neoclassical museum facade", expectedSpatialRelations: [{ subject: "statue", relation: "in_front_of", target: "museum" }] },
  { prompt: "A grandfather clock standing in the hallway in front of wallpaper with damask pattern", expectedSpatialRelations: [{ subject: "grandfather clock", relation: "in_front_of", target: "wallpaper" }] },
  { prompt: "A cat crouching playfully in front of a fluttering white lace curtain", expectedSpatialRelations: [{ subject: "cat", relation: "in_front_of", target: "curtain" }] },
  { prompt: "A wooden dining chair tucked in front of a round oak dining table", expectedSpatialRelations: [{ subject: "chair", relation: "in_front_of", target: "table" }] },
]);

// C.4 Foreground & Background (15)
registerPrompts("spatial_accuracy", "foreground_and_background", "text_to_image", [
  { prompt: "A close-up sharp red poppy flower in the immediate foreground with soft blurred green hills in the distant background", expectedObjects: ["poppy flower", "hills"] },
  { prompt: "A detailed ceramic coffee mug on a wooden ledge in the foreground with a misty mountain sunrise in the background", expectedObjects: ["coffee mug", "mountains"] },
  { prompt: "Sharp cobblestones and fallen autumn leaves in the foreground with an old European church tower in the blurred background", expectedObjects: ["cobblestones", "leaves", "church tower"] },
  { prompt: "A weathered wooden fence post in the foreground with grazing cows in a sunny meadow in the background", expectedObjects: ["fence post", "cows", "meadow"] },
  { prompt: "A brass pocket compass resting on a rock in the foreground with a cascading waterfall in the background", expectedObjects: ["compass", "waterfall"] },
  { prompt: "A pair of hiking boots resting on a cliff edge in the foreground overlooking an expansive canyon in the background", expectedObjects: ["hiking boots", "canyon"] },
  { prompt: "A camera on a tripod in the foreground capturing an illuminated city skyline at night in the background", expectedObjects: ["camera", "tripod", "city skyline"] },
  { prompt: "A glass jar of wildflowers on a windowsill in the foreground with rain streaking the pane and city street in the background", expectedObjects: ["wildflowers", "window", "city street"] },
  { prompt: "A fisherman casting a rod from shore in the foreground with a cargo ship crossing the horizon in the background", expectedObjects: ["fisherman", "cargo ship"] },
  { prompt: "A campfire with orange embers crackling in the foreground with starry Milky Way sky in the background", expectedObjects: ["campfire", "milky way"] },
  { prompt: "A laptop and open sketchbook in the sharp foreground with a cozy library reading room in the background", expectedObjects: ["laptop", "sketchbook", "library"] },
  { prompt: "A glass of iced lemonade with lemon slice in the foreground with a sunny swimming pool in the background", expectedObjects: ["lemonade", "swimming pool"] },
  { prompt: "A close-up of a pinecone resting on snow in the foreground with a dense winter pine forest in the background", expectedObjects: ["pinecone", "pine forest"] },
  { prompt: "A cluster of ripe purple wine grapes on the vine in the foreground with rolling Tuscan vineyard hills in the background", expectedObjects: ["grapes", "vineyard"] },
  { prompt: "A sculptor's chisels and stone dust on a workbench in the foreground with a partially carved marble statue in the background", expectedObjects: ["chisels", "workbench", "statue"] },
]);

// C.5 Complex Spatial Arrangements (10)
registerPrompts("spatial_accuracy", "complex_arrangements", "text_to_image", [
  { prompt: "A computer desk with a wide monitor in the center, stereo speakers on both sides, a keyboard directly in front, and a desk lamp on the far right", expectedObjects: ["monitor", "speakers", "keyboard", "desk lamp"] },
  { prompt: "A dining table set with a centerpiece floral vase in the center, two wine glasses on the left, a bread basket on the right, and folded linen napkins in front", expectedObjects: ["floral vase", "wine glasses", "bread basket", "napkins"] },
  { prompt: "An art studio layout with an easel holding a canvas in the center, a taboret paint table on the left, and a stool on the right", expectedObjects: ["easel", "canvas", "paint table", "stool"] },
  { prompt: "A living room seating arrangement with a low coffee table in the center, a three-seater sofa behind it, and two matching armchairs facing each other on the sides", expectedObjects: ["coffee table", "sofa", "armchairs"] },
  { prompt: "A breakfast tray with a ceramic teapot in the upper center, a teacup on the lower left, a buttered scone on the lower right, and a small jam jar above the scone", expectedObjects: ["teapot", "teacup", "scone", "jam jar"] },
  { prompt: "A chess game in progress with white pieces at the bottom, black pieces at the top, captured pieces lined up to the right of the board, and a chess clock to the left", expectedObjects: ["chess board", "chess clock", "captured pieces"] },
  { prompt: "A laboratory workbench with a microscope on the left, a row of three test tubes in a rack in the center, and a digital scale on the right", expectedObjects: ["microscope", "test tubes", "scale"] },
  { prompt: "A fireplace hearth with a stone mantelpiece above, a brass fire screen in front of glowing logs, and an iron poker set standing on the right", expectedObjects: ["mantelpiece", "fire screen", "poker set"] },
  { prompt: "A vanity dresser with an arched mirror centered at the back, perfume bottles on the left, a jewelry tray in the middle, and hairbrush on the right", expectedObjects: ["mirror", "perfume bottles", "jewelry tray", "hairbrush"] },
  { prompt: "A conference room with a long boardroom table in the center, four chairs along each side, an executive chair at the head, and a projection screen on the wall behind", expectedObjects: ["boardroom table", "chairs", "projection screen"] },
]);

// ============================================================================
// CATEGORY D: COMPOSITION (70 Prompts)
// Camera Angles (20), Perspective (15), Framing (15), Lighting (20)
// ============================================================================

// D.1 Camera Angles (20)
registerPrompts("composition", "camera_angles", "text_to_image", [
  { prompt: "A low-angle dramatic hero shot of a firefighter looking upward against towering smoke", expectedComposition: { cameraAngle: "low_angle" } },
  { prompt: "A top-down bird's-eye view flatlay photograph of an artisanal charcuterie board", expectedComposition: { cameraAngle: "birds_eye" } },
  { prompt: "An eye-level neutral documentary portrait of an elderly carpenter in his workshop", expectedComposition: { cameraAngle: "eye_level" } },
  { prompt: "A high-angle looking down shot of a busy pedestrian crosswalk with umbrellas in the rain", expectedComposition: { cameraAngle: "high_angle" } },
  { prompt: "A worm's-eye ground-level perspective looking up at towering coastal redwood trees", expectedComposition: { cameraAngle: "worms_eye" } },
  { prompt: "A Dutch angle tilted frame of a detective running down a neon-lit rain-slicked alley", expectedComposition: { cameraAngle: "dutch_angle" } },
  { prompt: "An overhead 90-degree zenith view of a swimmer doing a backstroke in turquoise pool water", expectedComposition: { cameraAngle: "overhead" } },
  { prompt: "A ground-level macro shot of an ant carrying a green leaf across mossy soil", expectedComposition: { cameraAngle: "ground_level" } },
  { prompt: "A low-angle upward perspective of a modern concrete brutalist architecture building against clouds", expectedComposition: { cameraAngle: "low_angle" } },
  { prompt: "A three-quarter portrait angle of a young female violinist tuning her instrument", expectedComposition: { cameraAngle: "three_quarter" } },
  { prompt: "An aerial drone photograph looking straight down at ocean waves crashing onto sand", expectedComposition: { cameraAngle: "aerial_drone" } },
  { prompt: "A low-angle shot of a basketball player mid-air about to slam dunk into the hoop", expectedComposition: { cameraAngle: "low_angle" } },
  { prompt: "A top-down organized flatlay of camera gear, lenses, SD cards, and batteries on felt", expectedComposition: { cameraAngle: "flatlay" } },
  { prompt: "A waist-level medium shot of an artisanal blacksmith hammering red-hot iron on an anvil", expectedComposition: { cameraAngle: "waist_level" } },
  { prompt: "An upward angled perspective of a cathedral's stained glass rose window illuminated by sun", expectedComposition: { cameraAngle: "upward" } },
  { prompt: "A side-profile silhouette of a saxophonist playing under a streetlamp at midnight", expectedComposition: { cameraAngle: "side_profile" } },
  { prompt: "A bird's-eye circular crop view looking down a winding spiral staircase", expectedComposition: { cameraAngle: "birds_eye" } },
  { prompt: "A low-angle action shot of a classic sports car speeding around a racetrack curve", expectedComposition: { cameraAngle: "low_angle" } },
  { prompt: "A high-angle view looking down into an open courtyard market filled with colorful spice sacks", expectedComposition: { cameraAngle: "high_angle" } },
  { prompt: "A straight-on symmetrical architectural photograph of the entrance to a classical museum", expectedComposition: { cameraAngle: "straight_on" } },
]);

// D.2 Perspective (15)
registerPrompts("composition", "perspective", "text_to_image", [
  { prompt: "A one-point perspective photograph of an endless straight railroad track vanishing into the horizon", expectedComposition: { framing: "one_point_perspective" } },
  { prompt: "A two-point perspective corner view of a modern minimalist concrete cube house", expectedComposition: { framing: "two_point_perspective" } },
  { prompt: "A wide-angle 16mm lens perspective showing expansive curved architecture inside an airport terminal", expectedComposition: { framing: "wide_angle" } },
  { prompt: "A telephoto 200mm lens perspective compressing layers of misty mountain ranges", expectedComposition: { framing: "telephoto_compression" } },
  { prompt: "An isometric architectural cutaway view of a two-story loft apartment", expectedComposition: { framing: "isometric" } },
  { prompt: "A dramatic fisheye perspective looking up inside a dense forest canopy", expectedComposition: { framing: "fisheye" } },
  { prompt: "A tunnel perspective looking down an arched stone colonnade with rhythmic shadows", expectedComposition: { framing: "tunnel_perspective" } },
  { prompt: "A long hallway perspective with doors on both sides leading to a bright open window at the end", expectedComposition: { framing: "vanishing_point" } },
  { prompt: "An orthographic straight-on architectural elevation drawing of a Victorian townhouse facade", expectedComposition: { framing: "orthographic" } },
  { prompt: "A forced perspective shot where a person appears to hold up the Leaning Tower of Pisa", expectedComposition: { framing: "forced_perspective" } },
  { prompt: "A deep depth-of-field landscape photograph where both foreground wildflowers and distant glaciers are sharp", expectedComposition: { framing: "deep_depth_of_field" } },
  { prompt: "A shallow depth-of-field portrait with creamy circular bokeh lights in the blurred background", expectedComposition: { framing: "shallow_depth_of_field" } },
  { prompt: "A panoramic wide aspect ratio view of the Grand Canyon during sunset", expectedComposition: { framing: "panoramic" } },
  { prompt: "A narrow focal length perspective framing an alleyway between tall brick tenements", expectedComposition: { framing: "narrow_perspective" } },
  { prompt: "An infinite mirror reflection perspective receding into darkness", expectedComposition: { framing: "infinite_reflection" } },
]);

// D.3 Framing (15)
registerPrompts("composition", "framing", "text_to_image", [
  { prompt: "A rule-of-thirds composition with a solitary lighthouse positioned along the right vertical third line", expectedComposition: { framing: "rule_of_thirds" } },
  { prompt: "A perfectly centered symmetrical portrait of a Tibetan monk in saffron robes against a plain wall", expectedComposition: { framing: "centered_symmetry" } },
  { prompt: "A natural frame-within-a-frame view of a Venetian canal seen through an arched stone bridge", expectedComposition: { framing: "frame_within_frame" } },
  { prompt: "An intimate extreme close-up macro framing of a human eye with detailed iris patterns", expectedComposition: { framing: "extreme_close_up" } },
  { prompt: "A wide cinematic establishing shot of a futuristic desert outpost during a dust storm", expectedComposition: { framing: "wide_establishing" } },
  { prompt: "A medium close-up portrait of a barista pouring latte art with focused concentration", expectedComposition: { framing: "medium_close_up" } },
  { prompt: "A landscape framed naturally by overhanging weeping willow branches in the upper corners", expectedComposition: { framing: "natural_framing" } },
  { prompt: "A golden ratio spiral composition with a swirling nautilus shell and ambient sand ripples", expectedComposition: { framing: "golden_ratio" } },
  { prompt: "A tight Dutch frame cropping a vintage typewriter with fingers striking mechanical keys", expectedComposition: { framing: "tight_crop" } },
  { prompt: "An asymmetrical dynamic composition with negative space occupying two-thirds of the canvas", expectedComposition: { framing: "negative_space" } },
  { prompt: "A framed view of the moon seen through the triangular opening of a camping tent flap", expectedComposition: { framing: "tent_framing" } },
  { prompt: "A portrait framed by the circular porthole of an ocean passenger liner", expectedComposition: { framing: "circular_porthole" } },
  { prompt: "A diagonal leading lines composition following a wooden boardwalk cutting across sand dunes", expectedComposition: { framing: "leading_lines" } },
  { prompt: "A silhouette of a child framed inside an illuminated square doorway at twilight", expectedComposition: { framing: "doorway_silhouette" } },
  { prompt: "A high-key minimalist composition with a single cherry blossom branch isolated on pure white space", expectedComposition: { framing: "minimalist_high_key" } },
]);

// D.4 Lighting Schemes (20)
registerPrompts("composition", "lighting", "text_to_image", [
  { prompt: "Golden hour warm sunlight casting long soft shadows across a ripe wheat field", expectedComposition: { lighting: "golden_hour" } },
  { prompt: "Moody dramatic chiaroscuro lighting illuminating a philosopher's face like a Caravaggio painting", expectedComposition: { lighting: "chiaroscuro" } },
  { prompt: "Stark high-contrast black-and-white film noir lighting through venetian blinds on a detective's desk", expectedComposition: { lighting: "film_noir" } },
  { prompt: "Cool blue hour twilight lighting over a misty Nordic lake with calm reflections", expectedComposition: { lighting: "blue_hour" } },
  { prompt: "Vibrant neon cyberpunk lighting with cyan and magenta neon glow reflecting on wet asphalt", expectedComposition: { lighting: "neon_cyberpunk" } },
  { prompt: "Soft diffused overcast studio lighting on a ceramic beauty product bottle", expectedComposition: { lighting: "soft_diffused" } },
  { prompt: "A single flickering warm candle light illuminating an open manuscript in a dark stone room", expectedComposition: { lighting: "candlelight" } },
  { prompt: "Dappled sunlight filtering through a leafy forest canopy creating mottled light patches on the forest floor", expectedComposition: { lighting: "dappled_sunlight" } },
  { prompt: "Rim lighting separating a dark black stallion from a pitch-black background with a crisp silver outline", expectedComposition: { lighting: "rim_lighting" } },
  { prompt: "Harsh midday desert sun creating razor-sharp dark shadows beneath sand dunes", expectedComposition: { lighting: "harsh_midday" } },
  { prompt: "Ethereal volumetric God rays streaming through high cathedral windows in dust-mote air", expectedComposition: { lighting: "volumetric_god_rays" } },
  { prompt: "Bioluminescent turquoise glow emitted by deep-sea jellyfish in pitch-black ocean water", expectedComposition: { lighting: "bioluminescence" } },
  { prompt: "Warm fireplace hearth glow illuminating two people reading in leather armchairs", expectedComposition: { lighting: "firelight" } },
  { prompt: "High-key brightly illuminated commercial studio lighting with virtually zero shadows", expectedComposition: { lighting: "high_key" } },
  { prompt: "Backlit silhouette of a surfer holding a surfboard at sunset with orange sun halo", expectedComposition: { lighting: "backlit_silhouette" } },
  { prompt: "Studio three-point lighting with soft key light, gentle fill, and crisp hair rim light on a portrait", expectedComposition: { lighting: "three_point_lighting" } },
  { prompt: "Underwater caustics dancing across the sandy bottom of a shallow tropical reef", expectedComposition: { lighting: "water_caustics" } },
  { prompt: "Dramatic lightning flash illuminating the exterior of a Victorian gothic mansion during a thunderstorm", expectedComposition: { lighting: "lightning_flash" } },
  { prompt: "Strobe flash high-speed freeze lighting of water droplets colliding in air", expectedComposition: { lighting: "strobe_freeze" } },
  { prompt: "Sodium vapor amber streetlamp lighting casting yellow pools of light along an empty city sidewalk", expectedComposition: { lighting: "sodium_vapor" } },
]);

// ============================================================================
// CATEGORY E: REFERENCE ACCURACY (60 Prompts)
// Subject Preservation (15), Composition Transfer (15), Style Transfer (15), Modifications (15)
// ============================================================================

// E.1 Subject Preservation (15)
registerPrompts("reference_accuracy", "subject_preservation", "character_preservation", [
  { prompt: "Maintain the character's facial features and brown curly hair, but place them in a formal astronaut spacesuit", preservationGoal: "face_and_hair" },
  { prompt: "Keep the exact ceramic teapot shape and floral pattern, but render it on a polished marble kitchen counter", preservationGoal: "teapot_shape_and_pattern" },
  { prompt: "Preserve the unique architectural facade of the stone cottage, but set it in a winter blizzard with snow-covered roof", preservationGoal: "cottage_facade" },
  { prompt: "Keep the character's face, spectacles, and beard exactly consistent, wearing a green wool sweater in an autumn park", preservationGoal: "face_and_glasses" },
  { prompt: "Maintain the vintage sports car's body lines and crimson red color, driving across an empty salt flat desert", preservationGoal: "car_body_and_color" },
  { prompt: "Preserve the cat's calico patch pattern and green eyes, sleeping curled up on an orange knitted blanket", preservationGoal: "cat_fur_pattern" },
  { prompt: "Keep the character's facial identity and silver hair, seated in a high-tech modern office reading a tablet", preservationGoal: "facial_identity" },
  { prompt: "Maintain the wooden chair's curved spindle backrest and oak grain, placed in an art gallery beside a bronze sculpture", preservationGoal: "chair_design" },
  { prompt: "Preserve the dog's golden retriever face and distinctive white chest patch, running across a sandy beach", preservationGoal: "dog_markings" },
  { prompt: "Keep the character's facial structure and sharp jawline, dressed in traditional Japanese kimono in a tea garden", preservationGoal: "facial_structure" },
  { prompt: "Maintain the guitar's sunburst finish and mother-of-pearl fretboard inlays, resting on a leather studio sofa", preservationGoal: "guitar_finish" },
  { prompt: "Preserve the product bottle's cylindrical geometry and frosted glass texture, placed on dark volcanic rock with water droplets", preservationGoal: "bottle_geometry" },
  { prompt: "Keep the character's identical face, eye color, and smile, laughing while holding a steaming mug in a ski lodge", preservationGoal: "face_and_expression" },
  { prompt: "Maintain the mechanical watch's skeleton dial and blued hands, displayed on a jeweler's suede tray under spotlight", preservationGoal: "watch_dial" },
  { prompt: "Preserve the illustrated mascot character's proportion, ears, and facial expression, jumping joyfully with confetti", preservationGoal: "mascot_features" },
]);

// E.2 Composition Transfer (15)
registerPrompts("reference_accuracy", "composition_transfer", "composition_transfer", [
  { prompt: "Transfer the spatial arrangement of the objects in the reference image into a futuristic cyberpunk setting", preservationGoal: "spatial_layout" },
  { prompt: "Keep the exact geometric pose of the person in the reference, but change their attire to medieval plate armor", preservationGoal: "human_pose" },
  { prompt: "Replicate the triangular balance of the three figures in the reference image, rendered as three forest animals", preservationGoal: "triangular_composition" },
  { prompt: "Maintain the depth layers (foreground table, midground window, distant mountains) with different decorative elements", preservationGoal: "depth_layering" },
  { prompt: "Match the one-point perspective and vanishing point alignment of the reference hallway in a sci-fi spacecraft corridor", preservationGoal: "perspective_alignment" },
  { prompt: "Preserve the silhouette pose and stance of the dancer in the reference, illuminated by a spotlight on a dark stage", preservationGoal: "dancer_pose" },
  { prompt: "Keep the left-to-right spatial hierarchy of the building structures, replacing classical columns with glass pillars", preservationGoal: "spatial_hierarchy" },
  { prompt: "Recreate the framing and camera angle of the reference portrait, featuring a woman with braided silver hair", preservationGoal: "camera_framing" },
  { prompt: "Follow the S-curve road composition of the reference landscape, rendered as an alpine mountain pass in autumn", preservationGoal: "s_curve_composition" },
  { prompt: "Maintain the diagonal dynamic action line of the athlete, changing the sport from tennis to badminton", preservationGoal: "diagonal_action_line" },
  { prompt: "Match the circular tabletop arrangement of plates and cups from the reference with traditional tea ceremony items", preservationGoal: "tabletop_geometry" },
  { prompt: "Preserve the high-angle perspective looking down into the courtyard, changing the setting to a Japanese rock garden", preservationGoal: "high_angle_framing" },
  { prompt: "Keep the exact head tilt, eye gaze direction, and shoulder angle of the reference model in a painterly style", preservationGoal: "portrait_pose" },
  { prompt: "Maintain the rule-of-thirds placement of the main subject on the right third line in a desolate coastal scene", preservationGoal: "rule_of_thirds" },
  { prompt: "Replicate the arch framing from the reference image, framing an ancient Grecian temple ruin through cypress trees", preservationGoal: "arch_framing" },
]);

// E.3 Style Transfer (15)
registerPrompts("reference_accuracy", "style_transfer", "style_transfer", [
  { prompt: "Render a bustling Tokyo intersection in the distinctive impasto oil painting style of Vincent van Gogh", expectedStyle: "van_gogh_impasto" },
  { prompt: "Transform a portrait of a woman into a 1920s Art Deco poster with geometric gold foil lines and flat colors", expectedStyle: "art_deco" },
  { prompt: "Render a quiet canal in Amsterdam in the delicate sumi-e Japanese ink wash painting aesthetic", expectedStyle: "sumi_e_ink" },
  { prompt: "Transform an apple on a table into a Cubist geometric abstraction in the style of Pablo Picasso", expectedStyle: "cubism" },
  { prompt: "Render a fantasy castle on a mountain in the 1980s retro anime watercolor background style", expectedStyle: "retro_anime_watercolor" },
  { prompt: "Depict a modern sports car in the vibrant psychedelic pop art silkscreen print style of Andy Warhol", expectedStyle: "pop_art_silkscreen" },
  { prompt: "Render a forest landscape in the atmospheric Hudson River School romanticist painting style with glowing skies", expectedStyle: "hudson_river_school" },
  { prompt: "Transform a city street photograph into a vintage 19th-century cyanotype blue contact print", expectedStyle: "cyanotype" },
  { prompt: "Depict a bouquet of wild roses in the soft pastel impressionist brushwork of Claude Monet", expectedStyle: "impressionism" },
  { prompt: "Render a mechanical robot in the intricate Renaissance sketchbook sepia pen-and-ink style of Leonardo da Vinci", expectedStyle: "da_vinci_sketch" },
  { prompt: "Transform a portrait into a bold Bauhaus constructivist graphic design poster with primary red, blue, and yellow", expectedStyle: "bauhaus_constructivist" },
  { prompt: "Depict a sleeping fox in the Nordic folk art flat illustration style with stylized floral patterns", expectedStyle: "nordic_folk_art" },
  { prompt: "Render an ocean wave in the traditional Japanese woodblock print ukiyo-e style of Hokusai", expectedStyle: "ukiyo_e_woodblock" },
  { prompt: "Transform a medieval cathedral into a stained glass window mosaic illuminated with vibrant backlighting", expectedStyle: "stained_glass" },
  { prompt: "Depict a coffee shop interior in the warm vintage American realist painting style of Edward Hopper", expectedStyle: "edward_hopper" },
]);

// E.4 Requested Modifications (15)
registerPrompts("reference_accuracy", "requested_modifications", "inpainting", [
  { prompt: "Replace the red sports car in the driveway with a dark green classic vintage pickup truck", preservationGoal: "change_vehicle" },
  { prompt: "Change the woman's casual cotton t-shirt to a formal black evening gown while keeping everything else identical", preservationGoal: "change_clothing" },
  { prompt: "Remove the unwanted telephone poles and overhead electrical wires from the sky above the cottage", preservationGoal: "remove_wires" },
  { prompt: "Replace the cloudy grey overcast sky in the background with a vibrant warm sunset with orange and violet clouds", preservationGoal: "replace_sky" },
  { prompt: "Add a sleeping ginger tabby cat onto the empty wooden bench in the garden", preservationGoal: "add_cat" },
  { prompt: "Change the color of the living room sofa from navy blue to olive green velvet while preserving the cushions", preservationGoal: "change_sofa_color" },
  { prompt: "Replace the empty white ceramic plate on the table with a bowl of hot ramen noodles with egg and scallions", preservationGoal: "replace_plate_with_ramen" },
  { prompt: "Remove the modern wristwatch from the subject's arm in the historical costume photo", preservationGoal: "remove_watch" },
  { prompt: "Change the season in the landscape from summer green to autumn golden orange foliage on the trees", preservationGoal: "season_shift" },
  { prompt: "Add a brass desk lamp casting a warm circle of light onto the open book on the desk", preservationGoal: "add_lamp" },
  { prompt: "Replace the background office wall with a floor-to-ceiling glass window overlooking a sunny Manhattan skyline", preservationGoal: "replace_background" },
  { prompt: "Change the subject's expression from serious to a warm natural smile without altering facial features", preservationGoal: "change_expression" },
  { prompt: "Add a gold wedding band onto the subject's left ring finger", preservationGoal: "add_ring" },
  { prompt: "Remove the tourists in the background of the monument photo, leaving only the empty stone plaza", preservationGoal: "remove_people" },
  { prompt: "Extend the boundaries of the canvas to the left and right, revealing more of the coastal shoreline", preservationGoal: "outpaint_shoreline" },
]);

// ============================================================================
// CATEGORY F: TEXT ACCURACY (70 Prompts)
// Exact Words (20), Numbers (15), Signs (15), Labels (10), Typography (10)
// ============================================================================

// F.1 Exact Words (20)
registerPrompts("text_accuracy", "exact_words", "text_to_image", [
  { prompt: "A vintage wooden signboard hanging outside a bakery with the carved word \"FRESH BREAD\"", expectedText: "FRESH BREAD" },
  { prompt: "A minimalist white ceramic coffee mug with the single black word \"MORNING\" printed on its side", expectedText: "MORNING" },
  { prompt: "A red neon sign glowing in a dark wet alleyway spelling the word \"COFFEE\"", expectedText: "COFFEE" },
  { prompt: "An open kraft paper gift box with an embossed gold foil tag reading \"THANKS\"", expectedText: "THANKS" },
  { prompt: "A blue cotton tote bag hanging on a hook with bold white typography stating \"LIBRARY\"", expectedText: "LIBRARY" },
  { prompt: "A brass door knocker mounted on a navy door above a plaque reading \"WELCOME\"", expectedText: "WELCOME" },
  { prompt: "A vintage metal tin canister labeled with clean retro lettering \"SUGAR\"", expectedText: "SUGAR" },
  { prompt: "An enamel metal camping mug with the navy blue word \"EXPLORE\" painted across the front", expectedText: "EXPLORE" },
  { prompt: "A chalkboard sign sitting on an easel outside a florist reading \"FLOWERS\"", expectedText: "FLOWERS" },
  { prompt: "A modern glass perfume bottle with an elegant serif label reading \"VERDANT\"", expectedText: "VERDANT" },
  { prompt: "A wooden directional trail marker post in a forest pointing right with the carved word \"SUMMIT\"", expectedText: "SUMMIT" },
  { prompt: "A retro diner menu cover in script lettering spelling \"PANCAKES\"", expectedText: "PANCAKES" },
  { prompt: "A leather bookmark with gold stamped capital letters reading \"READING\"", expectedText: "READING" },
  { prompt: "A bright yellow caution safety wet-floor cone displaying the printed word \"CAUTION\"", expectedText: "CAUTION" },
  { prompt: "A vintage postal telegram paper with typewriter monospace text reading \"ARRIVED SAFELY\"", expectedText: "ARRIVED SAFELY" },
  { prompt: "A hardcover book spine resting on a wooden shelf with gold lettering reading \"SILENCE\"", expectedText: "SILENCE" },
  { prompt: "A modern subway station ceramic tile wall displaying the station name \"CENTRAL\"", expectedText: "CENTRAL" },
  { prompt: "A painted wooden sailboat transom stern showing the boat name \"AURORA\"", expectedText: "AURORA" },
  { prompt: "An antique apothecary dark amber glass jar with a paper label reading \"LAVENDER\"", expectedText: "LAVENDER" },
  { prompt: "A cinema marquee sign with glowing lightbox letters spelling \"NOW SHOWING\"", expectedText: "NOW SHOWING" },
]);

// F.2 Numbers (15)
registerPrompts("text_accuracy", "numbers", "text_to_image", [
  { prompt: "An athletic running jersey with the bold white number \"42\" printed on the chest", expectedText: "42" },
  { prompt: "A vintage red sports racecar with the white circular number decal \"07\" on its hood", expectedText: "07" },
  { prompt: "A black cast-iron house number plaque on brick displaying the digits \"108\"", expectedText: "108" },
  { prompt: "A circular analog wall clock with clear roman numerals pointing to XII and VI", expectedText: "XII" },
  { prompt: "A yellow American school bus with the route number \"24\" painted in black above the windshield", expectedText: "24" },
  { prompt: "A digital countdown timer on a laboratory device displaying bright green digits \"00:45\"", expectedText: "00:45" },
  { prompt: "A metal hotel room key fob with an engraved brass tag reading \"204\"", expectedText: "204" },
  { prompt: "A basketball jersey in royal blue with the golden number \"23\" across the front", expectedText: "23" },
  { prompt: "A leather luggage tag with stamped silver digits \"1984\"", expectedText: "1984" },
  { prompt: "A train carriage flank displaying the passenger car number \"715\" in yellow stencil", expectedText: "715" },
  { prompt: "A circular metal speed limit road sign clearly reading \"50\"", expectedText: "50" },
  { prompt: "A vintage wooden post office mailbox door with brass combination dial and box number \"312\"", expectedText: "312" },
  { prompt: "A calendar page showing the large bold numeral \"15\" circled in red marker", expectedText: "15" },
  { prompt: "An aircraft tail wing displaying the registration letters and numbers \"N104A\"", expectedText: "N104A" },
  { prompt: "A football jersey with the prominent white back number \"10\"", expectedText: "10" },
]);

// F.3 Signs (15)
registerPrompts("text_accuracy", "signs", "text_to_image", [
  { prompt: "An octagonal red metal road sign with crisp white border and letters reading \"STOP\"", expectedText: "STOP" },
  { prompt: "A triangular metal traffic warning sign displaying the word \"YIELD\"", expectedText: "YIELD" },
  { prompt: "A green reflective highway exit sign with white bold text reading \"AIRPORT\"", expectedText: "AIRPORT" },
  { prompt: "A reversible wooden shop door sign turned to the side reading \"OPEN\"", expectedText: "OPEN" },
  { prompt: "A reversible wooden shop door sign turned to the side reading \"CLOSED\"", expectedText: "CLOSED" },
  { prompt: "A luminous emergency exit sign glowing green above a doorway with the word \"EXIT\"", expectedText: "EXIT" },
  { prompt: "A metal security fence sign with bold black capital letters reading \"NO TRESPASSING\"", expectedText: "NO TRESPASSING" },
  { prompt: "A white subway tile wall displaying a black stencil sign reading \"PULL\"", expectedText: "PULL" },
  { prompt: "A brushed stainless steel elevator button panel with the illuminated floor \"LOBBY\"", expectedText: "LOBBY" },
  { prompt: "A library door with a frosted glass pane reading \"QUIET ZONE\"", expectedText: "QUIET ZONE" },
  { prompt: "A wooden park boardwalk sign reading \"KEEP OFF GRASS\"", expectedText: "KEEP OFF GRASS" },
  { prompt: "A yellow construction barricade board with black stencil letters reading \"DETOUR\"", expectedText: "DETOUR" },
  { prompt: "A vintage porcelain street corner sign displaying \"MAIN ST\"", expectedText: "MAIN ST" },
  { prompt: "A red emergency box on a wall with white lettering \"FIRE HOSE\"", expectedText: "FIRE HOSE" },
  { prompt: "A circular blue parking sign with the white capital letter \"P\"", expectedText: "P" },
]);

// F.4 Product Labels (10)
registerPrompts("text_accuracy", "product_labels", "text_to_image", [
  { prompt: "A brown glass craft beer bottle with an artisanal label reading \"GOLDEN ALE\"", expectedText: "GOLDEN ALE" },
  { prompt: "A tin jar of organic loose leaf green tea labeled with the words \"SENCHA TEA\"", expectedText: "SENCHA TEA" },
  { prompt: "A cylindrical cardboard coffee bean bag with a stamp reading \"DARK ROAST\"", expectedText: "DARK ROAST" },
  { prompt: "A glass olive oil bottle with a green label indicating \"EXTRA VIRGIN\"", expectedText: "EXTRA VIRGIN" },
  { prompt: "A round metal tin of mustache wax with vintage typography reading \"BEARD BALM\"", expectedText: "BEARD BALM" },
  { prompt: "A luxury matte black candle vessel with an embossed gold label \"CEDARWOOD\"", expectedText: "CEDARWOOD" },
  { prompt: "A glass apothecary bottle containing amber liquid labeled \"WITCH HAZEL\"", expectedText: "WITCH HAZEL" },
  { prompt: "A bar of artisanal lavender soap wrapped in recycled paper labeled \"PURE SOAP\"", expectedText: "PURE SOAP" },
  { prompt: "A jar of wildflower honey with a honeycomb illustration and label \"RAW HONEY\"", expectedText: "RAW HONEY" },
  { prompt: "A tube of artist oil paint squeezed in the middle with label reading \"TITANIUM WHITE\"", expectedText: "TITANIUM WHITE" },
]);

// F.5 Typography & Layouts (10)
registerPrompts("text_accuracy", "typography", "text_to_image", [
  { prompt: "A vintage Swiss graphic design poster featuring bold Helvetica typography reading \"DESIGN\"", expectedText: "DESIGN" },
  { prompt: "An Art Deco travel poster for the French Riviera with stylized geometric lettering \"RIVIERA\"", expectedText: "RIVIERA" },
  { prompt: "A modern book cover with large sans-serif typography across the middle reading \"FUTURE\"", expectedText: "FUTURE" },
  { prompt: "A hand-lettered chalkboard coffee menu with flourishing calligraphy for \"ESPRESSO\"", expectedText: "ESPRESSO" },
  { prompt: "A music festival concert poster with psychedelic 1960s lettering reading \"SUMMER SOUNDS\"", expectedText: "SUMMER SOUNDS" },
  { prompt: "A vintage magazine cover masthead printed with bold serif letters reading \"CHRONICLE\"", expectedText: "CHRONICLE" },
  { prompt: "A typography specimen sheet displaying the complete alphabet in elegant Bodoni serif typeface", expectedText: "ABCDEFGHIJKLM" },
  { prompt: "A movie title card on dark cinematic background with embossed metallic serif font \"DESTINY\"", expectedText: "DESTINY" },
  { prompt: "A graphic apparel t-shirt flatlay with distressed stencil lettering stating \"ADVENTURE\"", expectedText: "ADVENTURE" },
  { prompt: "An architectural blueprint drawing with clear monospace technical lettering reading \"FLOOR PLAN\"", expectedText: "FLOOR PLAN" },
]);

// ============================================================================
// CATEGORY G: VISUAL GENERATION (70 Prompts)
// Photorealism (15), 3D Rendering (15), Illustrations (15), Products (10), Architecture (8), Landscapes (7)
// ============================================================================

// G.1 Photorealism (15)
registerPrompts("visual_generation", "photorealism", "text_to_image", [
  { prompt: "A 50mm f/1.8 street portrait of an elderly watchmaker in Vienna examining a brass movement with a loupe", expectedStyle: "photorealism" },
  { prompt: "A macro close-up of a vibrant dew-covered spiderweb at dawn sparkling with prismatic light", expectedStyle: "photorealism" },
  { prompt: "An authentic documentary photograph of a baker dusting flour over sourdough boules in an early morning bakery", expectedStyle: "photorealism" },
  { prompt: "A cinematic film still of a vintage 1968 Ford Mustang driving along California Highway 1 during sunset", expectedStyle: "photorealism" },
  { prompt: "A close-up studio shot of a ripe halved pomegranate on slate with crystalline ruby arils and water droplets", expectedStyle: "photorealism" },
  { prompt: "An aerial photograph of a lonely lighthouse on a wave-battered granite islet in Maine at high tide", expectedStyle: "photorealism" },
  { prompt: "A candid portrait of a female ceramicist throwing a clay vase on a pottery wheel with clay-streaked hands", expectedStyle: "photorealism" },
  { prompt: "A macro capture of an iridescent peacock feather illuminated by warm side light showing micro barbule textures", expectedStyle: "photorealism" },
  { prompt: "A medium-format landscape of jagged alpine limestone spires reflected in a glassy turquoise mountain lake", expectedStyle: "photorealism" },
  { prompt: "A high-speed photograph of a fresh strawberry splashing into a crystal goblet of milk with airborne droplets", expectedStyle: "photorealism" },
  { prompt: "A quiet library reading room with dust motes drifting through tall sunbeams illuminating leather-bound books", expectedStyle: "photorealism" },
  { prompt: "An architectural facade photograph of a modern glass skyscraper with reflections of golden sunset clouds", expectedStyle: "photorealism" },
  { prompt: "A macro eye-level shot of a green tree frog resting on a broad wet tropical monstera leaf", expectedStyle: "photorealism" },
  { prompt: "A street photography scene of a bustling rainy neon Tokyo crosswalk with glowing reflections in puddles", expectedStyle: "photorealism" },
  { prompt: "A portrait of an Arctic explorer with frost crystals on wool scarf and eyelashes against pale polar sky", expectedStyle: "photorealism" },
]);

// G.2 3D Rendering & CGI (15)
registerPrompts("visual_generation", "3d_rendering", "text_to_image", [
  { prompt: "A 3D digital render of an impossible Escher-like gravity staircase floating in pastel sunset clouds", expectedStyle: "3d_render" },
  { prompt: "An Octane Render of a futuristic crystalline robotic hummingbird with iridescent chromatic glass body", expectedStyle: "3d_render" },
  { prompt: "A clean 3D isometric cutaway model of a cozy Scandinavian cabin interior with fireplace and mezzanine", expectedStyle: "isometric_3d" },
  { prompt: "A sleek CGI product render of a concept electric hypercar on a glossy black turntable with neon accents", expectedStyle: "3d_render" },
  { prompt: "A 3D digital clay sculpture of a sleeping mythical dragon coiled around a geode crystal", expectedStyle: "3d_render" },
  { prompt: "A realistic 3D architectural interior visualization of a brutalist concrete living room with sunken conversation pit", expectedStyle: "3d_archviz" },
  { prompt: "A vibrant 3D stylized character render of a cute astronaut explorer standing on a candy planet", expectedStyle: "3d_stylized" },
  { prompt: "A 3D simulation of swirling multicolored liquid acrylic paint mixing inside a clear glass sphere", expectedStyle: "3d_simulation" },
  { prompt: "A photorealistic 3D exploded view of a high-end mechanical camera showing lenses, shutter, and gears", expectedStyle: "3d_render" },
  { prompt: "A low-poly 3D rendered diorama of a campsite in a pine forest with campfire and tent under stars", expectedStyle: "low_poly_3d" },
  { prompt: "A 3D render of a futuristic cybernetic heart with glowing blue fluid channels and titanium valves", expectedStyle: "3d_render" },
  { prompt: "A hyper-detailed 3D digital rendering of a deep-sea bioluminescent sea creature floating in darkness", expectedStyle: "3d_render" },
  { prompt: "A stylized 3D rendered miniature food scene of a tiny chef cooking on a giant hamburger", expectedStyle: "3d_stylized" },
  { prompt: "A photorealistic 3D architectural visualization of a luxury infinity pool overlooking a tropical cliff", expectedStyle: "3d_archviz" },
  { prompt: "A 3D rendering of complex fractal geometric patterns in brushed gold and emerald gemstones", expectedStyle: "3d_render" },
]);

// G.3 Illustrations & Graphic Art (15)
registerPrompts("visual_generation", "illustrations", "text_to_image", [
  { prompt: "A whimsical storybook watercolor illustration of a small woodland mouse having tea inside an acorn cap", expectedStyle: "storybook_watercolor" },
  { prompt: "A bold vector flat illustration of a futuristic cityscape with clean lines and gradient duotone palette", expectedStyle: "vector_flat" },
  { prompt: "A detailed botanical scientific illustration of a wild mountain fern with spores, roots, and fronds labeled", expectedStyle: "botanical_illustration" },
  { prompt: "A dynamic manga action illustration of a samurai deflecting arrows with a katana mid-leap", expectedStyle: "manga_illustration" },
  { prompt: "A retro 1970s science fiction book cover illustration of a starship approaching a ringed planet", expectedStyle: "retro_scifi_art" },
  { prompt: "A vibrant gouache illustration of a bustling Mediterranean harbor with colorful fishing boats", expectedStyle: "gouache_illustration" },
  { prompt: "A dark gothic pen and ink crosshatch illustration of an ancient twisted willow tree under a crescent moon", expectedStyle: "pen_and_ink" },
  { prompt: "A charming children's book crayon and pastel illustration of animals parading through a meadow", expectedStyle: "childrens_book" },
  { prompt: "An editorial vector illustration depicting data streams converging into a brain network", expectedStyle: "editorial_vector" },
  { prompt: "A traditional woodcut print illustration of a howling wolf on a snowy mountain crag", expectedStyle: "woodcut_illustration" },
  { prompt: "A lush concept art digital painting of a hidden ancient temple swallowed by jungle vines", expectedStyle: "concept_art" },
  { prompt: "A delicate colored pencil drawing of a robin perched on a frosty holly branch with red berries", expectedStyle: "colored_pencil" },
  { prompt: "A surreal digital fantasy illustration of a floating island tethered to the ground by giant chains", expectedStyle: "fantasy_illustration" },
  { prompt: "A clean line-art architectural sketch of the Colosseum in Rome with subtle watercolor washes", expectedStyle: "line_art_sketch" },
  { prompt: "A playful cartoon sticker illustration of an energetic corgi wearing oversized sunglasses and a bandana", expectedStyle: "cartoon_sticker" },
]);

// G.4 Product Visualization (10)
registerPrompts("visual_generation", "product_visualization", "text_to_image", [
  { prompt: "Commercial studio product photography of a luxury matte black mechanical watch on dark slate with soft rim light", expectedStyle: "product_photo" },
  { prompt: "Clean white-background commercial packshot of a glass perfume bottle casting a delicate realistic shadow", expectedStyle: "commercial_packshot" },
  { prompt: "Product beauty shot of a modern wireless earbud case open on a pastel gradient surface with floating earbuds", expectedStyle: "product_photo" },
  { prompt: "Commercial hero shot of a designer leather handbag on a terrazzo pedestal with warm directional spotlight", expectedStyle: "product_photo" },
  { prompt: "Product photography of an organic skincare serum dropper bottle surrounded by botanical eucalyptus leaves", expectedStyle: "product_photo" },
  { prompt: "High-end automotive studio photograph of a luxury electric SUV bathed in sleek overhead lightbank illumination", expectedStyle: "automotive_photo" },
  { prompt: "Product visual of a titanium fountain pen resting on an open leather-bound notebook on mahogany", expectedStyle: "product_photo" },
  { prompt: "Commercial studio photograph of a modern ergonomic task chair on a light polished concrete floor", expectedStyle: "furniture_packshot" },
  { prompt: "Product hero shot of an artisanal pour-over coffee dripper brewing coffee into a glass server with rising steam", expectedStyle: "product_photo" },
  { prompt: "A lifestyle product shot of a pair of running sneakers on a wet running track with splash droplets", expectedStyle: "lifestyle_product" },
]);

// G.5 Architecture (8)
registerPrompts("visual_generation", "architecture", "text_to_image", [
  { prompt: "An architectural photograph of a contemporary cantilevered glass and concrete villa overlooking the ocean", expectedStyle: "architecture_photo" },
  { prompt: "Interior architecture photograph of a sunlit double-height atrium in a Scandinavian public library", expectedStyle: "interior_archviz" },
  { prompt: "An eye-level perspective of a restored historic cobblestone street with 17th-century half-timbered houses", expectedStyle: "historic_architecture" },
  { prompt: "A minimalist Japanese courtyard house with a raked pebble garden, sliding shoji screens, and a central maple tree", expectedStyle: "japanese_architecture" },
  { prompt: "An aerial photograph of a futuristic curved timber cultural pavilion surrounded by reflective water ponds", expectedStyle: "pavilion_architecture" },
  { prompt: "Interior photograph of a high-end minimalist kitchen featuring a monolithic marble waterfall island and fluted oak cabinetry", expectedStyle: "interior_kitchen" },
  { prompt: "A striking symmetrical photograph of the interior nave of a Gothic cathedral with ribbed groin vaulting", expectedStyle: "gothic_cathedral" },
  { prompt: "A modern desert home designed with rammed-earth walls, deep overhangs, and cactus landscaping under clear blue sky", expectedStyle: "desert_architecture" },
]);

// G.6 Landscapes (7)
registerPrompts("visual_generation", "landscapes", "text_to_image", [
  { prompt: "A majestic panoramic landscape of the Norwegian fjords with sheer emerald cliffs plunging into deep blue water", expectedStyle: "landscape_photo" },
  { prompt: "Sunset over the lavender fields of Provence with endless purple rows converging toward an old stone farmhouse", expectedStyle: "landscape_photo" },
  { prompt: "A dramatic storm cloud breaking over the red sandstone buttes and monuments of Monument Valley at twilight", expectedStyle: "landscape_photo" },
  { prompt: "A mystical dawn landscape in the Scottish Highlands with low fog clinging to heather-covered hills and a distant loch", expectedStyle: "landscape_photo" },
  { prompt: "A pristine tropical beach in the Seychelles with turquoise shallow waters, powdery white sand, and smooth granite boulders", expectedStyle: "landscape_photo" },
  { prompt: "An otherworldly winter landscape in Iceland showing black volcanic sand dunes covered in patches of brilliant white snow", expectedStyle: "landscape_photo" },
  { prompt: "Golden autumn sunrise illuminating mist rising from a winding river flowing through a dense golden aspen forest", expectedStyle: "landscape_photo" },
]);

// Total prompts verification
if (BENCHMARK_500_PROMPTS.length !== 500) {
  console.warn(`[Benchmark 500] Dataset contains ${BENCHMARK_500_PROMPTS.length} prompts (target: 500).`);
}

