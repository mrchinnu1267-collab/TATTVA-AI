/**
 * Prompt compiler: turns a user request into a deterministic image prompt with
 * explicit, checkable requirements. The original wording is always preserved.
 */

import { normalizeAspectRatio, sizeForAspect } from "./image-utils";
import {
  parseStructuredPrompt,
  formatPromptForGemini,
  formatPromptForDallE,
  formatPromptForSDXL,
  formatPromptForFlux,
  formatPromptForLocal,
  validatePromptForProvider,
  type StructuredPromptInfo,
} from "./prompt-processors";
import type {
  AspectRatio,
  CompiledImagePrompt,
  ImageGenerationOptions,
  ImageProviderId,
  ImageQuality,
  ImageRequirement,
  ImageStyle,
  RequirementCheck,
} from "./types";

export const COMPILER_VERSION = "tattva-image-compiler/2.0";

const BASE_NEGATIVE =
  "low quality, worst quality, blurry, out of focus, jpeg artifacts, compression artifacts, watermark, signature, logo, cut off, cropped, deformed, disfigured, extra limbs, extra fingers, malformed hands, duplicate subject, unfinished, " +
  "nude, nudity, naked, topless, bare breasts, exposed nipples, exposed genitals, cleavage, provocative, erotic, sexual, pornographic, lewd, uncensored, adult 18+, nsfw, revealing clothes, bare skin, suggestive, unclad, stripped, striptease, see-through clothes, transparent clothing, " +
  "graphic violence, gruesome gore, decapitation, severed limbs, mutilated body, bloodbath, open wounds, self-harm, suicide, sexualized minors, child exploitation";

interface StylePreset {
  id: ImageStyle;
  label: string;
  positive: string;
  negative?: string;
}

export const STYLE_PRESETS: Record<ImageStyle, StylePreset> = {
  auto: { id: "auto", label: "Auto", positive: "" },
  realistic: {
    id: "realistic",
    label: "Photorealistic",
    positive:
      "photorealistic photograph, true-to-life detail, natural skin and material texture, realistic lighting, sharp focus, 50mm lens, high dynamic range",
  },
  cinematic: {
    id: "cinematic",
    label: "Cinematic",
    positive:
      "cinematic film still, anamorphic lens, dramatic volumetric lighting, rich color grading, shallow depth of field, production design detail",
  },
  portrait: {
    id: "portrait",
    label: "Portrait",
    positive:
      "professional studio portrait, beauty lighting, soft key and rim light, flattering lens compression, crisp catchlights, detailed skin texture",
    negative: "plastic skin, over-smoothed face",
  },
  anime: {
    id: "anime",
    label: "Anime",
    positive:
      "hand-painted anime key visual, clean linework, expressive eyes, cel shading, detailed painted background, vibrant but balanced palette",
  },
  "3d": {
    id: "3d",
    label: "3D Render",
    positive:
      "high-end 3D render, physically based materials, global illumination, subtle subsurface scattering, ray-traced reflections, octane render quality",
  },
  fantasy: {
    id: "fantasy",
    label: "Fantasy",
    positive:
      "epic fantasy concept art, painterly detail, atmospheric depth, dramatic god rays, intricate ornamental design, matte painting quality",
  },
  cyberpunk: {
    id: "cyberpunk",
    label: "Cyberpunk",
    positive:
      "cyberpunk neon-noir scene, magenta and cyan lighting, wet reflective surfaces, atmospheric haze, futuristic detail, cinematic contrast",
  },
  architecture: {
    id: "architecture",
    label: "Architecture",
    positive:
      "architectural photography, editorial composition, perfect verticals, natural and artificial light balance, material and texture detail, wide-angle lens",
    negative: "distorted perspective, warped lines",
  },
  vintage: {
    id: "vintage",
    label: "Vintage",
    positive:
      "vintage 35mm film photograph, fine grain, halation, slightly muted warm palette, soft contrast, authentic analog character",
  },
  product: {
    id: "product",
    label: "Product",
    positive:
      "premium commercial product photography, controlled studio lighting, clean seamless background, razor-sharp detail, subtle reflections, packshot composition",
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    positive:
      "minimalist composition, generous negative space, restrained palette, clean geometry, soft even lighting, editorial design sensibility",
  },
};

const STYLE_ALIASES: Record<string, ImageStyle> = {
  auto: "auto",
  photo: "realistic",
  photograph: "realistic",
  photoreal: "realistic",
  photorealistic: "realistic",
  realistic: "realistic",
  film: "cinematic",
  movie: "cinematic",
  cinematic: "cinematic",
  portrait: "portrait",
  anime: "anime",
  manga: "anime",
  cartoon: "anime",
  "3d": "3d",
  render: "3d",
  "3d-render": "3d",
  fantasy: "fantasy",
  epic: "fantasy",
  cyberpunk: "cyberpunk",
  neon: "cyberpunk",
  architecture: "architecture",
  interior: "architecture",
  vintage: "vintage",
  retro: "vintage",
  product: "product",
  packshot: "product",
  minimal: "minimal",
  minimalist: "minimal",
};

