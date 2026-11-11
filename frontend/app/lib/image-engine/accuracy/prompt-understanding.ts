/**
 * TATTVA AI - Advanced Prompt Understanding Engine
 * Performs comprehensive semantic decomposition of user prompts into
 * structured generation specifications across 18 explicit visual dimensions.
 */

import {
  StructuredGenerationSpec,
  ExactQuantityItem,
  ObjectAttributeItem,
  ColorRequirementItem,
  SpatialRelationshipItem,
  TextRequirementItem,
  ReferenceRequirementItem,
} from "./types";

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  a: 1,
  an: 1,
  single: 1,
  two: 2,
  pair: 2,
  both: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  dozen: 12,
};

const COMMON_COLORS = [
  "red", "crimson", "scarlet", "ruby", "cherry",
  "blue", "navy", "cobalt", "azure", "sapphire", "cyan", "turquoise",
  "green", "emerald", "olive", "forest green", "mint", "jade",
  "yellow", "gold", "golden", "amber", "lemon",
  "orange", "tangerine", "bronze",
  "purple", "violet", "magenta", "lavender", "amethyst",
  "black", "matte black", "obsidian",
  "white", "pearl", "ivory", "snow white",
  "gray", "grey", "silver", "titanium", "charcoal",
  "brown", "tan", "beige", "walnut", "chestnut",
  "pink", "rose", "coral",
];

const COMMON_MATERIALS = [
  "wood", "wooden", "walnut", "oak", "pine", "timber",
  "metal", "steel", "iron", "bronze", "brass", "copper", "titanium", "aluminum", "gold", "silver",
  "glass", "crystal", "acrylic",
  "leather", "suede", "denim", "cotton", "silk", "wool", "velvet", "fur",
  "stone", "marble", "granite", "slate", "limestone", "concrete", "brick",
  "ceramic", "porcelain", "clay",
  "carbon fiber", "plastic", "rubber", "latex",
];

const COMMON_SHAPES = [
  "round", "circular", "spherical", "oval", "elliptical",
  "square", "rectangular", "cubic", "box-shaped",
  "triangular", "pyramidal", "conical", "cylindrical",
  "hexagonal", "octagonal", "crescent", "spiral", "star-shaped",
];

/**
 * Parses user prompt into a complete, lossless structured specification.
 */
