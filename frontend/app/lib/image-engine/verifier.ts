/**
 * Adherence verifier. Uses Gemini vision when available and falls back to a
 * structural heuristic so generation never depends on the verifier.
 */

import { geminiVision, getGeminiApiKey } from "./gemini";
import { readImageSize } from "./image-utils";
import type {
  CompiledImagePrompt,
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

export function heuristicVerification(
  image: string,
  compiled: CompiledImagePrompt,
  reason?: string
): ImageVerification {
  const size = readImageSize(image);
  const issues: string[] = [];

  if (!size) {
    issues.push("Could not read the generated image dimensions.");
  } else if (compiled.requirements.some((item) => item.category === "text")) {
    issues.push("Exact text cannot be confirmed without vision verification.");
  }

  const requirements: RequirementCheck[] = compiled.requirements.map((item) => ({
    id: item.id,
    text: item.text,
    critical: item.critical,
    met: null,
    note: item.category === "text" ? "Needs visual inspection." : undefined,
  }));

  return {
    score: 72,
    verdict: "borderline",
    method: "heuristic",
    requirements,
    issues: [
      ...(reason ? [reason] : []),
      ...issues,
      "Visual adherence was not checked. Configure GEMINI_API_KEY for vision verification.",
    ],
    suggestedFix: undefined,
  };
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
    return heuristicVerification(image, compiled, "Vision verification was disabled for this request.");
  }

  if (!getGeminiApiKey()) {
    return heuristicVerification(image, compiled, "Vision verifier is not configured.");
  }

  const checklist = requirements.length
    ? requirements
        .map((item) => `- id="${item.id}" [${item.category}] ${item.text}${item.critical ? " (critical)" : ""}`)
        .join("\n")
    : "- No explicit details were extracted. Judge overall semantic fidelity to the request.";

  const prompt = `You are a strict image adherence auditor. Compare the attached generated image with the user's request.

USER REQUEST:
"""${compiled.prompt}"""

CHECKLIST (verify each item individually):
${checklist}

Rules:
- CRITICAL SAFETY AUDIT: Check if the image contains any nudity, bare breasts, exposed genitalia, or sexually suggestive adult content. If any adult nudity or 18+ content is detected, set "score": 0, "verdict": "fail", and add "Prohibited adult/nude content detected" into "issues".
- Judge ONLY what is visibly present. Do not assume or give credit for good style alone.
- Counts must match exactly (no extra or missing subjects).
- Quoted text must be spelled exactly as written.
- Exclusions must be fully absent.
- If an item is truly impossible to judge, use null with a short note.
- Score 0-100 for overall adherence to the request, weighting critical items heavily.
- "suggestedFix" must be a short, concrete instruction for the next generation attempt.

Respond ONLY with valid JSON:
{
  "score": number,
  "verdict": "pass" | "borderline" | "fail",
  "requirements": [{ "id": string, "met": boolean | null, "note": string }],
  "issues": string[],
  "suggestedFix": string
}`;

  try {
    const result = await geminiVision(prompt, image, { json: true, temperature: 0.1 });
    const parsed = parseJson(result.text);
    if (!parsed) throw new Error("Verifier returned invalid JSON.");

    const rawChecks = Array.isArray(parsed.requirements) ? parsed.requirements : [];
    const checkMap = new Map<string, { met: boolean | null; note?: string }>();
    for (const entry of rawChecks as Array<Record<string, unknown>>) {
      if (typeof entry.id !== "string") continue;
      const met =
        entry.met === true ? true : entry.met === false ? false : null;
      checkMap.set(entry.id, {
        met,
        note: typeof entry.note === "string" ? entry.note : undefined,
      });
    }

    const checks: RequirementCheck[] = requirements.map((item) => {
      const found = checkMap.get(item.id);
      return {
        id: item.id,
        text: item.text,
        critical: item.critical,
        met: found ? found.met : null,
        note: found?.note,
      };
    });

    // A critical miss caps the score, even if the model was generous.
    const criticalMisses = checks.filter((item) => item.critical && item.met === false);
    let score = clampScore(parsed.score);
    if (criticalMisses.length >= 2) score = Math.min(score, 68);
    else if (criticalMisses.length === 1) score = Math.min(score, 82);

    const issues = Array.isArray(parsed.issues)
      ? (parsed.issues as unknown[]).filter((item): item is string => typeof item === "string")
      : [];

    return {
      score,
      verdict: verdictFor(score),
      method: "vision",
      model: result.model,
      requirements: checks,
      issues,
      suggestedFix:
        typeof parsed.suggestedFix === "string" && parsed.suggestedFix.trim()
          ? parsed.suggestedFix.trim()
          : undefined,
    };
  } catch (error) {
    return heuristicVerification(
      image,
      compiled,
      `Vision verification failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
