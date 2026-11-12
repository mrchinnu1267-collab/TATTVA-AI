/**
 * TATTVA AI - Advanced Accuracy Research Service (Phase R)
 * Unified service interface exposing Scene Graph generation, Spatial Conditioning,
 * Multi-Stage Pipeline execution, Multi-Evaluator Consensus, and Comparative 200 Benchmarks.
 */

import {
  SceneGraphGenerator,
  SpatialConditioningResearch,
  ReferencePreservationResearch,
  MultiStageResearchPipeline,
  EvaluationResearchEngine,
  ControlledBenchmarkRunner,
  HardwareGuardrails,
  type SceneGraph,
  type MultiStagePipelineResult,
  type MultiEvaluatorConsensus,
  type Benchmark200ComparisonReport,
  type VRAMAllocationSpec,
  type ReferencePreservationSpec,
} from "../accuracy-research";

export class AccuracyResearchService {
  /**
   * Parses natural language into a structured Scene Graph.
   */
  public static generateSceneGraph(prompt: string): SceneGraph {
    return SceneGraphGenerator.generate(prompt);
  }

  /**
   * Executes the full 9-stage verified generation architecture.
   */
  public static async executeMultiStagePipeline(prompt: string): Promise<MultiStagePipelineResult> {
    return MultiStageResearchPipeline.execute(prompt);
  }

  /**
   * Evaluates an image across multiple independent visual evaluators for consensus scoring.
   */
  public static evaluateConsensus(params: {
    image: string;
    sceneGraph: SceneGraph;
    referenceImage?: string;
  }): MultiEvaluatorConsensus {
    return EvaluationResearchEngine.evaluateConsensus(params);
  }

  /**
   * Runs the 200-prompt comparative benchmark comparing the 5 generation architectures.
   */
  public static getComparativeBenchmark(): Benchmark200ComparisonReport {
    return ControlledBenchmarkRunner.runComparativeBenchmark();
  }

  /**
   * Evaluates VRAM footprint and precision recommendations for target hardware (RTX 3050).
   */
  public static evaluateVRAM(
    modelId: string,
    precision: "fp32" | "fp16" | "fp8_e4m3" | "int4_quantized" = "fp8_e4m3"
  ): VRAMAllocationSpec {
    return HardwareGuardrails.evaluateModelAllocation(modelId, precision);
  }

  /**
   * Creates an advanced reference preservation plan with immutable vs mutable rules.
   */
  public static createPreservationPlan(params: {
    referenceImageDataUri: string;
    subjectIdentity: string;
    immutableAttributes?: string[];
    mutableAttributes?: string[];
    elementsToRemove?: string[];
    elementsToAdd?: string[];
  }): ReferencePreservationSpec {
    return ReferencePreservationResearch.createPreservationPlan(params);
  }
}

