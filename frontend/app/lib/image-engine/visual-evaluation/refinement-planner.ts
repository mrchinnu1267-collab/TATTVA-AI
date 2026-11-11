/**
 * TATTVA AI - Intelligent Refinement Planner & Execution Engine (Phase E)
 * When an image requirement fails, determines whether localized inpainting
 * or global regeneration is optimal, isolating flawed regions to protect correct pixels.
 */

import {
  RefinementAction,
  QualityScorecard,
  DetectedObject,
  TextOcrResult,
  AttributeEvaluation,
} from "./types";
import { generateObjectSegmentationMask } from "./segmentation";

export interface RefinementPlanInput {
  scorecard: QualityScorecard;
  missingObjects: string[];
  unrequestedObjects: string[];
  detectedObjects: DetectedObject[];
  ocrResult: TextOcrResult;
  attributeEvaluations: AttributeEvaluation[];
  spatialScore: number;
  originalPrompt: string;
}

/**
 * Formulates a targeted surgical refinement decision.
 */
export function planRefinement(input: RefinementPlanInput): RefinementAction {
  const {
    scorecard,
    missingObjects,
    unrequestedObjects,
    detectedObjects,
    ocrResult,
    attributeEvaluations,
    spatialScore,
    originalPrompt,
  } = input;

  // 1. If overall score passes threshold (>= 85) and critical elements are verified, accept
  if (scorecard.overallScore >= 85 && missingObjects.length === 0) {
    return {
      type: "accept_as_is",
      rationale: "All critical visual requirements and quality benchmarks satisfied.",
      priority: "none",
    };
  }

  // 2. Localized Inpainting Case: An unwanted artifact/object was detected
  if (unrequestedObjects.length > 0) {
    // Find if the unwanted object is in detected objects list
    const unwanted = unrequestedObjects[0];
    const targetObj = detectedObjects.find((d) =>
      d.label.toLowerCase().includes(unwanted.toLowerCase())
    );

    const targetBox = targetObj ? targetObj.box : { x: 0.65, y: 0.65, width: 0.25, height: 0.25 };

    return {
      type: "inpaint_region",
      targetObject: unwanted,
      inpaintBoundingBox: targetBox,
      rationale: `Detected unrequested artifact '${unwanted}'. Localized inpainting recommended to erase and blend region while preserving surrounding valid elements.`,
      revisedPrompt: `clean background, seamlessly matching surrounding environment without '${unwanted}'`,
      recommendedNegative: unwanted,
      priority: "critical",
    };
  }

  // 3. Localized Inpainting Case: Missing a secondary accessory or attribute
  if (missingObjects.length === 1 && detectedObjects.length >= 1) {
    const missing = missingObjects[0];
    // Find empty location in midground / foreground for inpainting
    const targetBox = { x: 0.35, y: 0.45, width: 0.3, height: 0.3 };

    return {
      type: "inpaint_region",
      targetObject: missing,
      inpaintBoundingBox: targetBox,
      rationale: `Missing requested element '${missing}'. Localized inpainting recommended to insert object without regenerating already-verified scene elements.`,
      revisedPrompt: `A high-detail ${missing}, rendered with consistent scene lighting and perspective`,
      priority: "high",
    };
  }

  // 4. OCR / Text Failure Case
  const failedText = ocrResult.requiredPhrases.find((p) => !p.spellingAccurate);
  if (failedText) {
    return {
      type: "regenerate_with_negative",
      rationale: `Exact text '${failedText.phrase}' was misspelled or illegible. Re-generating with typographic prompt reweighting.`,
      revisedPrompt: `${originalPrompt} | Crisp, bold legible text clearly reading exactly: "${failedText.phrase}"`,
      recommendedNegative: "illegible text, misspelled words, blurry typography, gibberish letters",
      priority: "high",
    };
  }

  // 5. Attribute Failure Case (e.g. wrong color)
  const failedAttr = attributeEvaluations.find((a) => !a.matched);
  if (failedAttr) {
    return {
      type: "prompt_reweight",
      rationale: `Visual attribute mismatch: ${failedAttr.attributeName} was expected to be '${failedAttr.targetValue}' but appeared as '${failedAttr.observedValue}'.`,
      revisedPrompt: `${originalPrompt}, with emphasis on vivid ${failedAttr.targetValue} ${failedAttr.attributeName.toLowerCase()}`,
      priority: "moderate",
    };
  }

  // 6. Global Spatial Failure Case
  if (spatialScore < 65) {
    return {
      type: "regenerate_with_negative",
      rationale: "Spatial distribution and object ordering diverged significantly from scene directives. Re-generating with reinforced coordinate anchors.",
      revisedPrompt: `${originalPrompt} | Strict spatial alignment, high composition adherence`,
      priority: "moderate",
    };
  }

  return {
    type: "accept_as_is",
    rationale: "Minor deviations observed but acceptable within generation quality tolerance.",
    priority: "none",
  };
}
