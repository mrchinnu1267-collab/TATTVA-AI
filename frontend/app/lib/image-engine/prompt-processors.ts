/**
 * TATTVA AI - Provider-Specific Prompt Optimization & Validation Engine (Phase A)
 * 
 * Separates prompt compilation by model architecture:
 * - Gemini / DALL-E 3: Fluent natural-language, semantic relations, explicit requirements, zero meta-boilerplate.
 * - SDXL / SDXL-Lightning: Concise visual description, main-subject priority within 77-token CLIP window.
 * - FLUX.1: Natural-language sentence descriptions, rich spatial composition, quotes for typography.
 * - Local Diffusers: Prioritized visual tags and weight ordering.
 * 
 * Author: kotapati Gowtham Chowdary / TATTVA AI Engineering
 */

import { ImageProviderId, ImageQuality, ImageStyle, RequirementCategory } from "./types";
import { STYLE_PRESETS } from "./prompt-compiler";

// =============================================================================
// 1. DATA STRUCTURES & INTERFACES
// =============================================================================

export interface StructuredPromptInfo {
  rawPrompt: string;
  cleanInstructionText: string;
  mainSubject: string;
  secondaryObjects: string[];
  allEntities: string[];
  actions: string[];
  environment: string;
  objectPositions: Array<{ object: string; position: string; target?: string }>;
  lighting: string;
  composition: string;
  cameraAngle: string;
  style: ImageStyle;
  requiredDetails: string[];
  negativeRequirements: string[];
  textElements: string[];
  colors: string[];
  counts: Array<{ entity: string; count: number }>;
  contradictions: string[];
  estimatedTokens: Record<ImageProviderId, number>;
  warnings: string[];
}

export interface PromptValidationResult {
  isValid: boolean;
  provider: ImageProviderId;
  mainSubjectFound: boolean;
  requiredObjectsPreserved: boolean;
  missingRequirements: string[];
  contradictions: string[];
  estimatedTokens: number;
  tokenBudget: number;
  tokenLimitExceeded: boolean;
  warnings: string[];
  optimizedPrompt: string;
}

// Token budgets per provider architecture
export const PROVIDER_TOKEN_BUDGETS: Record<ImageProviderId, number> = {
  "nano-banana": 2000, // Nano Banana conversational image context
  huggingface: 77,   // Primary SDXL-Lightning dual CLIP-L/G window (FLUX fallback allows up to 256 T5 tokens)
  local: 77,         // Local SDXL / SD 1.5 CLIP encoder limit
  pollinations: 256, // FLUX.1 T5-XXL token budget on Pollinations
  gemini: 1000,      // Generative Language Multimodal text context (chars/tokens)
  openai: 1000,      // DALL-E 3 API limit
};

const FILLER_PHRASES = [
  /^(please\s+)?(generate|create|draw|paint|render|make|illustrate|show\s+me|i\s+want|can\s+you\s+draw)\s+(an?\s+|the\s+)?(image|picture|photo|photograph|drawing|artwork|rendering|illustration)\s+(of\s+)?/i,
  /^a\s+(photo|picture|rendering|illustration|painting|drawing)\s+of\s+/i,
  /\b(ultra\s+high\s+quality|extremely\s+detailed|hyper\s+realistic|8k|4k|hd|trending\s+on\s+artstation|unreal\s+engine\s+5)\b/gi,
  /\b(best\s+quality|masterpiece|award\s+winning)\b/gi,
];

const LIGHTING_PATTERNS = [
  /(?:soft|harsh|dramatic|studio|cinematic|rim|key|ambient|volumetric|neon|natural|direct|diffused|moody|warm|cool|golden\s+hour|blue\s+hour|twilight|candlelight|god\s+rays|fluorescent|backlit)\s+(?:lighting|light|glow|sunlight|illumination)/i,
  /(?:golden\s+hour|blue\s+hour|chiaroscuro|backlit|neon\s+glow|sunlit|moonlit)/i,
];

