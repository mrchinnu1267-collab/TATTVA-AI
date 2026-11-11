/**
 * TATTVA AI - Automatic Correction Engine
 * Executes targeted inpainting and localized editing on failed image regions,
 * strictly preserving already-correct areas and enforcing cost-controlled attempt limits.
 */

import {
  RequirementValidationItem,
  StructuredGenerationSpec,
  TargetedCorrectionRecord,
  AccuracyScorecard,
} from "./types";
import { executeImageEdit } from "../editing/inpainting-engine";
import { createRectangleMask } from "../editing/mask-generator";
import { detectRequirementErrors } from "./error-detector";

export const MAX_CORRECTION_ATTEMPTS = 2;

/**
 * Iteratively corrects failed requirements using localized inpainting.
 */
export async function executeAutomatedCorrection(params: {
  currentImage: string;
  checklist: RequirementValidationItem[];
  spec: StructuredGenerationSpec;
  currentScorecard: AccuracyScorecard;
  maxAttempts?: number;
  referenceImage?: string;
}): Promise<{
  correctedImage: string;
  finalChecklist: RequirementValidationItem[];
  finalScorecard: AccuracyScorecard;
  correctionHistory: TargetedCorrectionRecord[];
}> {
  const {
    currentImage,
    checklist,
    spec,
    currentScorecard,
    maxAttempts = MAX_CORRECTION_ATTEMPTS,
    referenceImage,
  } = params;

  let activeImage = currentImage;
  let activeChecklist = checklist;
  let activeScorecard = currentScorecard;
  const correctionHistory: TargetedCorrectionRecord[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // 1. Identify the highest priority failed requirement
    const failedItem = activeChecklist.find((item) => item.status === "fail");
    if (!failedItem) {
      // All requirements satisfied!
      break;
    }

    const rawBox = failedItem.affectedRegionBox;
    const box: [number, number, number, number] = Array.isArray(rawBox)
      ? rawBox
      : rawBox && typeof rawBox === "object"
      ? [
          Math.round((rawBox as any).y * 1000),
          Math.round((rawBox as any).x * 1000),
          Math.round(((rawBox as any).y + (rawBox as any).height) * 1000),
          Math.round(((rawBox as any).x + (rawBox as any).width) * 1000),
        ]
      : [200, 200, 800, 800];
    const correctionInstruction =
      failedItem.suggestedCorrection ||
      `Fix and correct: ${failedItem.statement}. Maintain existing background and other objects.`;

    // 2. Synthesize Bounding Box Mask for the affected region
    // Default image size 1024x1024
    const x = Math.round((box[1] / 1000) * 1024);
    const y = Math.round((box[0] / 1000) * 1024);
    const w = Math.max(64, Math.round(((box[3] - box[1]) / 1000) * 1024));
    const h = Math.max(64, Math.round(((box[2] - box[0]) / 1000) * 1024));

    const maskDataUri = createRectangleMask(1024, 1024, { x, y, width: w, height: h });

    // 3. Execute Localized Surgical Inpainting (preserving unmasked regions)
    try {
      const editResult = await executeImageEdit({
        image: activeImage,
        instruction: correctionInstruction,
        operation: "inpainting",
        mask: maskDataUri,
        maskOptions: {
          featherRadiusPx: 8,
          dilationRadiusPx: 4,
        },
      });

      const newImage = editResult.editedImage;

      // 4. Re-evaluate New Image
      const reEvaluation = await detectRequirementErrors({
        image: newImage,
        checklist: activeChecklist,
        spec,
        referenceImage,
      });

      const improved = reEvaluation.scorecard.overallAccuracy >= activeScorecard.overallAccuracy;

      correctionHistory.push({
        attempt,
        failedRequirementId: failedItem.id,
        requirementStatement: failedItem.statement,
        affectedRegion: `[${box.join(", ")}]`,
        correctionPrompt: correctionInstruction,
        modelUsed: editResult.model,
        resultImage: newImage,
        improved,
        scoreBefore: activeScorecard.overallAccuracy,
        scoreAfter: reEvaluation.scorecard.overallAccuracy,
      });

      if (improved) {
        activeImage = newImage;
        activeChecklist = reEvaluation.validatedChecklist;
        activeScorecard = reEvaluation.scorecard;
      }
    } catch (err) {
      console.warn(`[AutoCorrector] Correction attempt ${attempt} encountered error:`, err);
      break;
    }
  }

  return {
    correctedImage: activeImage,
    finalChecklist: activeChecklist,
    finalScorecard: activeScorecard,
    correctionHistory,
  };
}
