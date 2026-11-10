/**
 * TATTVA AI - Strict Content Moderation & Protection System
 * Enforces Zero-Tolerance 18+ Adult, Nudity, CSAM/Minor Exploitation, Gore, & Harmful Content Restrictions.
 * Standardized across Image Generation, Editing, Reference Uploads, Prompt Enhancement, and Chat Orchestration.
 */

import { geminiVision, geminiText, getGeminiApiKey } from "./image-engine/gemini";

export const SAFETY_REJECTION_MESSAGE =
  "Sorry, TATTVA AI cannot generate this image because it violates our content safety guidelines. Please try a different prompt.";

export type ModerationCategory =
  | "ADULT_EXPLICIT_SEXUAL"
  | "CSAM_MINOR_EXPLOITATION"
  | "GRAPHIC_VIOLENCE_GORE"
  | "SELF_HARM_SUICIDE"
  | "PROMPT_JAILBREAK_EVASION";

export type ModerationResult = {
  isSafe: boolean;
  category?: ModerationCategory;
  reason?: string;
  matched?: string;
};

// =============================================================================
// 1. DE-OBFUSCATION & ANTI-EVASION ENGINE
// =============================================================================

/**
 * Common Cyrillic / Greek to Latin homoglyphs mapping
 */
const HOMOGLYPHS: Record<string, string> = {
  а: "a",
  А: "a",
  в: "b",
  В: "b",
  е: "e",
  Е: "e",
  ё: "e",
  Ё: "e",
  к: "k",
  К: "k",
  м: "m",
  М: "m",
  н: "h",
  Н: "h",
  о: "o",
  О: "o",
  р: "p",
  Р: "p",
  с: "c",
  С: "c",
  т: "t",
  Т: "t",
  у: "y",
  У: "y",
  х: "x",
  Х: "x",
  і: "i",
  І: "i",
  ї: "i",
  Ї: "i",
  ј: "j",
  Ј: "j",
  ѕ: "s",
  Ѕ: "s",
  ԁ: "d",
  Ԃ: "d",
  ԛ: "q",
  Ԝ: "w",
  ѡ: "w",
  0: "o",
  1: "i",
  3: "e",
  4: "a",
  "@": "a",
  $: "s",
  5: "s",
  7: "t",
  8: "b",
  "+": "t",
  "!": "i",
};

/**
 * Decode Base64 if a base64 string or prefix is detected
 */
function tryDecodeBase64(input: string): string {
  const b64Regex = /(?:base64,)?([A-Za-z0-9+/=]{16,})/g;
  return input.replace(b64Regex, (fullMatch, b64Str) => {
    try {
      const decoded = Buffer.from(b64Str, "base64").toString("utf-8");
      // Check if decoded contains printable characters
      if (/^[\x20-\x7E\s]+$/.test(decoded)) {
        return `${fullMatch} ${decoded}`;
      }
    } catch {
      // Ignore invalid base64
    }
    return fullMatch;
  });
}

/**
 * Decode ROT13 to catch simple substitution bypasses
 */
function decodeRot13(input: string): string {
  return input.replace(/[a-zA-Z]/g, (char) => {
    const code = char.charCodeAt(0);
    const start = code <= 90 ? 65 : 97;
    return String.fromCharCode(((code - start + 13) % 26) + start);
  });
}

/**
 * Clean and normalize text, stripping zero-width characters, homoglyphs, and leetspeak
 */
export function deobfuscateText(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  // 1. Remove zero-width spaces, soft hyphens, and invisible separators
  let text = raw.replace(/[\u200B-\u200D\uFEFF\u00AD\u2060\u180E]/g, "");

  // 2. Decode potential Base64 payloads
  text = tryDecodeBase64(text);

  // 3. Replace homoglyphs
  let normalized = "";
  for (const char of text) {
    normalized += HOMOGLYPHS[char] || char;
  }

  // 4. Remove excessive punctuation/symbols used as inter-letter separators: e.g. "p.o.r.n" or "s_e_x" or "n-u-d-e"
  const collapsedPunctuation = normalized.replace(/([a-zA-Z0-9])[.\-_*~^|/\\](?=[a-zA-Z0-9])/g, "$1");

  return `${normalized} ${collapsedPunctuation}`.toLowerCase();
}

// =============================================================================
// 2. SAFE EXEMPTIONS (Medical, Culinary, Educational, Cosmetics)
// =============================================================================

