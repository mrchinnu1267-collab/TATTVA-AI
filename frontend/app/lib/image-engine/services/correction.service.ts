/**
 * TATTVA AI - Unified Correction Service (Phase L)
 * Executes surgical inpainting and targeted error correction on failed image regions,
 * strictly preserving unmasked valid pixels, and verifying post-correction accuracy.
 */

import { executeAutomatedCorrection, MAX_CORRECTION_ATTEMPTS } from "../accuracy/auto-corrector";
import { planRefinement } from "../visual-evaluation/refinement-planner";
import {
  RequirementValidationItem,
  StructuredGenerationSpec,
  AccuracyScorecard,
  TargetedCorrectionRecord,
} from "../accuracy/types";

export interface CorrectionParams {
  currentImage: string;
  checklist: RequirementValidationItem[];
  spec: StructuredGenerationSpec;
  currentScorecard: AccuracyScorecard;
  maxAttempts?: number;
  referenceImage?: string;
}

export interface CorrectionResult {
  correctedImage: string;
  finalChecklist: RequirementValidationItem[];
  finalScorecard: AccuracyScorecard;
  correctionHistory: TargetedCorrectionRecord[];
  hasImprovements: boolean;
}

export class CorrectionService {
  /**
   * Performs automated surgical corrections on identified requirement failures.
   */
  public static async executeCorrection(params: CorrectionParams): Promise<CorrectionResult> {
    const res = await executeAutomatedCorrection(params);
    const hasImprovements = res.correctionHistory.some((h) => h.improved);

    return {
      correctedImage: res.correctedImage,
      finalChecklist: res.finalChecklist,
      finalScorecard: res.finalScorecard,
      correctionHistory: res.correctionHistory,
      hasImprovements,
    };
  }

  /**
   * Plans an intelligent refinement recommendation based on missing or unrequested objects.
   */
  public static planRefinement(params: {
    missingObjects: string[];
    unrequestedObjects: string[];
    scorecard: any;
    prompt: string;
    detectedObjects?: any[];
    ocrResult?: any;
    attributeEvaluations?: any[];
    spatialScore?: number;
  }) {
    return planRefinement({
      scorecard: params.scorecard,
      missingObjects: params.missingObjects,
      unrequestedObjects: params.unrequestedObjects,
      detectedObjects: params.detectedObjects || [],
      ocrResult: params.ocrResult || {
        detectedTexts: [],
        overallConfidence: 1,
        matchedExpectedTexts: [],
        missingExpectedTexts: [],
        levenshteinSimilarities: {},
      },
      attributeEvaluations: params.attributeEvaluations || [],
      spatialScore: params.spatialScore ?? 90,
      originalPrompt: params.prompt,
    });
  }
}

