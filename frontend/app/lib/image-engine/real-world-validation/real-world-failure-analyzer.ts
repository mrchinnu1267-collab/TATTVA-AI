/**
 * TATTVA AI - Phase U: Real-World Failure Analyzer
 * Diagnostics, Classification & Pipeline Component Attribution
 */

import {
  FailureRecord,
  FailureCategory,
  PipelineComponent,
  UnseenBenchmarkPrompt,
  IndependentEvaluationResult,
} from "./types";

export interface ComponentAttributionSummary {
  component: PipelineComponent;
  failureCount: number;
  failureCategories: FailureCategory[];
  primaryRootCause: string;
  recommendedEngineeringRemediation: string;
}

export class RealWorldFailureAnalyzer {
  private static instance: RealWorldFailureAnalyzer;

  private constructor() {}

  public static getInstance(): RealWorldFailureAnalyzer {
    if (!RealWorldFailureAnalyzer.instance) {
      RealWorldFailureAnalyzer.instance = new RealWorldFailureAnalyzer();
    }
    return RealWorldFailureAnalyzer.instance;
  }

  /**
   * Diagnoses an evaluation result to extract structured failure records
   */
  public diagnoseEvaluation(
    prompt: UnseenBenchmarkPrompt,
    result: IndependentEvaluationResult
  ): FailureRecord[] {
    const failures: FailureRecord[] = [];
    const dims = result.dimensions;

    // 1. Missing Objects
    if (dims.objectPresence.score < 88.0) {
      failures.push({
        id: `fail-${prompt.id}-obj-pres`,
        promptId: prompt.id,
        category: "missing_objects",
        responsibleComponent: "diffusion_backbone",
        description: `Subject or critical secondary item omitted during cross-attention latents synthesis.`,
        severity: dims.objectPresence.score < 75.0 ? "critical" : "major",
        suggestedCorrectionModel: "sd-2-0-inpainting-fp8",
      });
    }

    // 2. Incorrect Quantities
    if (dims.objectCount.score < 89.0 && prompt.category === "exact_quantities") {
      failures.push({
        id: `fail-${prompt.id}-obj-cnt`,
        promptId: prompt.id,
        category: "incorrect_quantities",
        responsibleComponent: "scene_graph_planner",
        description: `Instance counting mismatch: diffusion attention blended or replicated repeated entities without enforcing discrete bounding boxes.`,
        severity: "critical",
        affectedRegionBBox: [0.15, 0.2, 0.85, 0.8],
        suggestedCorrectionModel: "sd-2-0-inpainting-fp8",
      });
    }

    // 3. Incorrect Attributes / Colors
    if (dims.colorAccuracy.score < 86.0) {
      failures.push({
        id: `fail-${prompt.id}-color`,
        promptId: prompt.id,
        category: "incorrect_colors",
        responsibleComponent: "prompt_compiler",
        description: `Color bleeding: color token assigned to wrong adjacent noun in dense CLIP token sequence.`,
        severity: "minor",
        suggestedCorrectionModel: "sd-2-0-inpainting-fp8",
      });
    }

    // 4. Incorrect Spatial Relationships
    if (dims.spatialAccuracy.score < 87.0 && prompt.category === "spatial_relations") {
      failures.push({
        id: `fail-${prompt.id}-spatial`,
        promptId: prompt.id,
        category: "incorrect_spatial_relations",
        responsibleComponent: "spatial_controlnet",
        description: `Centroid coordinate offset exceeded 8% tolerance threshold. Spatial prior insufficiently weighted during first 15 diffusion steps.`,
        severity: "major",
        affectedRegionBBox: [0.05, 0.1, 0.95, 0.9],
        suggestedCorrectionModel: "sd-2-0-inpainting-fp8",
      });
    }

    // 5. Reference Mismatches
    if (dims.referenceConsistency.score < 88.0 && prompt.category === "reference_preservation") {
      failures.push({
        id: `fail-${prompt.id}-ref`,
        promptId: prompt.id,
        category: "reference_mismatches",
        responsibleComponent: "reference_vault",
        description: `Visual DNA cosine similarity fell below 0.88 threshold; landmark distortion in facial or architectural contour.`,
        severity: "critical",
        suggestedCorrectionModel: "sd-2-0-inpainting-fp8",
      });
    }

    // 6. Incorrect Text / Typography
    if (dims.textAccuracy.score < 90.0 && prompt.category === "typography_text") {
      failures.push({
        id: `fail-${prompt.id}-text`,
        promptId: prompt.id,
        category: "incorrect_text",
        responsibleComponent: "prompt_compiler",
        description: `Character glyph distortion, letter transposition, or pseudo-glyph generation in render pass.`,
        severity: "critical",
        affectedRegionBBox: [0.2, 0.2, 0.8, 0.5],
        suggestedCorrectionModel: "sd-2-0-inpainting-fp8",
      });
    }

    // 7. Composition Errors
    if (dims.compositionAccuracy.score < 85.0 && prompt.category === "complex_compositions") {
      failures.push({
        id: `fail-${prompt.id}-comp`,
        promptId: prompt.id,
        category: "composition_errors",
        responsibleComponent: "scene_graph_planner",
        description: `Perspective horizon angle diverged from prompt requirement (e.g. Dutch angle flattening or macro perspective loss).`,
        severity: "major",
        suggestedCorrectionModel: "sd-2-0-inpainting-fp8",
      });
    }

    return failures;
  }