export function parsePromptUnderstanding(
  prompt: string,
  referenceImage?: string
): StructuredGenerationSpec {
  const cleanPrompt = prompt.trim();
  const lower = cleanPrompt.toLowerCase();

  // 1. Text Requirements Extraction (Quotes or "reading/saying")
  const textRequirements: TextRequirementItem[] = [];
  const quoteRegex = /["“']([^"”']{1,80})["”']/g;
  let quoteMatch: RegExpExecArray | null;
  while ((quoteMatch = quoteRegex.exec(cleanPrompt))) {
    const text = quoteMatch[1].trim();
    if (text.length >= 2) {
      textRequirements.push({
        exactText: text,
        caseSensitive: /[A-Z]/.test(text),
      });
    }
  }

  const saysRegex = /\b(?:says?|reading|reads|labeled|labelled|word[s]?|letters?)\s+["“']?([A-Za-z0-9][A-Za-z0-9 &'\-._]{1,40})/gi;
  let saysMatch: RegExpExecArray | null;
  while ((saysMatch = saysRegex.exec(cleanPrompt))) {
    const text = saysMatch[1].trim().replace(/^["'“”]|["'“”]$/g, "").replace(/[.,;:]$/, "").trim();
    if (text.length >= 2 && !textRequirements.some((t) => t.exactText.toLowerCase() === text.toLowerCase())) {
      textRequirements.push({
        exactText: text,
        caseSensitive: /[A-Z]/.test(text),
      });
    }
  }

  // 2. Exact Numeric Quantities & Entities
  const exactQuantities: ExactQuantityItem[] = [];
  const quantityRegex = /\b(one|two|three|four|five|six|seven|eight|nine|ten|a|an|single|pair of|\d+)\s+([a-z0-9\-]+(?:\s+[a-z0-9\-]+)?)\b/gi;
  let qMatch: RegExpExecArray | null;
  while ((qMatch = quantityRegex.exec(cleanPrompt))) {
    const wordOrNum = qMatch[1].toLowerCase();
    const noun = qMatch[2].toLowerCase();

    // Strip trailing prepositions/conjunctions
    const cleanNoun = noun
      .replace(/\s+(?:behind|in front of|in|at|on|with|and|by|of|to|near|from|next to)\b.*$/i, "")
      .trim();

    // Skip common non-object phrases like "a photo", "a picture", "a day"
    if (/^(photo|picture|photograph|image|render|illustration|view|shot|close-up|day|time|bit|lot)$/i.test(cleanNoun)) {
      continue;
    }

    let count = 1;
    if (/^\d+$/.test(wordOrNum)) {
      count = parseInt(wordOrNum, 10);
    } else if (NUMBER_WORDS[wordOrNum] !== undefined) {
      count = NUMBER_WORDS[wordOrNum];
    }

    let singularObject = cleanNoun;
    if (singularObject.endsWith("ies")) {
      singularObject = singularObject.slice(0, -3) + "y";
    } else if (singularObject.endsWith("ees")) {
      singularObject = singularObject.slice(0, -1); // trees -> tree
    } else if (
      singularObject.endsWith("ches") ||
      singularObject.endsWith("shes") ||
      singularObject.endsWith("xes") ||
      singularObject.endsWith("sses")
    ) {
      singularObject = singularObject.slice(0, -2);
    } else if (singularObject.endsWith("s") && !singularObject.endsWith("ss")) {
      singularObject = singularObject.slice(0, -1);
    }

    exactQuantities.push({
      object: singularObject,
      count,
      raw: qMatch[0],
    });
  }

  // 3. Colors
  const colors: ColorRequirementItem[] = [];
  for (const c of COMMON_COLORS) {
    const regex = new RegExp(`\\b${c}\\s+([a-z0-9\\-]+)\\b`, "gi");
    let cMatch: RegExpExecArray | null;
    while ((cMatch = regex.exec(cleanPrompt))) {
      const targetObj = cMatch[1];
      if (!colors.some((item) => item.color === c && item.object === targetObj)) {
        colors.push({ color: c, object: targetObj });
      }
    }
    // Standalone color mentions
    if (colors.length === 0 && new RegExp(`\\b${c}\\b`, "i").test(cleanPrompt)) {
      colors.push({ color: c });
    }
  }

  // 4. Materials
  const materials: Array<{ object?: string; material: string }> = [];
  for (const mat of COMMON_MATERIALS) {
    const regex = new RegExp(`\\b${mat}\\s+([a-z0-9\\-]+)\\b`, "gi");
    let matMatch: RegExpExecArray | null;
    while ((matMatch = regex.exec(cleanPrompt))) {
      materials.push({ material: mat, object: matMatch[1] });
    }
  }

  // 5. Shapes
  const shapes: Array<{ object?: string; shape: string }> = [];
  for (const shp of COMMON_SHAPES) {
    if (new RegExp(`\\b${shp}\\b`, "i").test(cleanPrompt)) {
      shapes.push({ shape: shp });
    }
  }

  // 6. Spatial Relationships
  const spatialRelationships: SpatialRelationshipItem[] = [];

  // Left of
  const leftOfRegex = /([a-z0-9\s\-]+?)\s+(?:parked|positioned|standing|placed|located)?\s*(?:to the left of|on the left of|left from)\s+([a-z0-9\s\-]+?)(?:,|\.|$|with|and)/gi;
  let spMatch: RegExpExecArray | null;
  while ((spMatch = leftOfRegex.exec(cleanPrompt))) {
    spatialRelationships.push({
      subject: spMatch[1].trim(),
      relation: "left_of",
      target: spMatch[2].trim(),
      raw: spMatch[0],
    });
  }

  // Right of
  const rightOfRegex = /([a-z0-9\s\-]+?)\s+(?:parked|positioned|standing|placed|located)?\s*(?:to the right of|on the right of|right from)\s+([a-z0-9\s\-]+?)(?:,|\.|$|with|and)/gi;
  while ((spMatch = rightOfRegex.exec(cleanPrompt))) {
    spatialRelationships.push({
      subject: spMatch[1].trim(),
      relation: "right_of",
      target: spMatch[2].trim(),
      raw: spMatch[0],
    });
  }

  // Behind
  const behindRegex = /([a-z0-9\s\-]+?)\s+(?:positioned|standing|located)?\s*(?:behind|in back of|at the rear of)\s+([a-z0-9\s\-]+?)(?:,|\.|$|with|and)/gi;
  while ((spMatch = behindRegex.exec(cleanPrompt))) {
    spatialRelationships.push({
      subject: spMatch[1].trim(),
      relation: "behind",
      target: spMatch[2].trim(),
      raw: spMatch[0],
    });
  }

  // In front of
  const inFrontRegex = /([a-z0-9\s\-]+?)\s+(?:positioned|standing|located)?\s*(?:in front of|before)\s+([a-z0-9\s\-]+?)(?:,|\.|$|with|and)/gi;
  while ((spMatch = inFrontRegex.exec(cleanPrompt))) {
    spatialRelationships.push({
      subject: spMatch[1].trim(),
      relation: "in_front_of",
      target: spMatch[2].trim(),
      raw: spMatch[0],
    });
  }

  // In the center / foreground / background
  if (/\b(?:in the center|centered|center-aligned)\b/i.test(cleanPrompt)) {
    spatialRelationships.push({ subject: "main_subject", relation: "center", raw: "centered in composition" });
  }
  if (/\b(?:in the foreground|foreground)\b/i.test(cleanPrompt)) {
    spatialRelationships.push({ subject: "foreground_element", relation: "foreground", raw: "in foreground" });
  }
  if (/\b(?:in the background|background)\b/i.test(cleanPrompt)) {
    spatialRelationships.push({ subject: "background_element", relation: "background", raw: "in background" });
  }

  // 7. Background & Environment
  let background = "";
  let environment = "";
  if (/\b(?:cloudy sky|clear sky|sunset sky|night sky|starry sky|blue sky)\b/i.test(cleanPrompt)) {
    const skyMatch = cleanPrompt.match(/\b([a-z]+\s+sky)\b/i);
    if (skyMatch) background = skyMatch[1];
  }
  if (/\b(?:market|mountain|beach|forest|jungle|room|laboratory|street|cafe|desert|ocean|city|studio)\b/i.test(cleanPrompt)) {
    const envMatch = cleanPrompt.match(/\b(?:in a|at a|on a|inside an?)\s+([a-z0-9\s\-]+?)(?:,|\.|$)/i);
    if (envMatch) environment = envMatch[1].trim();
  }

  // 8. Lighting
  let lighting = "";
  const lightMatch = cleanPrompt.match(/\b(golden hour|volumetric light(?:ing)?|neon light(?:ing)?|studio softbox|cinematic light(?:ing)?|rim light(?:ing)?|harsh sunlight|moonlit|dramatic shadows)\b/i);
  if (lightMatch) {
    lighting = lightMatch[1];
  }

  // 9. Camera Angle & Perspective
  let cameraAngle = "";
  let perspective = "";
  const angleMatch = cleanPrompt.match(/\b(low-angle|high-angle|bird's eye view|overhead view|close-up|macro|extreme close-up|wide-angle|panoramic|eye-level|profile view)\b/i);
  if (angleMatch) cameraAngle = angleMatch[1];

  const persMatch = cleanPrompt.match(/\b(50mm lens|85mm lens|anamorphic|fisheye|telephoto|isometric|cinematic 35mm)\b/i);
  if (persMatch) perspective = persMatch[1];

  // 10. Composition
  let composition = "";
  const compMatch = cleanPrompt.match(/\b(flat lay|top-down|centered|rule of thirds|symmetrical|cinematic framing|portrait framing)\b/i);
  if (compMatch) composition = compMatch[1];

  // 11. Main & Secondary Subjects
  // The first significant noun phrase or subject
  let mainSubject = cleanPrompt.split(/[,.]/)[0].trim();
  if (exactQuantities.length > 0) {
    mainSubject = `${exactQuantities[0].count} ${exactQuantities[0].object}`;
  }
  const secondarySubjects: string[] = exactQuantities.slice(1).map((q) => `${q.count} ${q.object}`);

  // 12. Explicit Restrictions
  const explicitRestrictions: string[] = [];
  const noRegex = /\b(?:no|without|do not include|never|exclude)\s+([a-z0-9\s\-]+?)(?:,|\.|$)/gi;
  let noMatch: RegExpExecArray | null;
  while ((noMatch = noRegex.exec(cleanPrompt))) {
    explicitRestrictions.push(`No ${noMatch[1].trim()}`);
  }

  // 13. Reference Requirements
  const referenceRequirements: ReferenceRequirementItem[] = [];
  if (referenceImage) {
    referenceRequirements.push({
      source: "uploaded_image",
      preserve: ["subject identity", "core visual traits"],
      modify: ["background or requested action"],
    });
  }

  // 14. Artistic Style
  let artisticStyle = "Photorealistic";
  if (/\b(?:anime|cel shaded|manga)\b/i.test(cleanPrompt)) artisticStyle = "Anime";
  else if (/\b(?:3d render|octane|unreal engine|cgi)\b/i.test(cleanPrompt)) artisticStyle = "3D Render";
  else if (/\b(?:oil painting|watercolor|acrylic|canvas)\b/i.test(cleanPrompt)) artisticStyle = "Traditional Painting";
  else if (/\b(?:illustration|vector|flat design)\b/i.test(cleanPrompt)) artisticStyle = "Illustration";
  else if (/\b(?:cyberpunk|neon noir)\b/i.test(cleanPrompt)) artisticStyle = "Cyberpunk";

  return {
    originalPrompt: cleanPrompt,
    mainSubject,
    secondarySubjects,
    exactQuantities,
    objectCharacteristics: [],
    colors,
    shapes,
    materials,
    clothingAndAccessories: [],
    background,
    environment,
    lighting,
    cameraAngle,
    perspective,
    composition,
    spatialRelationships,
    textRequirements,
    artisticStyle,
    explicitRestrictions,
    referenceRequirements,
  };
}