const COLOR_WORDS = [
  "black", "white", "red", "orange", "yellow", "green", "teal", "cyan", "blue",
  "navy", "purple", "violet", "magenta", "pink", "brown", "beige", "grey", "gray",
  "silver", "gold", "golden", "copper", "bronze", "turquoise", "maroon", "crimson",
  "emerald", "sapphire", "ivory", "cream",
];

const COUNT_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  single: 1,
  two: 2,
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
};

const STYLE_STOP_WORDS = new Set([
  "a", "an", "the", "this", "that", "these", "those", "i", "we", "you", "he", "she",
  "it", "they", "and", "or", "but", "with", "without", "in", "on", "at", "of", "for",
  "to", "from", "by", "as", "is", "are", "was", "were", "be", "create", "generate",
  "make", "draw", "paint", "render", "show", "give", "please", "image", "picture",
  "photo", "photograph", "illustration", "art", "artwork", "drawing", "portrait",
  "cinematic", "realistic", "photorealistic", "anime", "fantasy", "cyberpunk",
  "minimal", "vintage", "product", "studio", "closeup", "close-up", "wide", "shot",
  "highly", "detailed", "ultra", "best", "quality", "hd", "4k", "8k", "exactly",
]);

export function normalizeStyle(value?: string): ImageStyle {
  if (!value) return "auto";
  const key = value.trim().toLowerCase();
  return STYLE_ALIASES[key] || "auto";
}

