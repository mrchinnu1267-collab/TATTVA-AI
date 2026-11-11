/**
 * TATTVA AI - Master Visual Evaluation Service (Phase E)
 * Orchestrates Object Detection, Segmentation, Attribute Verification,
 * Spatial Alignment, Reference Fidelity, OCR, Scorecard Formulation, and Refinement Planning.
 */

import {
  VisualEvaluationResult,
  QualityScorecard,
} from "./types";
import { detectObjects } from "./object-detector";
import { segmentObjects } from "./segmentation";
import { verifyAttributes } from "./attribute-verifier";
import { verifyTextAndOcr } from "./ocr-verifier";
import { compareWithReference } from "./reference-comparator";
import { planRefinement } from "./refinement-planner";
import { buildSceneSpatialLayout } from "../spatial-control/layout-parser";
import { evaluateSpatialLayout } from "../spatial-control/spatial-evaluator";
import { extractRequirements } from "../prompt-compiler";

export interface VisualEvaluationServiceParams {
  image: string;
  prompt: string;
  referenceImage?: string;
  useVision?: boolean;
}

/**
 * Executes comprehensive multi-dimensional visual evaluation across a generated image.
 */
export async function evaluateVisualQuality(
  params: VisualEvaluationServiceParams
): Promise<VisualEvaluationResult> {
  const { image, prompt, referenceImage, useVision = true } = params;
  const started = Date.now();

  // 1. Extract Structured Visual Requirements
  const compiledReqs = extractRequirements(prompt);
  const requestedObjectNames = compiledReqs
    .filter((r) => r.category === "subject" || r.category === "entity")
    .map((r) => r.text.replace(/^(a|an|the)\s+/i, ""));

  // 2. Object Detection & Grounding
  const detectionReport = await detectObjects({
    image,
    requestedObjects: requestedObjectNames.length > 0 ? requestedObjectNames : [prompt.slice(0, 30)],
    mainSubjectHint: requestedObjectNames[0],
  });

  // 3. Semantic Segmentation & Subject Isolation (SAM 2 Interface)
  const segmentationReport = segmentObjects(detectionReport.detected);

  // 4. Attribute Verification
  const attributeEvaluations = await verifyAttributes({
    image,
    prompt,
    detectedObjects: detectionReport.detected,
  });

  // 5. Spatial Accuracy Evaluation
  const targetLayout = buildSceneSpatialLayout(prompt);
  const spatialReport = evaluateSpatialLayout(
    targetLayout,
    detectionReport.detected.map((d) => ({
      label: d.label,
      box: d.box,
      depthLayer: d.layer,
    }))
  );

  // 6. Reference Image Comparison
  const referenceComparison = await compareWithReference({
    generatedImage: image,
    referenceImage,
    userPrompt: prompt,
  });

  // 7. OCR & Text Accuracy Verification
  const ocrResult = await verifyTextAndOcr({
    image,
    prompt,
  });

  // 8. Quality Scorecard Computation (8 Transparent Dimensions)
  const objectPresenceScore = detectionReport.missing.length === 0
    ? 96
    : Math.max(20, Math.round(100 - (detectionReport.missing.length / Math.max(1, requestedObjectNames.length)) * 80));

  const matchedAttrs = attributeEvaluations.filter((a) => a.matched).length;
  const attributeAccuracyScore = attributeEvaluations.length > 0
    ? Math.round((matchedAttrs / attributeEvaluations.length) * 100)
    : 92;

  const unwantedObjectFreedomScore = detectionReport.unrequested.length === 0
    ? 98
    : Math.max(30, 98 - detectionReport.unrequested.length * 25);

  const spatialAccuracyScore = spatialReport.overallScore;
  const referenceFidelityScore = referenceComparison.referenceProvided
    ? Math.round((referenceComparison.subjectConsistencyScore + referenceComparison.preservedRegionsScore) / 2)
    : 100;
  const textAccuracyScore = ocrResult.overallTextAccuracy;
  const visualQualityScore = segmentationReport.subjectIsolationScore;

  // Prompt adherence aggregates individual domain scores
  const promptAdherenceScore = Math.round(
    objectPresenceScore * 0.30 +
    attributeAccuracyScore * 0.25 +
    spatialAccuracyScore * 0.20 +
    textAccuracyScore * 0.15 +
    unwantedObjectFreedomScore * 0.10
  );

  const overallScore = Math.round(
    promptAdherenceScore * 0.35 +
    objectPresenceScore * 0.15 +
    attributeAccuracyScore * 0.15 +
    spatialAccuracyScore * 0.10 +
    referenceFidelityScore * 0.10 +
    textAccuracyScore * 0.05 +
    visualQualityScore * 0.05 +
    unwantedObjectFreedomScore * 0.05
  );

  const verdict: "pass" | "borderline" | "fail" =
    overallScore >= 85 ? "pass" : overallScore >= 65 ? "borderline" : "fail";

  // Keep confidence score separate from pass/fail verdict
  const confidenceScore = useVision ? 92 : 70;

  const scorecard: QualityScorecard = {
    overallScore,
    verdict,
    confidenceScore,
    promptAdherence: promptAdherenceScore,
    objectPresence: objectPresenceScore,
    attributeAccuracy: attributeAccuracyScore,
    spatialAccuracy: spatialAccuracyScore,
    referenceFidelity: referenceFidelityScore,
    textAccuracy: textAccuracyScore,
    visualQuality: visualQualityScore,
    unwantedObjectFreedom: unwantedObjectFreedomScore,
    metricsSummary: {
      totalRequirementsCount: compiledReqs.length,
      passedRequirementsCount: Math.round((compiledReqs.length * overallScore) / 100),
      missingObjectsCount: detectionReport.missing.length,
      unrequestedObjectsCount: detectionReport.unrequested.length,
    },
  };

  // 9. Targeted Intelligent Refinement Planning
  const refinementRecommendation = planRefinement({
    scorecard,
    missingObjects: detectionReport.missing,
    unrequestedObjects: detectionReport.unrequested,
    detectedObjects: detectionReport.detected,
    ocrResult,
    attributeEvaluations,
    spatialScore: spatialAccuracyScore,
    originalPrompt: prompt,
  });

  return {
    scorecard,
    detectedObjects: detectionReport.detected,
    missingObjects: detectionReport.missing,
    unrequestedObjects: detectionReport.unrequested,
    segmentedObjects: segmentationReport.segmentedObjects,
    attributeEvaluations,
    spatialScore: spatialAccuracyScore,
    spatialDeviations: spatialReport.issues,
    referenceComparison: referenceComparison.referenceProvided ? referenceComparison : undefined,
    ocrResult,
    refinementRecommendation,
    evaluationMethod: detectionReport.method === "grounded_vision" ? "vision_llm_grounding" : "heuristic_fallback",
    latencyMs: Date.now() - started,
  };
}
