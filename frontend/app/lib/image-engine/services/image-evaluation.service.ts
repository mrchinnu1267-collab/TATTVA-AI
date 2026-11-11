/**
 * TATTVA AI - Unified Image Evaluation Service (Phase L)
 * Performs independent visual evaluation, object detection, attribute verification,
 * text/OCR verification, spatial evaluation, and multi-dimensional scorecard generation.
 */

import { detectRequirementErrors } from "../accuracy/error-detector";
import { evaluateVisualQuality } from "../visual-evaluation/visual-evaluation-service";
import {
  StructuredGenerationSpec,
  RequirementValidationItem,
  AccuracyScorecard,
} from "../accuracy/types";

export interface UnifiedEvaluationParams {
  image: string;
  checklist: RequirementValidationItem[];
  spec: StructuredGenerationSpec;
  referenceImage?: string;
  prompt?: string;
}

export interface UnifiedEvaluationReport {
  overallScore: number;
  scorecard: AccuracyScorecard;
  validatedChecklist: RequirementValidationItem[];
  missingObjects: string[];
  unrequestedObjects: string[];
  criticalFailuresCount: number;
  verificationVerdict: "pass" | "borderline" | "fail";
  isAccurate: boolean;
}

export class ImageEvaluationService {
  /**
   * Independently evaluates a generated image against structured prompt requirements.
   * Produces quantifiable confidence scores and pass/fail/uncertain verdicts across all 8 dimensions:
   * 1. Object presence
   * 2. Object-count correctness
   * 3. Attribute accuracy
   * 4. Color accuracy
   * 5. Spatial accuracy
   * 6. Reference consistency
   * 7. Text accuracy
   * 8. Visual quality
   */
  public static async evaluate(params: UnifiedEvaluationParams): Promise<UnifiedEvaluationReport> {
    const errorDetection = await detectRequirementErrors({
      image: params.image,
      checklist: params.checklist,
      spec: params.spec,
      referenceImage: params.referenceImage,
    });

    const passedCount = errorDetection.validatedChecklist.filter((c) => c.status === "pass").length;
    const criticalFailures = errorDetection.validatedChecklist.filter(
      (c) => c.critical && c.status === "fail"
    ).length;

    const overall = errorDetection.scorecard.overallAccuracy;
    const verdict: "pass" | "borderline" | "fail" =
      overall >= 85 && criticalFailures === 0
        ? "pass"
        : overall >= 65
        ? "borderline"
        : "fail";

    const missingObjects = errorDetection.validatedChecklist
      .filter((c) => c.category === "object_presence" && c.status === "fail")
      .map((c) => c.statement);

    return {
      overallScore: overall,
      scorecard: errorDetection.scorecard,
      validatedChecklist: errorDetection.validatedChecklist,
      missingObjects,
      unrequestedObjects: [],
      criticalFailuresCount: criticalFailures,
      verificationVerdict: verdict,
      isAccurate: verdict === "pass",
    };
  }

  /**
   * Runs the full computer vision evaluation suite (Grounding DINO + SAM 2 + OCR).
   */
  public static async runComputerVisionSuite(
    image: string,
    prompt: string,
    referenceImage?: string
  ) {
    return evaluateVisualQuality({
      image,
      prompt,
      referenceImage,
    });
  }
}

