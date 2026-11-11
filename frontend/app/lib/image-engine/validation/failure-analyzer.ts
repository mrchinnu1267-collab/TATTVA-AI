/**
 * TATTVA AI - Phase M: Failure Classification & Root Cause Analysis Engine
 * Categorizes generative failures across 10 discrete failure modes and
 * traces each failure back to its architectural origin (interpretation, compilation,
 * routing, model limitations, spatial control, or reference conditioning).
 */

import {
  ClassifiedFailure,
  EvaluationDimension,
  FailureCategory,
  FailureOrigin,
  ValidationRequirementResult,
} from "./types";

export interface FailureAnalysisSummary {
  totalFailures: number;
  byCategory: Record<FailureCategory, number>;
  byOrigin: Record<FailureOrigin, number>;
  recurringPatterns: Array<{
    pattern: string;
    occurrences: number;
    recommendedMitigation: string;
    impact: "high" | "medium" | "low";
  }>;
  actionableRecommendations: string[];
}

/**
 * Classifies an individual failed or uncertain requirement.
 */
export function classifyRequirementFailure(
  req: ValidationRequirementResult,
  promptText: string
): ClassifiedFailure {
  let failureCategory: FailureCategory = "composition_mismatch";
  let origin: FailureOrigin = "model_limitations";
  let action: ClassifiedFailure["suggestedCorrectionAction"] = "inpainting";

  switch (req.dimension) {
    case "text_accuracy":
      failureCategory = "incorrect_text";
      origin = "model_limitations"; // Transformer tokenization limitations with glyphs
      action = "re-routing"; // Route to FLUX or Gemini which excel at typography
      break;

    case "object_count":
      failureCategory = "incorrect_quantities";
      origin = "model_limitations"; // Cross-attention binding difficulty on count token binding
      action = "inpainting";
      break;

    case "spatial_accuracy":
      failureCategory = "incorrect_positioning";
      origin = "spatial_control"; // Layout conditioning / ControlNet map misalignment
      action = "inpainting";
      break;

    case "color_accuracy":
      failureCategory = "incorrect_colors";
      origin = "prompt_compilation"; // Bleed between color adjectives and neighboring nouns
      action = "inpainting";
      break;

    case "reference_consistency":
      failureCategory = "reference_mismatch";
      origin = "reference_conditioning"; // IP-Adapter / ControlNet weight strength imbalance
      action = "regeneration";
      break;

    case "attribute_accuracy":
      failureCategory = "incorrect_attributes";
      origin = "prompt_compilation";
      action = "prompt_refine";
      break;

    case "object_presence":
      failureCategory = "missing_objects";
      origin = promptText.length > 200 ? "prompt_interpretation" : "model_limitations";
      action = "inpainting";
      break;

    case "composition_accuracy":
      failureCategory = "composition_mismatch";
      origin = "model_limitations";
      action = "regeneration";
      break;

    case "visual_quality":
    default:
      failureCategory = "extra_objects";
      origin = "model_limitations";
      action = "inpainting";
      break;
  }

  return {
    requirementId: req.id,
    dimension: req.dimension,
    failureCategory,
    origin,
    detail: req.evidence || `Failed requirement: ${req.description}`,
    suggestedCorrectionAction: action,
  };
}

/**
 * Aggregates failures across multiple test runs and detects recurring architectural bottlenecks.
 */
export function analyzeFailureCorpus(
  failures: ClassifiedFailure[]
): FailureAnalysisSummary {
  const byCategory: Record<FailureCategory, number> = {
    missing_objects: 0,
    extra_objects: 0,
    incorrect_quantities: 0,
    incorrect_colors: 0,
    incorrect_attributes: 0,
    incorrect_positioning: 0,
    incorrect_background: 0,
    reference_mismatch: 0,
    incorrect_text: 0,
    composition_mismatch: 0,
  };

  const byOrigin: Record<FailureOrigin, number> = {
    prompt_interpretation: 0,
    prompt_compilation: 0,
    model_limitations: 0,
    provider_routing: 0,
    reference_conditioning: 0,
    spatial_control: 0,
    image_editing: 0,
    evaluation_errors: 0,
  };

  for (const f of failures) {
    if (byCategory[f.failureCategory] !== undefined) byCategory[f.failureCategory]++;
    if (byOrigin[f.origin] !== undefined) byOrigin[f.origin]++;
  }

  // Detect recurring patterns
  const recurringPatterns = [
    {
      pattern: "Count Binding Drift on >3 Entities",
      occurrences: byCategory.incorrect_quantities,
      recommendedMitigation: "Enforce Multi-Bounding Box Spatial Directives and localized surgical inpainting pass.",
      impact: "high" as const,
    },
    {
      pattern: "Text Glyphs Scrambling on SDXL / Pollinations",
      occurrences: byCategory.incorrect_text,
      recommendedMitigation: "Route all typography-critical prompts strictly to Gemini or FLUX.1-dev with isolated text bounding masks.",
      impact: "high" as const,
    },
    {
      pattern: "Left/Right Spatial Inversion under Complex Compositions",
      occurrences: byCategory.incorrect_positioning,
      recommendedMitigation: "Inject explicit horizontal coordinate clamping into prompt compilation and ControlNet synthetic masks.",
      impact: "medium" as const,
    },
    {
      pattern: "Color Bleed Across Adjacent Objects",
      occurrences: byCategory.incorrect_colors,
      recommendedMitigation: "Use semantic isolation brackets and segmented prompt formatting during compiler optimization.",
      impact: "medium" as const,
    },
    {
      pattern: "Identity Drift on Multi-Angle Subject Conditioning",
      occurrences: byCategory.reference_mismatch,
      recommendedMitigation: "Increase subject IP-Adapter conditioning weight to 0.85 and lock primary facial features.",
      impact: "high" as const,
    },
  ];

  const actionableRecommendations = [
    "Prioritize FLUX.1-dev and Gemini for prompts demanding exact numbers, signs, or text strings.",
    "Execute automatic localized inpainting whenever count fidelity or color mismatch is identified.",
    "Clamp spatial bounding boxes to strictly non-overlapping regions during layout generation.",
    "Persist identified failure coordinates to the historical regression catalog to trigger targeted retry routing.",
  ];

  return {
    totalFailures: failures.length,
    byCategory,
    byOrigin,
    recurringPatterns,
    actionableRecommendations,
  };
}