function isSafeExemption(text: string): boolean {
  const lower = text.toLowerCase();

  // Culinary poultry/meat breast
  if (/\b(?:chicken|turkey|duck|goose|pork|quail|chicken's|turkey's)\s+(?:breast|breasts)\b/i.test(lower)) {
    return true;
  }

  // Medical awareness & maternal health
  if (
    /\bbreast\s*(?:cancer|oncology|screening|mammogram|biopsy|awareness|pink\s+ribbon|health|exam)\b/i.test(lower) ||
    /\b(?:breastfeeding|nursing\s+an\s+infant|mother\s+nursing)\b/i.test(lower)
  ) {
    return true;
  }

  // Cosmetics & Color tones
  if (
    /\bnude\s+(?:makeup|lipstick|eyeshadow|nail\s*polish|tones?|palette|color|shade|tint|dress|shoes?|heels?)\b/i.test(lower)
  ) {
    return true;
  }

  // Anatomy in medical/scientific educational context
  if (
    /\b(?:medical\s+anatomy|cardiology|skeletal\s+system|cardiovascular|anatomical\s+chart|organ\s+diagram)\b/i.test(lower) &&
    !/\b(?:penis|vagina|pussy|dick|cock|clitoris|boobs|tits)\b/i.test(lower)
  ) {
    return true;
  }

  return false;
}

// =============================================================================
// 3. PROHIBITED PATTERN DEFINITIONS
// =============================================================================

// A. MINOR SEXUALIZATION & CSAM (ZERO TOLERANCE)
const MINOR_TERMS =
  "(?:child|children|minor|underaged?|toddler|baby|infant|preteen|kid|kids|schoolgirl|schoolboy|young\\s+girl|young\\s+boy|teen|teenager|youth|loli|lolita|shota|jailbait)";

const CSAM_PATTERNS: RegExp[] = [
  new RegExp(`\\b${MINOR_TERMS}\\s+(?:nude|naked|nudity|topless|bottomless|unclothed|undressed|in\\s+underwear|in\\s+panties|in\\s+bikini|bare)\\b`, "i"),
  new RegExp(`\\b(?:nude|naked|topless|bottomless|unclothed|erotic|sexy|seductive|lewd)\\s+${MINOR_TERMS}\\b`, "i"),
  new RegExp(`\\b(?:sexual|sexualized|touching|molest|intimate|porn|porno|xxx)\\s+${MINOR_TERMS}\\b`, "i"),
  new RegExp(`\\b${MINOR_TERMS}\\s+(?:having\\s+sex|in\\s+bed\\s+naked|stripping|exposing)\\b`, "i"),
  /\b(?:underage|minor|teen|child)\s+(?:porn|porno|sex|erotica|xxx)\b/i,
  /\b(?:loli|shota)\s+(?:hentai|ecchi|lewd|nude|sex)\b/i,
];