const COMPOSITION_PATTERNS = [
  /(?:close-up|extreme\s+close-up|macro|wide-angle|ultra-wide|panoramic|aerial|bird['’]?s-eye\s+view|top-down|low-angle|high-angle|eye-level|portrait|landscape|dutch\s+angle|over-the-shoulder|centered|symmetrical)\s*(?:shot|view|angle|perspective|composition)?/i,
  /(?:rule\s+of\s+thirds|leading\s+lines|depth\s+of\s+field|shallow\s+depth\s+of\s+field|bokeh|cinematic\s+framing)/i,
];

const POSITION_WORDS = [
  "in the foreground",
  "in the background",
  "in the midground",
  "in the center",
  "centered",
  "on the left",
  "on the right",
  "to the left",
  "to the right",
  "at the top",
  "at the bottom",
  "in the distance",
  "overhead",
  "underneath",
  "next to",
  "beside",
  "flanked by",
  "surrounding",
  "above",
  "below",
];

const CONTRADICTION_PAIRS: Array<{ a: RegExp; b: RegExp; message: string }> = [
  {
    a: /\b(sunny|broad\s+daylight|midday\s+sun|bright\s+sunshine)\b/i,
    b: /\b(midnight|nighttime|starry\s+night|pitch\s+black\s+night)\b/i,
    message: "Contradiction detected: scene specifies both bright sunshine and midnight darkness.",
  },
  {
    a: /\b(completely\s+empty|deserted|abandoned\s+and\s+vacant|uninhabited)\b/i,
    b: /\b(crowded|packed\s+with\s+people|bustling\s+crowd|many\s+people)\b/i,
    message: "Contradiction detected: scene specifies both an empty location and a crowded group of people.",
  },
  {
    a: /\b(indoor|inside\s+a\s+room|interior\s+bedroom|interior\s+hall)\b/i,
    b: /\b(endless\s+open\s+sky|vast\s+mountain\s+range\s+overhead)\b/i,
    message: "Contradiction detected: scene specifies an enclosed indoor room with an open outdoor mountain sky.",
  },
  {
    a: /\b(arid\s+desert|bone\s+dry\s+sand)\b/i,
    b: /\b(underwater|torrential\s+downpour|submerged\s+in\s+ocean)\b/i,
    message: "Contradiction detected: scene specifies both an arid dry desert and submerged underwater conditions.",
  },
];

// =============================================================================
// 2. PARSER & INTENT EXTRACTOR
// =============================================================================

/**
 * Detects conflicting or contradictory visual instructions in the prompt.
 */
export function detectPromptContradictions(rawPrompt: string): string[] {
  const clean = rawPrompt.trim();
  const contradictions: string[] = [];
  for (const pair of CONTRADICTION_PAIRS) {
    if (pair.a.test(clean) && pair.b.test(clean)) {
      contradictions.push(pair.message);
    }
  }
  return contradictions;
}

/**
 * Prunes conflicting negative prompt tokens based on positive user requirements.
 */
export function pruneConflictingNegativePrompts(
  positivePrompt: string,
  baseNegative: string
): string {
  const lower = positivePrompt.toLowerCase();
  let pruned = baseNegative;

  // 1. Multiple objects / counts / twins / groups requested: do not suppress duplicates
  if (
    /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|pair|both|twins?|group|crowd|multiple|several|\d+)\b/i.test(lower)
  ) {
    pruned = pruned.replace(/\bduplicate subject,?\s*/gi, "");
  }

  // 2. Text, typography, logo, sign, or poster requested: do not suppress text/logos
  if (
    /\b(text|typography|words?|letters?|font|quote|titled?|says?|reading|label(ed|led)?|logo|badge|sign|signature|watermark|poster|flyer|banner|billboard|cover)\b/i.test(lower) ||
    /["“'][^"”']+["”']/.test(positivePrompt)
  ) {
    pruned = pruned.replace(/\b(watermark|signature|logo|text),?\s*/gi, "");
  }

  // 3. Close-up, macro, crop, or framed composition: do not penalize cropping
  if (
    /\b(close-up|macro|cropped|crop|extreme close-up|headshot|profile view|zoomed in|tight shot)\b/i.test(lower)
  ) {
    pruned = pruned.replace(/\b(cut off|cropped),?\s*/gi, "");
  }

  // 4. Hands, fingers, or sketches explicitly described
  if (
    /\b(hands?|fingers?|gloves?|sketch|drawing|hand-drawn|manicure)\b/i.test(lower)
  ) {
    pruned = pruned.replace(/\b(malformed hands|extra fingers),?\s*/gi, "");
  }

  // 5. Night, dark, or shadow scenes
  if (
    /\b(night|midnight|dark|shadows?|silhouette|noir|dimly lit|twilight)\b/i.test(lower)
  ) {
    pruned = pruned.replace(/\b(dark|underexposed),?\s*/gi, "");
  }

  return pruned.replace(/,\s*,/g, ",").replace(/^,\s*|,\s*$/g, "").trim();
}

/**
 * Parses user prompt into structured visual concepts without dropping user intent.
 */
export function parseStructuredPrompt(
  rawPrompt: string,
  style: ImageStyle = "auto",
  customNegative: string = ""
): StructuredPromptInfo {
  const clean = rawPrompt.trim();
  const lower = clean.toLowerCase();
  const warnings: string[] = [];
  const contradictions: string[] = [];

  // Check contradictions
  for (const pair of CONTRADICTION_PAIRS) {
    if (pair.a.test(clean) && pair.b.test(clean)) {
      contradictions.push(pair.message);
      warnings.push(`Warning: ${pair.message}`);
    }
  }

  // Extract explicit typography in quotes
  const textElements: string[] = [];
  const quoteRegex = /["“']([^"”']{1,80})["”']/g;
  let qMatch: RegExpExecArray | null;
  while ((qMatch = quoteRegex.exec(clean))) {
    const txt = qMatch[1].trim();
    if (txt.length >= 2 && !textElements.includes(txt)) {
      textElements.push(txt);
    }
  }

  // Extract explicit counts (e.g. "two cats", "3 dogs")
  const countRegex = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|pair of|single)\s+([a-zA-Z][a-zA-Z-]*(?:\s+[a-zA-Z][a-zA-Z-]*){0,2})\b/gi;
  const counts: Array<{ entity: string; count: number }> = [];
  const COUNT_MAP: Record<string, number> = {
    one: 1, single: 1, two: 2, "pair of": 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  };
  let cMatch: RegExpExecArray | null;
  while ((cMatch = countRegex.exec(clean))) {
    const rawNum = cMatch[1].toLowerCase();
    const entity = cMatch[2].trim();
    if (["of", "in", "at", "by", "for", "with", "step", "steps"].includes(entity.toLowerCase())) continue;
    const count = /^\d+$/.test(rawNum) ? Number(rawNum) : (COUNT_MAP[rawNum] || 1);
    counts.push({ entity, count });
  }

  // Extract explicit colors
  const COLOR_NAMES = [
    "black", "white", "red", "blue", "green", "yellow", "orange", "purple",
    "violet", "pink", "brown", "gold", "golden", "silver", "cyan", "magenta",
    "teal", "turquoise", "crimson", "emerald", "navy", "grey", "gray", "bronze",
    "amber", "beige", "ivory", "maroon", "coral", "saffron",
  ];
  const colorRegex = new RegExp(`\\b(${COLOR_NAMES.join("|")})\\b`, "gi");
  const colors: string[] = [];
  let colMatch: RegExpExecArray | null;
  while ((colMatch = colorRegex.exec(clean))) {
    const c = colMatch[1].toLowerCase();
    if (!colors.includes(c)) colors.push(c);
  }

  // Extract negative / exclusion requirements (e.g. "no blur", "without trees")
  const negativeRequirements: string[] = [];
  const exclRegex = /\b(?:no|without|excluding|free\s+of|avoid|remove)\s+([^,.;!?]{2,45})/gi;
  let exMatch: RegExpExecArray | null;
  while ((exMatch = exclRegex.exec(clean))) {
    const neg = exMatch[1].trim();
    if (neg && !/^(the\s+)?(image|picture|photo)$/i.test(neg)) {
      negativeRequirements.push(neg);
    }
  }
  if (customNegative) {
    negativeRequirements.push(customNegative.trim());
  }

  // Extract Lighting
  let lighting = "";
  for (const p of LIGHTING_PATTERNS) {
    const m = clean.match(p);
    if (m) {
      lighting = m[0].trim();
      break;
    }
  }

  // Extract Composition / Camera
  let composition = "";
  for (const p of COMPOSITION_PATTERNS) {
    const m = clean.match(p);
    if (m) {
      composition = m[0].trim();
      break;
    }
  }

  // Extract Environment / Setting
  let environment = "";
  const envMatch = clean.match(/\b(?:in|on|at|inside|outside|under|amidst)\s+(?:a|an|the)?\s*([a-zA-Z0-9\s]{3,35}?)(?:,|\.|\bwith\b|\bunder\b|\bfeaturing\b|$)/i);
  if (envMatch && envMatch[1]) {
    const cand = envMatch[1].trim();
    if (!/^(image|picture|photo|scene|render)$/i.test(cand)) {
      environment = cand;
    }
  }

  // Extract Action verbs
  const actions: string[] = [];
  const actionRegex = /\b(standing|smiling|running|walking|sitting|flying|floating|resting|holding|looking|jumping|dancing|swimming|sleeping|reading|playing|gazing|illuminating|soaring|perched|parked|placed|leaning)\b/gi;
  let actMatch: RegExpExecArray | null;
  while ((actMatch = actionRegex.exec(clean))) {
    const act = actMatch[1].toLowerCase();
    if (!actions.includes(act)) actions.push(act);
  }

  // Clean prompt text without filler opening (e.g. "Create an image of...")
  let cleanInstructionText = clean;
  for (const f of FILLER_PHRASES) {
    cleanInstructionText = cleanInstructionText.replace(f, "").trim();
  }

  // Extract spatial relationships & positional placements losslessly
  const objectPositions: Array<{ object: string; position: string; target?: string }> = [];
  
  // Specific spatial patterns: left of, right of, in front of, behind, under, next to
  const spatialPatterns: Array<{ regex: RegExp; position: string }> = [
    { regex: /([a-z0-9\s\-]+?)\s+(?:is\s+|are\s+|stands?\s+|sits?\s+|parked\s+|placed\s+)?(?:on the left(?:\s+side)?\s+of|to the left of)\s+([a-z0-9\s\-]+?)(?:,|\.|$|with|and)/gi, position: "on the left side of" },
    { regex: /([a-z0-9\s\-]+?)\s+(?:is\s+|are\s+|stands?\s+|sits?\s+|parked\s+|placed\s+)?(?:on the right(?:\s+side)?\s+of|to the right of)\s+([a-z0-9\s\-]+?)(?:,|\.|$|with|and)/gi, position: "on the right side of" },
    { regex: /([a-z0-9\s\-]+?)\s+(?:is\s+|are\s+|stands?\s+|sits?\s+|parked\s+|placed\s+)?(?:in front of|directly in front of)\s+([a-z0-9\s\-]+?)(?:,|\.|$|with|and)/gi, position: "in front of" },
    { regex: /([a-z0-9\s\-]+?)\s+(?:is\s+|are\s+|stands?\s+|sits?\s+|parked\s+|placed\s+)?(?:behind|in back of|at the back of)\s+([a-z0-9\s\-]+?)(?:,|\.|$|with|and)/gi, position: "behind" },
    { regex: /([a-z0-9\s\-]+?)\s+(?:is\s+|are\s+|stands?\s+|sits?\s+|parked\s+|placed\s+)?(?:under|underneath|beneath)\s+([a-z0-9\s\-]+?)(?:,|\.|$|with|and)/gi, position: "under" },
    { regex: /([a-z0-9\s\-]+?)\s+(?:is\s+|are\s+|stands?\s+|sits?\s+|parked\s+|placed\s+)?(?:next to|beside|adjacent to)\s+([a-z0-9\s\-]+?)(?:,|\.|$|with|and)/gi, position: "next to" },
  ];

  for (const sp of spatialPatterns) {
    let sm: RegExpExecArray | null;
    while ((sm = sp.regex.exec(cleanInstructionText))) {
      const subj = sm[1].replace(/^(put|place|add|there is|a|an|the)\s+/i, "").trim();
      const tgt = sm[2].trim();
      if (subj && tgt) {
        objectPositions.push({ object: subj, position: sp.position, target: tgt });
      }
    }
  }

  // General positional words for broad grounding
  for (const posPhrase of POSITION_WORDS) {
    const idx = lower.indexOf(posPhrase);
    if (idx !== -1) {
      const segment = clean.substring(Math.max(0, idx - 40), Math.min(clean.length, idx + posPhrase.length + 40)).trim();
      if (!objectPositions.some((p) => p.position === posPhrase)) {
        objectPositions.push({ object: segment, position: posPhrase });
      }
    }
  }

  // Lossless Main Subject and All Entities Extraction
  // Split into sentences and independent clauses
  const rawSentences = cleanInstructionText
    .split(/(?<=[.!?])\s+|;\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  const allEntities: string[] = [];
  const secondaryObjects: string[] = [];

  // Register entities from counts
  for (const c of counts) {
    const label = `${c.count > 1 ? c.count + " " : ""}${c.entity}`;
    if (!allEntities.includes(label)) allEntities.push(label);
  }

  // Register entities from spatial directives
  for (const p of objectPositions) {
    const cleanObj = p.object.replace(/^(put|place|add|a|an|the)\s+/i, "").trim();
    if (cleanObj && cleanObj.length > 2 && !allEntities.some((e) => e.includes(cleanObj))) {
      allEntities.push(cleanObj);
    }
    if (p.target && !allEntities.some((e) => e.includes(p.target!))) {
      allEntities.push(p.target);
    }
  }

  // Primary clause from first sentence defines the main subject core
  const firstSentence = rawSentences[0] || cleanInstructionText;
  const primaryClause = firstSentence.split(/[,;]|\bwith\b/i)[0].trim() || firstSentence;
  const mainSubject = primaryClause || clean;

  // Extract secondary objects from subsequent sentences and secondary clauses
  if (rawSentences.length > 1) {
    for (let i = 1; i < rawSentences.length; i++) {
      const sentence = rawSentences[i]
        .replace(/^(put|place|add|there is|there are|featuring|include|draw)\s+(a|an|the)?\s*/i, "")
        .trim();
      if (sentence && !secondaryObjects.includes(sentence)) {
        secondaryObjects.push(sentence);
      }
    }
  }

  // Also check clauses inside the first sentence
  if (clean.includes("with ")) {
    const afterWith = clean.split(/\bwith\b/i)[1]?.split(/[,.;]/)[0]?.trim();
    if (afterWith && afterWith !== mainSubject && !secondaryObjects.includes(afterWith)) {
      secondaryObjects.push(afterWith);
    }
  }
  if (clean.includes("and ")) {
    const afterAnd = clean.split(/\band\b/i)[1]?.split(/[,.;]/)[0]?.trim();
    if (afterAnd && afterAnd !== mainSubject && !secondaryObjects.includes(afterAnd)) {
      secondaryObjects.push(afterAnd);
    }
  }
  if (clean.includes("under ")) {
    const afterUnder = clean.split(/\bunder\b/i)[1]?.split(/[,.;]/)[0]?.trim();
    if (afterUnder && afterUnder !== mainSubject && !secondaryObjects.includes(afterUnder)) {
      secondaryObjects.push(afterUnder);
    }
  }

  // Ensure all registered entities are included in secondaryObjects if not matching mainSubject
  for (const ent of allEntities) {
    if (!mainSubject.toLowerCase().includes(ent.toLowerCase()) && !secondaryObjects.some((s) => s.toLowerCase().includes(ent.toLowerCase()))) {
      secondaryObjects.push(ent);
    }
  }

  // Required details
  const requiredDetails: string[] = [];
  for (const c of counts) requiredDetails.push(`${c.count} ${c.entity}`);
  for (const col of colors) requiredDetails.push(col);
  for (const t of textElements) requiredDetails.push(`"${t}"`);
  for (const sp of objectPositions) {
    if (sp.target) {
      requiredDetails.push(`${sp.object} ${sp.position} ${sp.target}`);
    }
  }

  // Rough token count estimate
  const wordCount = clean.split(/\s+/).length;
  const approxTokens = Math.round(wordCount * 1.25);

  const estimatedTokens: Record<ImageProviderId, number> = {
    "nano-banana": wordCount,
    huggingface: approxTokens,
    local: approxTokens,
    pollinations: approxTokens,
    gemini: wordCount,
    openai: wordCount,
  };

  return {
    rawPrompt: clean,
    cleanInstructionText,
    mainSubject,
    secondaryObjects,
    allEntities,
    actions,
    environment,
    objectPositions,
    lighting,
    composition,
    cameraAngle: composition,
    style,
    requiredDetails,
    negativeRequirements,
    textElements,
    colors,
    counts,
    contradictions,
    estimatedTokens,
    warnings,
  };
}

// =============================================================================
// 3. PROVIDER-SPECIFIC PROMPT PROCESSORS
// =============================================================================

/**
 * Processor 1: Google Gemini Image (Flash / Pro)
 * Preserves natural language, object relationships, and explicit requirements.
 * Avoids CLI / meta instructions.
 */
export function formatPromptForGemini(
  structured: StructuredPromptInfo,
  options: { aspectRatio?: string; quality?: ImageQuality } = {}
): string {
  const parts: string[] = [];

  // Main natural language description
  let core = structured.rawPrompt.trim();

  // If style preset is specified, enrich naturally
  const preset = structured.style !== "auto" ? STYLE_PRESETS[structured.style] : null;
  if (preset && preset.positive) {
    if (!core.toLowerCase().includes(preset.label.toLowerCase())) {
      core = `${core}, in ${preset.label} style (${preset.positive})`;
    }
  }

  parts.push(core);

  // Preserve explicit typography
  if (structured.textElements.length > 0) {
    const texts = structured.textElements.map((t) => `"${t}"`).join(", ");
    parts.push(`The image features clear, readable text displaying: ${texts}.`);
  }

  // Maintain aspect ratio request cleanly
  if (options.aspectRatio && options.aspectRatio !== "1:1") {
    parts.push(`Framed in a ${options.aspectRatio} aspect ratio.`);
  }

  // Enforce realistic coherence without meta-instructions
  parts.push("Render with anatomically correct features, coherent perspective, and natural visual lighting.");

  return parts.join(" ");
}

/**
 * Processor 2: OpenAI DALL-E 3
 * Vivid, narrative-rich paragraph with exact constraints.
 * Explicitly guards against random hallucinated objects and characters.
 */
export function formatPromptForDallE(
  structured: StructuredPromptInfo,
  options: { aspectRatio?: string } = {}
): string {
  const parts: string[] = [];

  let desc = structured.rawPrompt.trim();
  const preset = structured.style !== "auto" ? STYLE_PRESETS[structured.style] : null;
  if (preset && preset.positive && !desc.toLowerCase().includes(preset.label.toLowerCase())) {
    desc = `${desc}. Style: ${preset.positive}`;
  }

  parts.push(desc);

  // Ensure exact counts are respected
  if (structured.counts.length > 0) {
    const countClauses = structured.counts.map((c) => `exactly ${c.count} ${c.entity}`).join(" and ");
    parts.push(`Maintain ${countClauses} with precision.`);
  }

  // Typography precision
  if (structured.textElements.length > 0) {
    const textStr = structured.textElements.map((t) => `"${t}"`).join(", ");
    parts.push(`Ensure the following text is rendered legibly and verbatim: ${textStr}.`);
  }

  // Negative / hallucination protection
  parts.push("Do not introduce unrelated background people, extra objects, or random typography.");

  return parts.join(" ");
}

/**
 * Processor 3: SDXL & SDXL-Lightning (AP123 / Local Diffusers)
 * Critical: CLIP-L + OpenCLIP ViT-bigG have a 77-token ceiling per chunk.
 * Strips meta-boilerplate, prioritizes main subject & attributes first, places style at the end.
 */
export function formatPromptForSDXL(
  structured: StructuredPromptInfo,
  options: { quality?: ImageQuality; customNegative?: string } = {}
): { positive: string; negative: string; tokenWarning?: string } {
  const segments: string[] = [];

  // Segment 1 (Priority 1 - Tokens 1..35): Core subject, counts, primary colors, actions
  const subjectParts: string[] = [];
  if (structured.counts.length > 0) {
    const countPrefix = structured.counts.map((c) => `${c.count} ${c.entity}`).join(", ");
    subjectParts.push(countPrefix);
  }
  subjectParts.push(structured.mainSubject);
  if (structured.actions.length > 0) {
    subjectParts.push(structured.actions.join(", "));
  }
  segments.push(subjectParts.filter(Boolean).join(", "));

  // Segment 2 (Priority 2 - Tokens 36..55): Secondary elements, environment, lighting
  const contextParts: string[] = [];
  if (structured.secondaryObjects.length > 0) {
    contextParts.push(structured.secondaryObjects.join(", "));
  }
  if (structured.environment) {
    contextParts.push(structured.environment);
  }
  if (structured.lighting) {
    contextParts.push(structured.lighting);
  }
  if (contextParts.length > 0) {
    segments.push(contextParts.join(", "));
  }

  // Segment 3 (Priority 3 - Tokens 56..75): Composition, essential style tokens
  const styleParts: string[] = [];
  if (structured.composition) {
    styleParts.push(structured.composition);
  }
  const preset = structured.style !== "auto" ? STYLE_PRESETS[structured.style] : null;
  if (preset && preset.positive) {
    // Take concise keywords from style preset
    const briefStyle = preset.positive.split(",").slice(0, 3).join(",").trim();
    styleParts.push(briefStyle);
  } else {
    styleParts.push("highly detailed, sharp focus");
  }
  if (styleParts.length > 0) {
    segments.push(styleParts.join(", "));
  }

  const positive = segments.filter(Boolean).join(", ");

  // Negative prompt: merge base quality tags + structured user negative exclusions
  const negList = [
    "worst quality, normal quality, low quality, blurry, deformed, disfigured, bad anatomy, bad hands, extra digits, missing fingers, cropped, watermark, signature",
  ];
  if (preset?.negative) {
    negList.push(preset.negative);
  }
  if (structured.negativeRequirements.length > 0) {
    negList.push(structured.negativeRequirements.join(", "));
  }
  if (options.customNegative) {
    negList.push(options.customNegative);
  }
  const rawNegative = negList.join(", ");
  const negative = pruneConflictingNegativePrompts(positive, rawNegative);

  // Estimate tokens in positive
  const words = positive.split(/\s+/).length;
  let tokenWarning: string | undefined;
  if (words > 65) {
    tokenWarning = `Prompt length (${words} words / ~${Math.round(words * 1.3)} tokens) approaches or exceeds the primary SDXL 77-token CLIP window. Main subject and core attributes have been prioritized.`;
  }

  return { positive, negative, tokenWarning };
}

/**
 * Processor 4: FLUX.1 (Schnell / Dev)
 * Designed for T5-XXL (256/512 tokens) + CLIP-L.
 * Thrives on natural English sentences, scene description, and typography in quotes.
 * Guarantees zero prompt information loss.
 */
export function formatPromptForFlux(
  structured: StructuredPromptInfo,
  options: { aspectRatio?: string } = {}
): string {
  const parts: string[] = [];

  // Style prefix if requested
  const preset = structured.style !== "auto" ? STYLE_PRESETS[structured.style] : null;
  const stylePrefix = preset?.positive ? `${preset.positive}.` : "";
  if (stylePrefix) parts.push(stylePrefix);

  // Preserved lossless instruction narrative
  if (structured.cleanInstructionText && structured.cleanInstructionText.length > 5) {
    // Capitalize first character
    const capitalized = structured.cleanInstructionText.charAt(0).toUpperCase() + structured.cleanInstructionText.slice(1);
    parts.push(capitalized.endsWith(".") ? capitalized : `${capitalized}.`);
  } else {
    parts.push(`A high quality scene of ${structured.mainSubject}.`);
    if (structured.secondaryObjects.length > 0) {
      parts.push(`Accompanied by ${structured.secondaryObjects.join(", ")}.`);
    }
  }

  // Explicit spatial arrangement guarantee
  if (structured.objectPositions.length > 0) {
    const detailedPlacements = structured.objectPositions
      .map((p) => p.target ? `${p.object} is positioned ${p.position} ${p.target}` : `${p.object} is ${p.position}`)
      .join(", ");
    if (detailedPlacements) {
      parts.push(`Precise spatial layout: ${detailedPlacements}.`);
    }
  }

  // Explicit object counts guarantee
  if (structured.counts.length > 0) {
    const countClauses = structured.counts.map((c) => `exactly ${c.count} ${c.entity}`).join(" and ");
    parts.push(`Featuring ${countClauses}.`);
  }

  // Explicit typography
  if (structured.textElements.length > 0) {
    const textQuotes = structured.textElements.map((t) => `"${t}"`).join(", ");
    parts.push(`With crisp, legible typography reading ${textQuotes}.`);
  }

  // Camera & lighting if specified
  if (structured.lighting || structured.composition) {
    const lightComp = [structured.lighting, structured.composition].filter(Boolean).join(" with ");
    parts.push(`Rendered with ${lightComp}.`);
  }

  return parts.join(" ").replace(/\s+\./g, ".").replace(/\.\.+/g, ".").trim();
}

/**
 * Processor 5: Local PyTorch Diffusers Engine
 */
export function formatPromptForLocal(
  structured: StructuredPromptInfo,
  options: { customNegative?: string } = {}
): { positive: string; negative: string } {
  return formatPromptForSDXL(structured, options);
}

// =============================================================================
// 4. VALIDATION & SANITIZATION PIPELINE
// =============================================================================

/**
 * Validates prompt integrity for the chosen provider before dispatching to generation.
 */
export function validatePromptForProvider(
  input: StructuredPromptInfo | string,
  provider: ImageProviderId,
  options: { aspectRatio?: string; quality?: ImageQuality; customNegative?: string } = {}
): PromptValidationResult {
  const structured: StructuredPromptInfo =
    typeof input === "string" ? parseStructuredPrompt(input) : input;
  const errors: string[] = [];
  const warnings: string[] = Array.isArray(structured?.warnings) ? [...structured.warnings] : [];

  // 1. Validate Main Subject
  const mainSubjectFound = Boolean(structured.mainSubject && structured.mainSubject.trim().length > 1);
  if (!mainSubjectFound) {
    errors.push("No clear main subject could be identified in the prompt.");
  }

  // 2. Validate Required Objects / Specific Counts
  const missingRequirements: string[] = [];
  for (const c of structured.counts) {
    if (!structured.mainSubject.includes(c.entity) && !structured.secondaryObjects.some((s) => s.includes(c.entity))) {
      missingRequirements.push(`${c.count} ${c.entity}`);
    }
  }

  // 3. Resolve Provider-Specific Optimized String
  let optimizedPrompt = "";
  switch (provider) {
    case "gemini":
      optimizedPrompt = formatPromptForGemini(structured, options);
      break;
    case "openai":
      optimizedPrompt = formatPromptForDallE(structured, options);
      break;
    case "huggingface":
      // Primary route is SDXL-Lightning; FLUX fallback is handled seamlessly
      optimizedPrompt = formatPromptForSDXL(structured, options).positive;
      break;
    case "local":
      optimizedPrompt = formatPromptForLocal(structured, options).positive;
      break;
    case "pollinations":
      optimizedPrompt = formatPromptForFlux(structured, options);
      break;
    default:
      optimizedPrompt = structured.rawPrompt;
      break;
  }

  // 4. Check Token Limits
  const words = optimizedPrompt.split(/\s+/).length;
  const estimatedTokens = Math.round(words * 1.25);
  const tokenBudget = PROVIDER_TOKEN_BUDGETS[provider] || 77;
  const tokenLimitExceeded = estimatedTokens > tokenBudget;

  if (tokenLimitExceeded && provider === "huggingface") {
    warnings.push(
      `Prompt contains ${estimatedTokens} estimated tokens, which exceeds the standard 77-token CLIP window. Priority subject ordering has been applied.`
    );
  }

  return {
    isValid: errors.length === 0,
    provider,
    mainSubjectFound,
    requiredObjectsPreserved: missingRequirements.length === 0,
    missingRequirements,
    contradictions: structured.contradictions,
    estimatedTokens,
    tokenBudget,
    tokenLimitExceeded,
    warnings,
    optimizedPrompt,
  };
}

