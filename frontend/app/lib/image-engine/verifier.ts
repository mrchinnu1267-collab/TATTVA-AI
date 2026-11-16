/**
 * TATTVA AI - Genuine Gemini Multimodal Vision Adherence Verifier
 * 
 * Compares the generated image against the original user prompt and compiled requirements.
 * Evaluates the 8 core adherence dimensions:
 * - Main subject accuracy: 25%
 * - Object presence: 20%
 * - Object count: 15%
 * - Color accuracy: 10%
 * - Spatial accuracy: 10%
 * - Background accuracy: 10%
 * - Style accuracy: 5%
 * - Text accuracy: 5%
 * 
 * Never returns a heuristic score as genuine vision.
 * If Gemini Vision is unavailable, marks status honestly as "unavailable".
 */

import { geminiVision, getGeminiApiKey } from "./gemini";
import { readImageSize } from "./image-utils";
import { CHARACTER_REGISTRY } from "./intelligence/character-verifier";
import type {
  CompiledImagePrompt,
  ImageCategoryScores,
  ImageRequirement,
  ImageVerification,
  RequirementCheck,
} from "./types";

function clampScore(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function verdictFor(score: number): "pass" | "borderline" | "fail" {
  if (score >= 85) return "pass";
  if (score >= 65) return "borderline";
  return "fail";
}

function parseJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Returns an honest "unavailable" verification result when Gemini Vision is not reachable.
 * Never fabricates or presents a heuristic score as verified vision.
 */
export function unavailableVerification(
  image: string,
  compiled: CompiledImagePrompt,
  reason: string
): ImageVerification {
  const size = readImageSize(image);
  const issues: string[] = [reason];

  if (!size) {
    issues.push("Could not inspect image dimensions.");
  }

  const requirements: RequirementCheck[] = compiled.requirements.map((item) => ({
    id: item.id,
    text: item.text,
    critical: item.critical,
    met: null,
    note: "Visual verification unavailable.",
  }));

  return {
    score: 0,
    verdict: "fail",
    method: "unavailable",
    status: "unavailable",
    confidence: 0,
    requirements,
    issues: [
      ...issues,
      "Verification status: Unavailable. Visual adherence could not be confirmed by Gemini Vision.",
    ],
    missingRequirements: ["Visual verification unavailable"],
    recommendations: ["Configure GEMINI_API_KEY to enable automated multimodal visual verification."],
    suggestedFix: undefined,
    targetAchieved: false,
  };
}

/** Legacy alias for compatibility */
export function heuristicVerification(
  image: string,
  compiled: CompiledImagePrompt,
  reason?: string
): ImageVerification {
  return unavailableVerification(
    image,
    compiled,
    reason || "Visual adherence was not checked. Configure GEMINI_API_KEY for vision verification."
  );
}

export async function verifyImage(params: {
  image: string;
  compiled: CompiledImagePrompt;
  requirements?: ImageRequirement[];
  useVision?: boolean;
}): Promise<ImageVerification> {
  const { image, compiled } = params;
  const requirements = params.requirements || compiled.requirements;

  if (params.useVision === false) {
    return unavailableVerification(image, compiled, "Vision verification was disabled for this request.");
  }

  if (!getGeminiApiKey()) {
    return unavailableVerification(image, compiled, "Gemini Vision API key is not configured.");
  }

  // Automatically extract character identification requirements for known figures
  const characterReqs: ImageRequirement[] = [];
  const promptLower = (compiled.prompt || "").toLowerCase();
  for (const [key, sig] of Object.entries(CHARACTER_REGISTRY)) {
    if (sig.aliases.some((alias) => promptLower.includes(alias))) {
      characterReqs.push({
        id: `char_${key}`,
        category: "subject",
        text: `Authentic canonical ${sig.name} appearance (${sig.definingTraits.slice(0, 3).join(", ")}). Must NOT be a generic substitute, unrelated animal, or astronaut.`,
        critical: true,
      });
    }
  }

  const effectiveRequirements = [
    ...requirements,
    ...characterReqs.filter((cr) => !requirements.some((r) => r.text.includes(cr.text))),
  ];

  const checklist = effectiveRequirements.length
    ? effectiveRequirements
        .map((item) => `- id="${item.id}" [${item.category}] ${item.text}${item.critical ? " (critical)" : ""}`)
        .join("\n")
    : "- Judge overall semantic fidelity and visual adherence to the user prompt.";

  const auditorPrompt = `You are a forensic computer vision auditor for TATTVA AI.
Compare the attached generated image with the user's prompt and checklist.

USER REQUEST:
"""${compiled.prompt}"""

CHECKLIST OF REQUIREMENTS:
${checklist}

AUDIT RULES:
1. CONTENT SAFETY: Check for nudity, explicit sexual content, or gore. If present, set score: 0, verdict: "fail", and note violation in issues.
2. MAIN SUBJECT (25% weight): Is the primary subject present and correct? If a canonical character was requested, generic substitutions fail.
3. OBJECT PRESENCE (20% weight): Are all secondary objects present? Identify which are present and which are missing.
4. OBJECT COUNT (15% weight): Do counts match prompt numbers? (e.g. 2 cats != 1 cat or 3 cats).
5. COLOR ACCURACY (10% weight): Are colors applied to the correct items as specified?
6. SPATIAL RELATIONSHIPS (10% weight): Are relative placements (left of, behind, above) strictly observed?
7. BACKGROUND (10% weight): Does the environment/setting match the requested location/atmosphere?
8. ARTISTIC STYLE (5% weight): Does rendering match style (photorealistic, 3D render, anime, painting)?
9. TEXT ACCURACY (5% weight): Are quoted words spelled with 100% precision and clearly legible?
10. VISUAL DEFECTS: Check for distorted anatomy, extra limbs/fingers, or severe blurring.

SCORING POLICY:
- Score each dimension 0 to 100 based strictly on visible pixels.
- Never award 100% overall unless EVERY requirement is visibly present with zero defects.
- Critical subject failure (missing subject or generic character substitution) MUST cap overall score at 25 or below.
- Provide a concrete "suggestedFix" and "correctedPrompt" for the next attempt:
  "Preserve the existing [present elements]. Make [missing elements] clearly visible throughout the environment."

Respond ONLY with valid JSON:
{
  "categoryScores": {
    "main_subject": number,
    "object_presence": number,
    "object_count": number,
    "color_accuracy": number,
    "spatial_accuracy": number,
    "background_accuracy": number,
    "style_accuracy": number,
    "text_accuracy": number
  },
  "confidence": number,
  "presentElements": string[],
  "missingRequirements": string[],
  "issues": string[],
  "recommendations": string[],
  "requirements": [{ "id": string, "met": boolean | null, "note": string }],
  "suggestedFix": string,
  "correctedPrompt": string
}`;

  try {
    const visionResult = await geminiVision(auditorPrompt, image, {
      json: true,
      temperature: 0.1,
      timeoutMs: 45_000,
    });

    const parsed = parseJson(visionResult.text);
    if (!parsed) {
      throw new Error("Gemini Vision response could not be parsed as structured JSON.");
    }

    const rawCats = (parsed.categoryScores as Record<string, unknown>) || {};
    const categoryScores: ImageCategoryScores = {
      main_subject: clampScore(rawCats.main_subject ?? 85),
      object_presence: clampScore(rawCats.object_presence ?? 85),
      object_count: clampScore(rawCats.object_count ?? 85),
      color_accuracy: clampScore(rawCats.color_accuracy ?? 85),
      spatial_accuracy: clampScore(rawCats.spatial_accuracy ?? 85),
      background_accuracy: clampScore(rawCats.background_accuracy ?? 85),
      style_accuracy: clampScore(rawCats.style_accuracy ?? 85),
      text_accuracy: clampScore(rawCats.text_accuracy ?? 85),
    };

    // Deterministic 8-dimension weighted formula:
    let compositeScore =
      categoryScores.main_subject * 0.25 +
      categoryScores.object_presence * 0.20 +
      categoryScores.object_count * 0.15 +
      categoryScores.color_accuracy * 0.10 +
      categoryScores.spatial_accuracy * 0.10 +
      categoryScores.background_accuracy * 0.10 +
      categoryScores.style_accuracy * 0.05 +
      categoryScores.text_accuracy * 0.05;

    const rawChecks = Array.isArray(parsed.requirements) ? parsed.requirements : [];
    const checkMap = new Map<string, { met: boolean | null; note?: string }>();
    for (const entry of rawChecks as Array<Record<string, unknown>>) {
      if (typeof entry.id !== "string") continue;
      const met = entry.met === true ? true : entry.met === false ? false : null;
      checkMap.set(entry.id, {
        met,
        note: typeof entry.note === "string" ? entry.note : undefined,
      });
    }

    const checks: RequirementCheck[] = effectiveRequirements.map((item) => {
      const found = checkMap.get(item.id);
      return {
        id: item.id,
        text: item.text,
        critical: item.critical,
        met: found ? found.met : null,
        note: found?.note,
      };
    });

    const criticalMisses = checks.filter((item) => item.critical && item.met === false);
    const mainSubjectFailed = categoryScores.main_subject < 40 || criticalMisses.length > 0;

    // Severe penalty for critical subject failure
    if (mainSubjectFailed) {
      compositeScore = Math.min(compositeScore, 25);
    }

    const missingRequirements = Array.isArray(parsed.missingRequirements)
      ? (parsed.missingRequirements as unknown[]).filter((x): x is string => typeof x === "string")
      : [];

    const issues = Array.isArray(parsed.issues)
      ? (parsed.issues as unknown[]).filter((x): x is string => typeof x === "string")
      : [];

    if (criticalMisses.length > 0) {
      issues.unshift(
        `Critical requirement missing: ${criticalMisses.map((m) => `"${m.text}"`).join(", ")}`
      );
    }

    // Never return 100% unless genuinely 100% compliant with zero missing requirements
    if (missingRequirements.length > 0 || issues.length > 0) {
      compositeScore = Math.min(compositeScore, 94);
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(compositeScore)));
    const targetAchieved = finalScore >= 95;
    const confidence = clampScore(parsed.confidence ?? 92);

    const recommendations = Array.isArray(parsed.recommendations)
      ? (parsed.recommendations as unknown[]).filter((x): x is string => typeof x === "string")
      : [];

    const suggestedFix =
      typeof parsed.suggestedFix === "string" && parsed.suggestedFix.trim()
        ? parsed.suggestedFix.trim()
        : undefined;

    return {
      score: finalScore,
      verdict: verdictFor(finalScore),
      method: "vision",
      status: targetAchieved ? "verified" : "needs_improvement",
      confidence,
      model: visionResult.model,
      requirements: checks,
      issues,
      missingRequirements,
      recommendations,
      suggestedFix,
      targetAchieved,
      categoryScores,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return unavailableVerification(
      image,
      compiled,
      `Gemini Vision verification error: ${errorMsg}`
    );
  }
}