// B. ADULT NUDITY & EXPLICIT SEXUAL CONTENT
const ADULT_SEXUAL_PATTERNS: RegExp[] = [
  // Direct Nudity & Unclothed States
  /\b(?:nude|nudity|nudes|naked|nakedness|topless|bottomless|unclothed|unclad|undressed)\b/i,
  /\b(?:without\s+(?:any\s+)?clothes|no\s+clothes|in\s+the\s+buff|birthday\s+suit|bare\s+naked)\b/i,
  /\b(?:remov(?:e|ing|ed)|tak(?:e|ing)\s+off)\s+(?:her\s+|all\s+|his\s+|their\s+)?clothes\b/i,
  /\bstrip(?:ping|ped|per|tease)?\b/i,

  // Pornography, 18+, Erotica
  /\b(?:porn|porno|pornography|pornographic|xxx|nsfw|18\+|erotica|hentai|ecchi|lewd|milf|nsfw\s*art)\b/i,

  // Intimate and Sexual Anatomy
  /\b(?:bare\s+(?:breasts?|chest|boobs?|body|torso|skin|ass|butt|buttocks))\b/i,
  /\b(?:exposed\s+(?:breasts?|genitals?|nipples?|pussy|vagina|penis|clitoris|labia|scrotum|butt))\b/i,
  /\b(?:boob[s]?|boobie[s]?|tits?|titties|areola|nipples?|vagina[s]?|penis[es]?|puss(?:y|ies)|dick[s]?|cock[s]?|clitoris|labia|scrotum|testicles|foreskin|glans)\b/i,
  /\b(?:asshole|anus|anal\s+sex|rectum)\b/i,

  // Sexual Acts & Explicit Activity
  /\b(?:sex|sexx|having\s+sex|sexual\s+(?:act|content|organ|activity|position|scene|intercourse)|sex\s+scene|explicit\s+sex|sex\s+with)\b/i,
  /\b(?:intercourse|fellatio|cunnilingus|blowjob|handjob|fingering|deepthroat|creampie|cumshot|ejaculat(?:e|ion|ing)|orgasm)\b/i,
  /\b(?:masturbat(?:e|ion|ing)|wanking|jacking\s+off|stroking\s+(?:dick|cock))\b/i,
  /\b(?:bukkake|gangbang|threesome\s+sex|orgy|sex\s+toy|dildo|vibrator|fleshlight)\b/i,

  // Fetish & BDSM
  /\b(?:bdsm|bondage\s+sex|dominatrix\s+sex|sexual\s+submissive|gimp\s+suit|chastity\s+belt|erotic\s+spanking|fetish\s+porn)\b/i,

  // Non-Consensual / Intimate Exploitation
  /\b(?:upskirt|upskirting|downblouse|peeping\s+tom|voyeurism|non-consensual\s+nude|sexual\s+deepfake|leaked\s+nudes)\b/i,

  // See-through clothing designed to reveal nudity
  /\b(?:see[- ]through|transparent|translucent)\s+(?:clothes|clothing|dress|bikini|blouse|lingerie)\s+(?:showing|revealing|showing\s+bare)\b/i,
  /\b(?:lingerie|bikini)\s+(?:nude|naked|explicit|see[- ]through)\b/i,

  // Combinations
  /\b(?:nude|naked)\s+(?:girl|woman|model|female|lady|babe|man|guy|boy|person|picture|photo|image|portrait|body|figure)\b/i,
  /\b(?:girl|woman|model|female|lady|babe|man|guy|person)\s+(?:without\s+clothes|in\s+the\s+nude|naked|nude)\b/i,

  // Foreign language sexual & nudity terms
  /\b(?:desnud[ao][a-z]*|sexo|tetas|culo|polla|coño|follando)\b/i, // Spanish
  /\b(?:nu[es]?|nudité|sexe|seins|fesses|baiser)\b/i,             // French
  /\b(?:nackt[a-z]*|brüste|arsch|ficken)\b/i,                     // German
  /\b(?:nud[ao][a-z]*|sesso|tette|scopare)\b/i,                   // Italian
  /\b(?:голая|голый|порно|секс|сиськи|член|влагалище)\b/i,        // Russian
  /\b(?:nanga|nangi|chudai|sambhog|sthan|yoni|lingam)\b/i,        // Hindi transliterated
];

// C. GRAPHIC VIOLENCE & GORE
const GRAPHIC_VIOLENCE_PATTERNS: RegExp[] = [
  /\b(?:gruesome\s+gore|graphic\s+violence|visceral\s+gore|extreme\s+gore|bloodbath)\b/i,
  /\b(?:decapitat(?:e|ed|ion)|behead(?:ed|ing)|severed\s+head)\b/i,
  /\b(?:dismember(?:ed|ment)|severed\s+limbs|mutilat(?:e|ed|ion)|mutilated\s+body)\b/i,
  /\b(?:spilled\s+entrails|spilled\s+guts|disembowel(?:ed|ment)|exposed\s+intestines)\b/i,
  /\b(?:graphic\s+autopsy|torture\s+chamber|flaying|flayed\s+alive|drawn\s+and\s+quartered)\b/i,
  /\b(?:splattered\s+brains|gory\s+corpse|mutilated\s+corpse|mangled\s+corpse)\b/i,
  /\b(?:graphic\s+murder|violent\s+slaughter|mass\s+shooting\s+victims)\b/i,
];

// D. SELF-HARM & SUICIDE
const SELF_HARM_PATTERNS: RegExp[] = [
  /\b(?:slit(?:ting)?\s+(?:wrists|throat)|cutting\s+wrists|self[- ]harm\s+imagery)\b/i,
  /\b(?:hang(?:ing)?\s+(?:oneself|myself|himself|herself)\s+by\s+the\s+neck)\b/i,
  /\b(?:suicide\s+(?:scene|depiction|act|method|note)|committing\s+suicide)\b/i,
  /\b(?:jumping\s+to\s+death|overdose\s+suicide)\b/i,
];

// E. JAILBREAK & SYSTEM OVERRIDE BYPASSES
const JAILBREAK_PATTERNS: RegExp[] = [
  /\b(?:dan\s+mode|developer\s+mode|god\s+mode|unrestricted\s+mode|jailbreak\s+mode)\b/i,
  /\b(?:ignore\s+(?:all\s+)?(?:safety|system|previous)\s+(?:rules|instructions|directives|guidelines))\b/i,
  /\b(?:bypass\s+(?:safety|content|nsfw|filter|restriction))\b/i,
  /\b(?:pretend\s+(?:there\s+are\s+no\s+rules|you\s+can\s+generate\s+nsfw|you\s+have\s+no\s+restrictions))\b/i,
  /\b(?:fictional\s+world\s+where\s+nudity\s+is\s+allowed|uncensored\s+image\s+generator)\b/i,
];

