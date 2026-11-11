/**
 * TATTVA AI - Unified Reference Analysis Service (Phase L)
 * Analyzes uploaded reference images, validates dimensions and MIME payloads,
 * extracts visual semantics, and classifies user conditioning intent.
 */

import { validateReferenceImage } from "../reference-conditioning/validator";
import { analyzeReferenceImage, classifyConditioningIntent } from "../reference-conditioning/analyzer";
import { ReferenceAnalysis, ConditioningIntent, ReferenceImageValidation } from "../reference-conditioning/types";

export interface UnifiedReferenceAnalysis {
  isValid: boolean;
  validationError?: string;
  intent: ConditioningIntent;
  analysis: ReferenceAnalysis;
}

export class ReferenceAnalysisService {
  /**
   * Validates raw reference image data URI or file buffer.
   */
  public static validate(dataUri: string): ReferenceImageValidation {
    return validateReferenceImage(dataUri);
  }

  /**
   * Classifies user transformation intent (e.g. keep character, change background, restyle, pose transfer).
   */
  public static classifyIntent(prompt: string): ConditioningIntent {
    return classifyConditioningIntent(prompt);
  }

  /**
   * Performs deep multi-modal analysis of the reference image against user prompt.
   */
  public static async analyze(dataUri: string, prompt: string): Promise<UnifiedReferenceAnalysis> {
    const validation = validateReferenceImage(dataUri);
    if (!validation.isValid) {
      return {
        isValid: false,
        validationError: validation.error,
        intent: classifyConditioningIntent(prompt),
        analysis: {
          primarySubject: "unknown",
          secondaryObjects: [],
          composition: "centered",
          colorPalette: [],
          shapesAndSilhouettes: [],
          spatialRelationships: [],
          preservedDetails: [],
          source: "structural_heuristic",
        },
      };
    }

    const intent = classifyConditioningIntent(prompt);
    const analysis = await analyzeReferenceImage(dataUri, prompt);

    return {
      isValid: true,
      intent,
      analysis,
    };
  }
}