function uniqueRequirements(items: ImageRequirement[]): ImageRequirement[] {
  const seen = new Set<string>();
  const output: ImageRequirement[] = [];
  for (const item of items) {
    const key = item.text.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

/** Extract explicit, verifiable requirements from the user's wording. */
export function extractRequirements(prompt: string): ImageRequirement[] {
  const requirements: ImageRequirement[] = [];
  let index = 0;

  // Quoted text that must appear verbatim.
  const quoteRegex = /["“']([^"”']{1,80})["”']/g;
  let match: RegExpExecArray | null;
  while ((match = quoteRegex.exec(prompt))) {
    const text = match[1].trim();
    if (text.length < 2) continue;
    requirements.push({
      id: `text-${index++}`,
      text: `Text reads exactly "${text}"`,
      category: "text",
      critical: true,
    });
  }

  // "text that says X" / "reading X"
  const saysRegex = /\b(?:says?|reading|reads|labeled|labelled|titled|word[s]?)\s+["“']?([A-Za-z0-9][A-Za-z0-9 &'\-._]{1,40})/gi;
  while ((match = saysRegex.exec(prompt))) {
    const text = match[1].trim().replace(/[.,;:]$/, "");
    if (text.length < 2) continue;
    requirements.push({
      id: `text-${index++}`,
      text: `Text reads exactly "${text}"`,
      category: "text",
      critical: true,
    });
  }

  // Explicit counts: "two red apples", "exactly 3 cars", "a single tree".
  const countRegex = /\b(exactly\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|single)\s+([a-zA-Z][a-zA-Z-]*(?:\s+[a-zA-Z][a-zA-Z-]*){0,3})/gi;
  while ((match = countRegex.exec(prompt))) {
    const explicit = Boolean(match[1]);
    const token = match[2].toLowerCase();
    const noun = match[3].trim().replace(/[.,;:]+$/, "");
    const number = /^\d+$/.test(token) ? Number(token) : COUNT_WORDS[token];
    if (!number || !noun) continue;
    if (noun.toLowerCase().startsWith("of ")) continue;
    requirements.push({
      id: `count-${index++}`,
      text: `Exactly ${number} ${noun}`,
      category: "count",
      critical: true,
    });
    // Counts are usually paired with a color; keep them as separate checks.
    if (explicit) continue;
  }

  // Colors explicitly requested.
  const colorRegex = new RegExp(`\\b(${COLOR_WORDS.join("|")})\\b`, "gi");
  const colors = new Set<string>();
  while ((match = colorRegex.exec(prompt))) colors.add(match[1].toLowerCase());
  for (const color of colors) {
    requirements.push({
      id: `color-${index++}`,
      text: `Uses the color ${color}`,
      category: "color",
      critical: true,
    });
  }

  // Exclusions: "no dogs", "without text", "remove the hat".
  const exclusionRegex = /\b(?:no|without|excluding|free of|remove|avoid)\s+([^,.;!?]{2,50})/gi;
  while ((match = exclusionRegex.exec(prompt))) {
    const target = match[1].trim().replace(/\s+/g, " ");
    if (!target || /^(the )?(image|picture|photo)$/i.test(target)) continue;
    requirements.push({
      id: `exclusion-${index++}`,
      text: `No ${target}`,
      category: "exclusion",
      critical: true,
    });
  }

  // Named entities / proper nouns (e.g. "Eiffel Tower", "Taj Mahal").
  const entityRegex = /\b[A-Z][a-zA-Z0-9'-]+(?:\s+[A-Z][a-zA-Z0-9'-]+){0,3}\b/g;
  const entities = new Set<string>();
  while ((match = entityRegex.exec(prompt))) {
    const entity = match[0].trim();
    const words = entity.toLowerCase().split(/\s+/);
    if (words.some((word) => STYLE_STOP_WORDS.has(word))) continue;
    if (entity.length < 3) continue;
    entities.add(entity);
  }
  for (const entity of entities) {
    requirements.push({
      id: `entity-${index++}`,
      text: `Includes ${entity}`,
      category: "entity",
      critical: true,
    });
  }

  return uniqueRequirements(requirements).slice(0, 16);
}

function requirementBlock(requirements: ImageRequirement[]): string {
  if (!requirements.length) return "";
  const lines = requirements.map((item) => `- ${item.text}${item.critical ? " (must match)" : ""}`);
  return `\n\nMANDATORY DETAILS FROM THE REQUEST:\n${lines.join("\n")}`;
}

export function compileImagePrompt(options: ImageGenerationOptions): CompiledImagePrompt {
  const original = options.prompt.trim();
  const quality: ImageQuality = options.quality || "balanced";
  const aspectRatio: AspectRatio = normalizeAspectRatio(options.aspectRatio);
  const style = normalizeStyle(options.style);

  const defaults = sizeForAspect(aspectRatio, quality);
  const width = options.width && options.width >= 64 ? Math.round(options.width) : defaults.width;
  const height = options.height && options.height >= 64 ? Math.round(options.height) : defaults.height;

  const seed =
    typeof options.seed === "number" && Number.isFinite(options.seed)
      ? Math.abs(Math.trunc(options.seed))
      : Math.floor(Math.random() * 2_147_483_647);

  const requirements = extractRequirements(original);
  const stylePreset = STYLE_PRESETS[style];

  const isHuman = /\b(woman|women|girl|girls|lady|ladies|female|man|men|boy|boys|male|person|people|model|portrait|human|character|figure)\b/i.test(original);
  const safetyStandard = isHuman
    ? "\n\nSAFETY & ATTIRE:\nAppropriate, fully clothed in modest attire, non-suggestive, strictly safe for work (SFW), family friendly."
    : "";

  const positive = [
    "[USER REQUEST - FOLLOW EXACTLY]",
    original,
    requirementBlock(requirements),
    safetyStandard,
    stylePreset.positive ? `\n\nVISUAL STYLE:\n${stylePreset.positive}` : "",
    `\n\nOUTPUT:\n${aspectRatio} aspect ratio, ${width}x${height}, coherent anatomy and perspective, complete subject in frame, no text unless explicitly requested.`,
  ]
    .filter(Boolean)
    .join("");

  const negativeParts = [BASE_NEGATIVE, stylePreset.negative || "", options.customNegative || ""].filter(
    Boolean
  );

  const steps = quality === "fast" ? 20 : quality === "max" ? 40 : 28;
  const guidance = quality === "max" ? 8 : 7;

  // Phase A: Architecture-specific prompt compilation
  const structured = parseStructuredPrompt(original, style, options.customNegative);
  const sdxlFormatted = formatPromptForSDXL(structured);
  const localFormatted = formatPromptForLocal(structured);
  const promptsByProvider: Record<ImageProviderId, string> = {
    gemini: formatPromptForGemini(structured, { aspectRatio, quality }),
    openai: formatPromptForDallE(structured, { aspectRatio }),
    huggingface: sdxlFormatted.positive,
    local: localFormatted.positive,
  };
  const compilerWarnings: string[] = [...structured.warnings];
  if (structured.contradictions.length > 0) {
    compilerWarnings.push(`Contradictory instructions detected: ${structured.contradictions.join("; ")}`);
  }

  return {
    compilerVersion: COMPILER_VERSION,
    prompt: original,
    positive,
    negative: negativeParts.join(", "),
    style,
    aspectRatio,
    seed,
    width,
    height,
    steps,
    guidance,
    quality,
    requirements,
    referenceImage: options.referenceImage,
    strength: options.strength,
    structured,
    promptsByProvider,
    warnings: compilerWarnings,
  };
}

/** Build a correction pass that keeps the original request intact. */
export function refinePrompt(
  compiled: CompiledImagePrompt,
  failed: RequirementCheck[],
  suggestedFix: string | undefined,
  attempt: number
): string {
  const mustFix = failed
    .filter((item) => item.met !== true)
    .map((item) => `- ${item.text}${item.note ? ` (previous issue: ${item.note})` : ""}`);

  const corrections = mustFix.length
    ? `\n\nCORRECTION PASS ${attempt} - the previous image failed these checks. Fix ALL of them while preserving everything else:\n${mustFix.join("\n")}`
    : "";

  const fix = suggestedFix
    ? `\n\nPRIORITY FIX:\n${suggestedFix}`
    : "";

  return `${compiled.positive}${corrections}${fix}\n\nRe-check every mandatory detail above before finishing the image.`;
}


export const compilePrompt = compileImagePrompt;
