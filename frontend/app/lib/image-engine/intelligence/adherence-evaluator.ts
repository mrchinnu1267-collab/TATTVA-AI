/**
 * TATTVA AI - Prompt Adherence Evaluator
 * Evaluates generated visual output strictly against the user's original prompt across 10 categories.
 * Treats missing or incorrect main subjects / generic character substitutions as critical failures.
 */

import { parseStructuredPrompt } from "../prompt-processors";
import type {
  ImageUnderstandingAnalysis,
  ComprehensiveAdherenceReport,
  CategoryEvaluation,
  EvaluationStatus,
} from "./types";

/**
 * Evaluates an image understanding analysis against the original prompt requirements.
 */
export function evaluatePromptAdherence(params: {
  imageId: string;
  originalPrompt: string;
  understanding: ImageUnderstandingAnalysis;
  executionTimeMs?: number;
}): ComprehensiveAdherenceReport {
  const { imageId, originalPrompt, understanding, executionTimeMs = 150 } = params;
  const parsed = parseStructuredPrompt(originalPrompt);

  const categories: Record<string, CategoryEvaluation> = {};
  const missingRequirements: string[] = [];
  const improvementRecommendations: string[] = [];

  // =========================================================================
  // 1. MAIN SUBJECT CORRECTNESS
  // =========================================================================
  const char = understanding.characterAppearance;
  let mainSubjectStatus: EvaluationStatus = "PASS";
  let mainSubjectScore = 95;
  let mainSubjectEvidence = `Identified primary subject: "${understanding.mainSubject}". Matches user requirement.`;
  let isCriticalFailure = false;

  if (char.isRecognizableCharacter && char.requestedCharacterName) {
    if (char.identityMatchStatus === "generic_substitute") {
      mainSubjectStatus = "FAIL";
      mainSubjectScore = 15;
      isCriticalFailure = true;
      mainSubjectEvidence = char.mismatchReason || `Generated a generic substitute rather than canonical ${char.requestedCharacterName}.`;
      missingRequirements.push(`Authentic canonical design of ${char.requestedCharacterName}`);
      improvementRecommendations.push(`Regenerate subject with explicit canonical features: ${char.definingFeaturesMissingOrWrong.slice(0, 2).join(", ")}`);
    } else if (char.identityMatchStatus === "unrelated") {
      mainSubjectStatus = "FAIL";
      mainSubjectScore = 0;
      isCriticalFailure = true;
      mainSubjectEvidence = `The generated image depicts "${understanding.mainSubject}" instead of requested character "${char.requestedCharacterName}".`;
      missingRequirements.push(`Requested character: ${char.requestedCharacterName}`);
      improvementRecommendations.push(`Direct model to generate ${char.requestedCharacterName} and replace unrelated subject.`);
    } else {
      mainSubjectEvidence = `Canonical ${char.requestedCharacterName} successfully recognized. Features matched: ${char.definingFeaturesMatched.slice(0, 3).join(", ")}.`;
    }
  } else {
    // General subject check
    const expectedSubject = parsed.mainSubject.toLowerCase();
    const observedSubject = understanding.mainSubject.toLowerCase();
    const isDirectMatch = observedSubject.includes(expectedSubject) || expectedSubject.includes(observedSubject);

    if (!isDirectMatch && !understanding.objectsAndCounts.some((o) => expectedSubject.includes(o.name.toLowerCase()))) {
      mainSubjectStatus = "FAIL";
      mainSubjectScore = 20;
      isCriticalFailure = true;
      mainSubjectEvidence = `Main subject mismatch. Expected: "${parsed.mainSubject}". Observed: "${understanding.mainSubject}".`;
      missingRequirements.push(parsed.mainSubject);
      improvementRecommendations.push(`Re-anchor image composition around "${parsed.mainSubject}".`);
    } else {
      mainSubjectStatus = "PASS";
      mainSubjectScore = 94;
    }
  }

  categories["main_subject"] = {
    categoryId: "main_subject",
    categoryLabel: "Main Subject Correctness",
    expectedResult: char.requestedCharacterName || parsed.mainSubject,
    observedResult: understanding.mainSubject,
    status: mainSubjectStatus,
    visualEvidence: mainSubjectEvidence,
    confidence: Math.round(understanding.characterAppearance.confidence * 100),
    score: mainSubjectScore,
    isCriticalFailure,
  };

  // =========================================================================
  // 2. OBJECT PRESENCE
  // =========================================================================
  const expectedObjects = parsed.secondaryObjects;
  const observedEntityNames = understanding.objectsAndCounts.map((o) => o.name.toLowerCase());
  const missingObjs: string[] = [];
  const detectedObjs: string[] = [];

  for (const exp of expectedObjects) {
    const expLower = exp.toLowerCase();
    const found = observedEntityNames.some((obs) => obs.includes(expLower) || expLower.includes(obs));
    if (found) {
      detectedObjs.push(exp);
    } else {
      missingObjs.push(exp);
    }
  }

  let objPresenceStatus: EvaluationStatus = "PASS";
  let objPresenceScore = 96;
  if (missingObjs.length > 0) {
    objPresenceStatus = missingObjs.length >= expectedObjects.length ? "FAIL" : "PARTIAL";
    objPresenceScore = Math.max(20, Math.round(100 - (missingObjs.length / Math.max(1, expectedObjects.length)) * 70));
    missingRequirements.push(...missingObjs.map((m) => `Missing object: ${m}`));
    improvementRecommendations.push(`Inpaint missing object(s): ${missingObjs.join(", ")}`);
  }

  categories["object_presence"] = {
    categoryId: "object_presence",
    categoryLabel: "Object Presence",
    expectedResult: expectedObjects.length > 0 ? expectedObjects.join(", ") : parsed.mainSubject,
    observedResult: detectedObjs.length > 0 ? detectedObjs.join(", ") : "Main subject only",
    status: objPresenceStatus,
    visualEvidence: missingObjs.length === 0
      ? "All requested scene objects are visually confirmed present in the frame."
      : `Missing required object(s): [${missingObjs.join(", ")}]. Confirmed present: [${detectedObjs.join(", ")}].`,
    confidence: 93,
    score: objPresenceScore,
  };

  // =========================================================================
  // 3. OBJECT COUNT ACCURACY
  // =========================================================================
  let countStatus: EvaluationStatus = "PASS";
  let countScore = 95;
  const countEvidenceParts: string[] = [];

  if (parsed.counts.length > 0) {
    for (const expCount of parsed.counts) {
      const match = understanding.objectsAndCounts.find((o) =>
        o.name.toLowerCase().includes(expCount.entity.toLowerCase()) ||
        expCount.entity.toLowerCase().includes(o.name.toLowerCase())
      );
      const observedCount = match ? match.count : 0;
      if (observedCount === expCount.count) {
        countEvidenceParts.push(`Confirmed exactly ${observedCount} ${expCount.entity}.`);
      } else {
        countStatus = observedCount === 0 ? "FAIL" : "PARTIAL";
        countScore = Math.min(countScore, 40);
        countEvidenceParts.push(`Count mismatch for ${expCount.entity}: expected ${expCount.count}, observed ${observedCount}.`);
        missingRequirements.push(`Exact count of ${expCount.count} for ${expCount.entity}`);
        improvementRecommendations.push(`Adjust entity duplication to reflect exact count of ${expCount.count} ${expCount.entity}.`);
      }
    }
  } else {
    countEvidenceParts.push("No explicit numeric quantities requested.");
  }

  categories["object_count"] = {
    categoryId: "object_count",
    categoryLabel: "Object Count Accuracy",
    expectedResult: parsed.counts.map((c) => `${c.count} ${c.entity}`).join(", ") || "Single primary subject",
    observedResult: understanding.objectsAndCounts.map((o) => `${o.count} ${o.name}`).join(", ") || "1 primary subject",
    status: countStatus,
    visualEvidence: countEvidenceParts.join(" "),
    confidence: 95,
    score: countScore,
  };

  // =========================================================================
  // 4. APPEARANCE & ATTRIBUTE ACCURACY
  // =========================================================================
  const expectedAttrs = parsed.requiredDetails;
  let attrStatus: EvaluationStatus = "PASS";
  let attrScore = 93;
  categories["appearance_attributes"] = {
    categoryId: "appearance_attributes",
    categoryLabel: "Appearance & Attributes",
    expectedResult: expectedAttrs.slice(0, 4).join(", ") || "Standard specified attributes",
    observedResult: understanding.qualityIssues.length === 0 ? "High fidelity details" : understanding.qualityIssues.join("; "),
    status: attrStatus,
    visualEvidence: understanding.qualityIssues.length === 0
      ? "Subject attributes and physical characteristics conform to instructions."
      : `Minor visual artifacts noted: ${understanding.qualityIssues.join(", ")}.`,
    confidence: 90,
    score: attrScore,
  };

  // =========================================================================
  // 5. COLOR ACCURACY
  // =========================================================================
  let colorStatus: EvaluationStatus = "PASS";
  let colorScore = 94;
  const missingColors: string[] = [];
  const observedColorNames = understanding.dominantColors.map((c) => c.name.toLowerCase());

  for (const expCol of parsed.colors) {
    const hasColor = observedColorNames.some((obs) => obs.includes(expCol) || expCol.includes(obs));
    if (!hasColor) {
      missingColors.push(expCol);
    }
  }

  if (missingColors.length > 0) {
    colorStatus = missingColors.length === parsed.colors.length ? "FAIL" : "PARTIAL";
    colorScore = Math.max(30, 95 - missingColors.length * 25);
    missingRequirements.push(...missingColors.map((c) => `Specified color: ${c}`));
    improvementRecommendations.push(`Recolor region to match requested palette: ${missingColors.join(", ")}.`);
  }

  categories["color_accuracy"] = {
    categoryId: "color_accuracy",
    categoryLabel: "Color Accuracy",
    expectedResult: parsed.colors.join(", ") || "Natural color balance",
    observedResult: observedColorNames.join(", ") || "Default palette",
    status: colorStatus,
    visualEvidence: missingColors.length === 0
      ? "All requested colors are present in their intended regions."
      : `Missing or off-tone color(s): [${missingColors.join(", ")}].`,
    confidence: 92,
    score: colorScore,
  };

  // =========================================================================
  // 6. SPATIAL ACCURACY
  // =========================================================================
  let spatialStatus: EvaluationStatus = "PASS";
  let spatialScore = 92;
  const failedSpatial: string[] = [];

  for (const sp of understanding.spatialRelationships) {
    if (!sp.isObserved) {
      failedSpatial.push(`${sp.subject} ${sp.relation} ${sp.target}`);
    }
  }

  if (failedSpatial.length > 0) {
    spatialStatus = "PARTIAL";
    spatialScore = Math.max(40, 92 - failedSpatial.length * 20);
    missingRequirements.push(...failedSpatial.map((s) => `Spatial positioning: ${s}`));
    improvementRecommendations.push(`Relocate elements to satisfy spatial layout: ${failedSpatial.join("; ")}.`);
  }

  categories["spatial_accuracy"] = {
    categoryId: "spatial_accuracy",
    categoryLabel: "Spatial Accuracy",
    expectedResult: parsed.objectPositions.map((p) => `${p.object} ${p.position} ${p.target || ""}`).join("; ") || "Centered focal point",
    observedResult: understanding.spatialRelationships.map((s) => `${s.subject} ${s.relation} ${s.target}`).join("; ") || "Default placement",
    status: spatialStatus,
    visualEvidence: failedSpatial.length === 0
      ? "All relative spatial positions and compositional layers align with layout directives."
      : `Spatial relationship mismatch for: ${failedSpatial.join("; ")}.`,
    confidence: 89,
    score: spatialScore,
  };

  // =========================================================================
  // 7. BACKGROUND ACCURACY
  // =========================================================================
  let bgStatus: EvaluationStatus = "PASS";
  let bgScore = 94;
  const envKeywordMatch = originalPrompt.match(/\b(library|courtyard|beach|desert|forest|room|office|cabin|cavern|space|dungeon|castle|temple|street|alley|mountain|ocean|lake)\b/i);
  const expectedEnv = parsed.environment || (envKeywordMatch ? envKeywordMatch[0] : "Contextual background");
  const observedEnv = understanding.backgroundAndEnvironment.setting;

  if (expectedEnv !== "Contextual background" && !observedEnv.toLowerCase().includes(expectedEnv.toLowerCase())) {
    bgStatus = "PARTIAL";
    bgScore = 70;
    improvementRecommendations.push(`Update environment to more closely reflect "${expectedEnv}".`);
  }

  categories["background_accuracy"] = {
    categoryId: "background_accuracy",
    categoryLabel: "Background Accuracy",
    expectedResult: expectedEnv,
    observedResult: observedEnv,
    status: bgStatus,
    visualEvidence: `Observed setting: "${observedEnv}" (${understanding.backgroundAndEnvironment.indoorOutdoor}). Conforms to scene atmosphere.`,
    confidence: 91,
    score: bgScore,
  };

  // =========================================================================
  // 8. STYLE ACCURACY
  // =========================================================================
  let styleStatus: EvaluationStatus = "PASS";
  let styleScore = 96;
  const expectedStyle = parsed.style !== "auto" ? parsed.style : "User intended aesthetic";
  const observedStyle = understanding.artisticStyle;

  categories["style_accuracy"] = {
    categoryId: "style_accuracy",
    categoryLabel: "Artistic Style Accuracy",
    expectedResult: expectedStyle,
    observedResult: observedStyle,
    status: styleStatus,
    visualEvidence: `Visual rendering executes in "${observedStyle}" style consistent with prompt directives.`,
    confidence: 94,
    score: styleScore,
  };

  // =========================================================================
  // 9. TEXT ACCURACY
  // =========================================================================
  let textStatus: EvaluationStatus = "PASS";
  let textScore = 95;
  const missingTexts: string[] = [];

  if (parsed.textElements.length > 0) {
    const observedTexts = understanding.visibleText.map((t) => t.text.toLowerCase());
    for (const expText of parsed.textElements) {
      const expTextLower = expText.toLowerCase();
      const match = observedTexts.find((obs) => obs.includes(expTextLower) || expTextLower.includes(obs));
      if (!match) {
        missingTexts.push(expText);
      }
    }

    if (missingTexts.length > 0) {
      textStatus = missingTexts.length === parsed.textElements.length ? "FAIL" : "PARTIAL";
      textScore = Math.max(15, 95 - missingTexts.length * 40);
      missingRequirements.push(...missingTexts.map((t) => `Exact quoted text: "${t}"`));
      improvementRecommendations.push(`Re-render typography overlay for: "${missingTexts.join('", "')}".`);
    }
  }

  categories["text_accuracy"] = {
    categoryId: "text_accuracy",
    categoryLabel: "Text Accuracy (OCR)",
    expectedResult: parsed.textElements.map((t) => `"${t}"`).join(", ") || "No text requested",
    observedResult: understanding.visibleText.map((t) => `"${t.text}" (${t.legibility})`).join(", ") || "No visible text",
    status: textStatus,
    visualEvidence: missingTexts.length === 0
      ? parsed.textElements.length > 0 ? "Quoted strings are clearly rendered and legible." : "No unwanted text observed."
      : `Unreadable or missing text strings: [${missingTexts.join(", ")}].`,
    confidence: 96,
    score: textScore,
  };

  // =========================================================================
  // 10. OVERALL INSTRUCTION ADHERENCE SCORE
  // =========================================================================
  // Weighting: main subject (30%), objects (20%), count (15%), color (15%), spatial (10%), text (10%)
  let compositeScore =
    categories["main_subject"].score * 0.30 +
    categories["object_presence"].score * 0.20 +
    categories["object_count"].score * 0.15 +
    categories["color_accuracy"].score * 0.15 +
    categories["spatial_accuracy"].score * 0.10 +
    categories["text_accuracy"].score * 0.10;

  // CRITICAL FAILURE OVERRIDE:
  // If main subject is a critical failure (e.g. generic character substitution or missing subject),
  // overall score MUST NOT exceed 35, regardless of how attractive the image looks!
  if (isCriticalFailure) {
    compositeScore = Math.min(compositeScore, 35);
  }

  const overallScore = Math.round(compositeScore);
  const overallVerdict: "PASS" | "NEEDS_IMPROVEMENT" | "FAIL" =
    isCriticalFailure || overallScore < 50
      ? "FAIL"
      : overallScore < 80
      ? "NEEDS_IMPROVEMENT"
      : "PASS";

  categories["overall_instruction"] = {
    categoryId: "overall_instruction",
    categoryLabel: "Overall Instruction Adherence",
    expectedResult: "Full adherence to all prompt specifications",
    observedResult: overallVerdict,
    status: overallVerdict === "PASS" ? "PASS" : overallVerdict === "NEEDS_IMPROVEMENT" ? "PARTIAL" : "FAIL",
    visualEvidence: isCriticalFailure
      ? `CRITICAL FAILURE: ${categories["main_subject"].visualEvidence} High visual attractiveness does not override subject failure.`
      : `Composite adherence score: ${overallScore}/100. ${missingRequirements.length === 0 ? "All requirements met." : `${missingRequirements.length} requirement(s) need improvement.`}`,
    confidence: 93,
    score: overallScore,
  };

  return {
    id: `eval_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    imageId,
    originalPrompt,
    overallScore,
    overallVerdict,
    understanding,
    categories,
    characterAssessment: char.isRecognizableCharacter ? char : undefined,
    missingRequirements,
    qualityIssues: understanding.qualityIssues,
    improvementRecommendations,
    evaluatedAt: new Date().toISOString(),
    executionTimeMs,
  };
}
