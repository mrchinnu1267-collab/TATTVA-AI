/**
 * TATTVA AI - Intelligent Targeted Image Correction Service
 * Implements the "Improve This Image" workflow:
 * 1. Retrieves failed requirements from visual evaluation.
 * 2. Formulates surgical, targeted editing instructions while preserving correct elements.
 * 3. Dispatches to image-editing pipeline.
 * 4. Re-evaluates the revised image and tracks iteration attempts (max 3).
 */

import { executeImageEdit } from "../editing/inpainting-engine";
import { analyzeGeneratedImage } from "./vision-analyzer";
import { evaluatePromptAdherence } from "./adherence-evaluator";
import type {
  ComprehensiveAdherenceReport,
  TargetedEditingInstruction,
  IntelligentCorrectionResult,
} from "./types";

const MAX_CORRECTION_ATTEMPTS = 3;

/**
 * Formulates a targeted surgical editing instruction based on evaluation failures.
 */
export function formulateTargetedEditingInstruction(
  report: ComprehensiveAdherenceReport
): TargetedEditingInstruction {
  const failedCategories = Object.values(report.categories).filter(
    (c) => c.status === "FAIL" || c.status === "PARTIAL"
  );
  const passedCategories = Object.values(report.categories).filter((c) => c.status === "PASS");

  const preserveElements = passedCategories
    .filter((c) => c.categoryId !== "overall_instruction")
    .map((c) => c.observedResult)
    .filter(Boolean);

  // Check character failure first
  const mainSubjectEval = report.categories["main_subject"];
  if (mainSubjectEval && (mainSubjectEval.status === "FAIL" || mainSubjectEval.isCriticalFailure)) {
    const charName = report.characterAssessment?.requestedCharacterName;
    return {
      action: "full_edit",
      targetDescription: charName || mainSubjectEval.expectedResult,
      promptDirective: `Replace the central figure with the exact canonical design of "${charName || mainSubjectEval.expectedResult}". Include all distinctive features and signature colors while maintaining scene background.`,
      preserveElements: [report.understanding.backgroundAndEnvironment.setting],
      failedRequirementsAddressed: [mainSubjectEval.categoryLabel, ...report.missingRequirements],
      maskHint: "center foreground",
    };
  }

  // Check missing objects
  const objPresenceEval = report.categories["object_presence"];
  if (objPresenceEval && objPresenceEval.status !== "PASS") {
    const missing = report.missingRequirements.filter((m) => m.toLowerCase().includes("missing object"));
    const items = missing.length > 0 ? missing.map((m) => m.replace(/missing object:\s*/i, "")) : [objPresenceEval.expectedResult];
    return {
      action: "add_object",
      targetDescription: items.join(", "),
      promptDirective: `Keep all existing subjects (${preserveElements.slice(0, 2).join(", ")}) exactly unchanged. Inpaint and add: ${items.join(" and ")} naturally into the composition.`,
      preserveElements,
      failedRequirementsAddressed: [objPresenceEval.categoryLabel, ...items],
      maskHint: "empty midground or foreground area",
    };
  }

  // Check color accuracy
  const colorEval = report.categories["color_accuracy"];
  if (colorEval && colorEval.status !== "PASS") {
    return {
      action: "adjust_color",
      targetDescription: colorEval.expectedResult,
      promptDirective: `Preserve the geometry and details of all objects. Correct the colors strictly to: ${colorEval.expectedResult}.`,
      preserveElements,
      failedRequirementsAddressed: [colorEval.categoryLabel],
    };
  }

  // Check background
  const bgEval = report.categories["background_accuracy"];
  if (bgEval && bgEval.status !== "PASS") {
    return {
      action: "replace_background",
      targetDescription: bgEval.expectedResult,
      promptDirective: `Preserve the primary subjects in the foreground. Replace the background with: ${bgEval.expectedResult}.`,
      preserveElements,
      failedRequirementsAddressed: [bgEval.categoryLabel],
      maskHint: "background",
    };
  }

  // General refinement fallback
  return {
    action: "inpaint",
    targetDescription: report.missingRequirements.join(", ") || "General fidelity refinement",
    promptDirective: `Refine this image to satisfy: ${report.improvementRecommendations.join("; ")}. Keep existing high-quality elements intact.`,
    preserveElements,
    failedRequirementsAddressed: report.missingRequirements,
  };
}

/**
 * Executes one iteration of intelligent targeted correction.
 */
export async function improveImageIntelligently(params: {
  image: string;
  originalPrompt: string;
  currentReport: ComprehensiveAdherenceReport;
  attemptNumber?: number;
  maxAttempts?: number;
  forceVision?: boolean;
}): Promise<IntelligentCorrectionResult> {
  const {
    image,
    originalPrompt,
    currentReport,
    attemptNumber = 1,
    maxAttempts = MAX_CORRECTION_ATTEMPTS,
    forceVision = true,
  } = params;

  if (attemptNumber > maxAttempts) {
    return {
      originalImage: image,
      revisedImage: image,
      attemptNumber,
      maxAttempts,
      editingInstruction: formulateTargetedEditingInstruction(currentReport),
      postCorrectionReport: currentReport,
      improvementDelta: 0,
      satisfiedRequirements: [],
      remainingUnsatisfiedRequirements: currentReport.missingRequirements,
      status: "unsuccessful",
    };
  }

  // 1. Formulate Targeted Surgical Instruction
  const instruction = formulateTargetedEditingInstruction(currentReport);

  // 2. Dispatch to Image Editing Engine
  let revisedImage = image;
  try {
    const editResult = await executeImageEdit({
      image,
      instruction: instruction.promptDirective,
      preserveUnmasked: true,
    });
    revisedImage = editResult.editedImage || image;
  } catch (err: any) {
    console.warn(`[CorrectionService] executeImageEdit error: ${err.message}. Retrying with visual refinement.`);
  }

  // 3. Evaluate the Revised Result
  const postUnderstanding = await analyzeGeneratedImage({
    image: revisedImage,
    originalPrompt,
    forceVision,
  });

  const postReport = evaluatePromptAdherence({
    imageId: `revised_${attemptNumber}_${Date.now()}`,
    originalPrompt,
    understanding: postUnderstanding,
  });

  // 4. Calculate Improvement Delta and Track Satisfied Requirements
  const improvementDelta = postReport.overallScore - currentReport.overallScore;

  const satisfiedRequirements: string[] = [];
  const remainingUnsatisfied: string[] = [];

  for (const prevReq of currentReport.missingRequirements) {
    const stillMissing = postReport.missingRequirements.some(
      (m) => m.toLowerCase().includes(prevReq.toLowerCase()) || prevReq.toLowerCase().includes(m.toLowerCase())
    );
    if (!stillMissing) {
      satisfiedRequirements.push(prevReq);
    } else {
      remainingUnsatisfied.push(prevReq);
    }
  }

  const status: "improved" | "partial" | "unsuccessful" =
    postReport.overallVerdict === "PASS"
      ? "improved"
      : improvementDelta > 0
      ? "partial"
      : "unsuccessful";

  return {
    originalImage: image,
    revisedImage,
    attemptNumber,
    maxAttempts,
    editingInstruction: instruction,
    postCorrectionReport: postReport,
    improvementDelta,
    satisfiedRequirements,
    remainingUnsatisfiedRequirements: remainingUnsatisfied,
    status,
  };
}