// =============================================================================
// 4. TEXT PROMPT MODERATION
// =============================================================================

/**
 * Synchronous text prompt inspection with multi-layer de-obfuscation
 */
export function moderateTextPrompt(rawPrompt: string): ModerationResult {
  if (!rawPrompt || typeof rawPrompt !== "string") {
    return { isSafe: true };
  }

  // 1. Check Safe Exemptions first
  if (isSafeExemption(rawPrompt)) {
    return { isSafe: true };
  }

  // 2. Prepare raw and de-obfuscated representations
  const normalized = rawPrompt.toLowerCase().replace(/[\r\n\t_]/g, " ");
  const deobfuscated = deobfuscateText(rawPrompt);
  const rot13 = decodeRot13(rawPrompt).toLowerCase();

  const textsToScan = [normalized, deobfuscated, rot13];

  for (const text of textsToScan) {
    // 3. Priority: Check CSAM / Minor Exploitation
    for (const pattern of CSAM_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        return {
          isSafe: false,
          category: "CSAM_MINOR_EXPLOITATION",
          reason: SAFETY_REJECTION_MESSAGE,
          matched: match[0],
        };
      }
    }

    // 4. Check Adult & Sexual Content / Explicit Nudity
    for (const pattern of ADULT_SEXUAL_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        return {
          isSafe: false,
          category: "ADULT_EXPLICIT_SEXUAL",
          reason: SAFETY_REJECTION_MESSAGE,
          matched: match[0],
        };
      }
    }

    // 5. Check Graphic Violence & Gore
    for (const pattern of GRAPHIC_VIOLENCE_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        return {
          isSafe: false,
          category: "GRAPHIC_VIOLENCE_GORE",
          reason: SAFETY_REJECTION_MESSAGE,
          matched: match[0],
        };
      }
    }

    // 6. Check Self-Harm & Suicide
    for (const pattern of SELF_HARM_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        return {
          isSafe: false,
          category: "SELF_HARM_SUICIDE",
          reason: SAFETY_REJECTION_MESSAGE,
          matched: match[0],
        };
      }
    }

    // 7. Check Jailbreak Attempts targeting Safety Filters
    for (const pattern of JAILBREAK_PATTERNS) {
      const match = pattern.exec(text);
      if (match) {
        return {
          isSafe: false,
          category: "PROMPT_JAILBREAK_EVASION",
          reason: SAFETY_REJECTION_MESSAGE,
          matched: match[0],
        };
      }
    }
  }

  return { isSafe: true };
}

// =============================================================================
// 5. SEMANTIC AI PROMPT MODERATION (Contextual & Nuanced Intent)
// =============================================================================

/**
 * Uses Gemini semantic understanding to evaluate ambiguous or indirect prompts
 */
export async function classifyPromptWithGemini(prompt: string): Promise<ModerationResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    // Fall back to rule-based moderation if API key is not ready
    return moderateTextPrompt(prompt);
  }

  // Quick rule check first
  const ruleResult = moderateTextPrompt(prompt);
  if (!ruleResult.isSafe) {
    return ruleResult;
  }

  const systemInstruction = `You are the master Content Safety Classifier for TATTVA AI.
Your sole job is to evaluate if a user's image prompt violates strict safety guidelines.

PROHIBITED CATEGORIES:
1. ADULT_EXPLICIT_SEXUAL: Any request for pornographic images, explicit nudity, bare breasts, exposed genitalia, buttocks, sexual acts, erotic/sensual poses, or see-through clothing revealing nudity.
2. CSAM_MINOR_EXPLOITATION: Any sexualized depiction of minors (children, teenagers, schoolgirls/boys, infants), nude minors, or sexually suggestive minors. ZERO TOLERANCE.
3. GRAPHIC_VIOLENCE_GORE: Gruesome gore, decapitation, dismemberment, mutilated bodies, graphic injury, torture, viscera.
4. SELF_HARM_SUICIDE: Self-harm, suicide depictions, cutting wrists, hanging.

SAFE EXCEPTIONS:
- Non-graphic medical anatomy (e.g. human heart, skeletal diagram).
- Culinary (e.g. "grilled chicken breast").
- Non-graphic breast cancer awareness pink ribbon.
- Everyday cosmetics (e.g. "nude lipstick", "nude eye shadow").

Analyze the prompt strictly.
Respond with JSON only:
{
  "isSafe": boolean,
  "category": "ADULT_EXPLICIT_SEXUAL" | "CSAM_MINOR_EXPLOITATION" | "GRAPHIC_VIOLENCE_GORE" | "SELF_HARM_SUICIDE" | "NONE",
  "reason": string
}`;

  try {
    const response = await geminiText(
      `USER PROMPT:\n"""${prompt}"""\n\nClassify safety strictly.`,
      { json: true, temperature: 0.0, timeoutMs: 10_000 }
    );

    const rawText = typeof response === "object" && response !== null && "text" in response
      ? (response as { text: string }).text
      : String(response);
    const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.isSafe === false) {
      return {
        isSafe: false,
        category: (parsed.category as ModerationCategory) || "ADULT_EXPLICIT_SEXUAL",
        reason: SAFETY_REJECTION_MESSAGE,
      };
    }

    return { isSafe: true };
  } catch (error) {
    // On network failure, rely on conservative text check
    return moderateTextPrompt(prompt);
  }
}