  /**
   * Aggregates failure distribution by pipeline component
   */
  public generateComponentAttributionTree(
    allFailures: FailureRecord[]
  ): ComponentAttributionSummary[] {
    const componentMap: Record<PipelineComponent, { count: number; categories: Set<FailureCategory> }> = {
      prompt_compiler: { count: 0, categories: new Set() },
      scene_graph_planner: { count: 0, categories: new Set() },
      model_router: { count: 0, categories: new Set() },
      spatial_controlnet: { count: 0, categories: new Set() },
      reference_vault: { count: 0, categories: new Set() },
      diffusion_backbone: { count: 0, categories: new Set() },
      evaluator: { count: 0, categories: new Set() },
    };

    for (const f of allFailures) {
      if (componentMap[f.responsibleComponent]) {
        componentMap[f.responsibleComponent].count++;
        componentMap[f.responsibleComponent].categories.add(f.category);
      }
    }

    const componentRootCauses: Record<PipelineComponent, { cause: string; fix: string }> = {
      prompt_compiler: {
        cause: "Token budget exhaustion or attribute binding ambiguity in dense prompts.",
        fix: "Pre-flight token budget auditing, quote isolation, and clause-decoupling sanitization.",
      },
      scene_graph_planner: {
        cause: "Spatial centroid overlap or lack of discrete bounding-box partitioning for identical entities.",
        fix: "Rigid non-overlapping Voronoi/Grid spatial layout templates injected into conditioning latents.",
      },
      model_router: {
        cause: "Routing typography or complex spatial tasks to unconditioned generalist models.",
        fix: "Enforce mandatory specialized routing: FLUX Dev for typography, ControlNet for spatial, Gemini for complex reasoning.",
      },
      spatial_controlnet: {
        cause: "Low conditioning scale in early denoise steps (< 0.65) allowing diffusion drift.",
        fix: "Enforce dynamic ControlNet scheduling: 0.85 weight for steps 0-15, decaying to 0.45 for fine details.",
      },
      reference_vault: {
        cause: "Unconstrained cross-attention blending mutates reference facial landmarks during background replacement.",
        fix: "Strict reference feature freeze mask protecting identity regions with cosine floor >= 0.88.",
      },
      diffusion_backbone: {
        cause: "Probabilistic omission of secondary scene elements under heavy prompt conditioning.",
        fix: "Multi-stage hierarchical progressive rendering and regional prompt attention boosts.",
      },
      evaluator: {
        cause: "Detector misclassifications or OCR false positives under extreme lighting.",
        fix: "Multi-evaluator consensus engine with uncertainty bounds and human calibration checks.",
      },
    };

    return (Object.keys(componentMap) as PipelineComponent[]).map((comp) => ({
      component: comp,
      failureCount: componentMap[comp].count,
      failureCategories: Array.from(componentMap[comp].categories),
      primaryRootCause: componentRootCauses[comp].cause,
      recommendedEngineeringRemediation: componentRootCauses[comp].fix,
    }));
  }
}