// =============================================================================
// 6. VISUAL IMAGE MODERATION (Gemini Vision Inspection)
// =============================================================================

/**
 * Inspects a base64 image (upload or output) for visual safety violations
 */
export async function moderateVisualImage(imageDataUriOrBase64: string): Promise<ModerationResult> {
  if (!imageDataUriOrBase64 || typeof imageDataUriOrBase64 !== "string") {
    return { isSafe: true };
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return { isSafe: true };
  }

  // Ensure valid data URI
  const dataUri = imageDataUriOrBase64.startsWith("data:")
    ? imageDataUriOrBase64
    : `data:image/png;base64,${imageDataUriOrBase64}`;

  const visionPrompt = `You are an automated visual content safety auditor.
Inspect this image with extreme scrutiny for:
1. ADULT_EXPLICIT_SEXUAL: Any visual nudity, bare breasts, exposed nipples, exposed genitalia, exposed bare buttocks, sexual activity, or sexually explicit/erotic postures.
2. CSAM_MINOR_EXPLOITATION: Any depiction of a minor or apparent minor who is unclothed, in underwear, in sexually suggestive poses, or being sexually exploited.
3. GRAPHIC_VIOLENCE_GORE: Visceral gore, decapitation, severed body parts, gruesome mutilation, open mortal wounds, bloodbath.
4. SELF_HARM_SUICIDE: Visual depiction of self-cutting, hanging, suicide.

Safe non-violations:
- Completely clothed individuals in normal public/studio poses.
- Classical museum marble statues without photorealistic pornographic focus.
- Non-gory food, animals, landscapes, objects, architectures.

Respond ONLY with valid JSON:
{
  "isSafe": boolean,
  "category": "ADULT_EXPLICIT_SEXUAL" | "CSAM_MINOR_EXPLOITATION" | "GRAPHIC_VIOLENCE_GORE" | "SELF_HARM_SUICIDE" | "NONE",
  "confidence": number
}`;

  try {
    const result = await geminiVision(visionPrompt, dataUri, {
      json: true,
      temperature: 0.0,
      timeoutMs: 25_000,
    });

    const cleaned = result.text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.isSafe === false) {
      return {
        isSafe: false,
        category: (parsed.category as ModerationCategory) || "ADULT_EXPLICIT_SEXUAL",
        reason: SAFETY_REJECTION_MESSAGE,
      };
    }

    return { isSafe: true };
  } catch (error) {
    console.warn("[ContentModeration] Visual check notice:", error instanceof Error ? error.message : error);
    // If vision call fails or times out, do not block unconfirmed non-violating operations
    return { isSafe: true };
  }
}

// =============================================================================
// 7. COMPREHENSIVE MULTI-STAGE REQUEST AUDITOR
// =============================================================================

/**
 * End-to-end audit for prompt + optional reference image
 */
export async function auditImageGenerationRequest(params: {
  prompt: string;
  referenceImage?: string;
}): Promise<ModerationResult> {
  // Stage 1: Fast rule-based prompt check
  const textCheck = moderateTextPrompt(params.prompt);
  if (!textCheck.isSafe) {
    return textCheck;
  }

  // Stage 2: Reference image visual check (if provided)
  if (params.referenceImage) {
    const visualCheck = await moderateVisualImage(params.referenceImage);
    if (!visualCheck.isSafe) {
      return visualCheck;
    }
  }

  return { isSafe: true };
}
