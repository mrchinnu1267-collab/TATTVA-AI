/**
 * TATTVA AI - Phase S: Next-Generation Architecture Service
 * Unified service providing high-level facade for Scene Planning, Model Intelligence,
 * Hierarchical Pipeline Execution, Independent Evaluation, Targeted Inpainting Correction,
 * and the 300-Prompt Benchmark Suite.
 */

import {
  IntelligentScenePlanner,
  ModelIntelligenceMatrix,
  SpatialIntelligenceEngine,
  ReferenceIntelligenceEngine,
  HierarchicalStageOrchestrator,
  IndependentEvaluator,
  TargetedCorrectionEngine,
  AdaptiveOptimizer,
  NextGenBenchmark300,
  NextGenPipelineOrchestrator,
  NextGenPipelineRequest,
  NextGenPipelineResponse,
  StructuredScenePlan,
  ModelSelectionDecision,
  MultiEvaluatorConsensusResult,
  TargetedCorrectionReport,
  ReferenceInputSpec,
  ComparativeBenchmarkSummary300,
  BenchmarkPromptSpec,
  AdaptivePolicyConfig,
} from "../nextgen-architecture";

export class NextGenArchitectureService {
  private static instance: NextGenArchitectureService;

  private constructor() {}

  public static getInstance(): NextGenArchitectureService {
    if (!NextGenArchitectureService.instance) {
      NextGenArchitectureService.instance = new NextGenArchitectureService();
    }
    return NextGenArchitectureService.instance;
  }

  /**
   * Plans a structured scene from prompt and references
   */
  public planScene(prompt: string, references?: ReferenceInputSpec[]): StructuredScenePlan {
    return IntelligentScenePlanner.getInstance().planScene(prompt, references);
  }

  /**
   * Selects optimal model matching capabilities to requirements and hardware safety
   */
  public selectModel(
    scenePlan: StructuredScenePlan,
    references?: ReferenceInputSpec[],
    preferLocal = false
  ): ModelSelectionDecision {
    return ModelIntelligenceMatrix.getInstance().selectOptimalModel(scenePlan, references, false, preferLocal);
  }

  /**
   * Executes the full Next-Gen Verified Generation Pipeline
   */
  public async executePipeline(request: NextGenPipelineRequest): Promise<NextGenPipelineResponse> {
    return NextGenPipelineOrchestrator.getInstance().executePipeline(request);
  }

  /**
   * Evaluates image with independent multi-evaluator consensus
   */
  public evaluateImage(
    scenePlan: StructuredScenePlan,
    references?: ReferenceInputSpec[]
  ): MultiEvaluatorConsensusResult {
    return IndependentEvaluator.getInstance().evaluateImage(scenePlan, references);
  }

  /**
   * Applies surgical inpainting on detected error regions
   */
  public correctErrors(
    scenePlan: StructuredScenePlan,
    initialEvaluation: MultiEvaluatorConsensusResult,
    imageUrl: string,
    maxAttempts = 2
  ): TargetedCorrectionReport {
    return TargetedCorrectionEngine.getInstance().executeTargetedCorrection(
      scenePlan,
      initialEvaluation,
      imageUrl,
      maxAttempts
    );
  }

  /**
   * Retrieves the 300 benchmark prompts
   */
  public get300BenchmarkPrompts(): BenchmarkPromptSpec[] {
    return NextGenBenchmark300.getInstance().getPrompts();
  }

  /**
   * Runs the 300-prompt comparative benchmark across Architectures A-F
   */
  public run300Benchmark(): ComparativeBenchmarkSummary300 {
    return NextGenBenchmark300.getInstance().runComparativeBenchmark();
  }

  /**
   * Retrieves current adaptive policy weights
   */
  public getAdaptivePolicy(): AdaptivePolicyConfig {
    return AdaptiveOptimizer.getInstance().getCurrentPolicy();
  }

  /**
   * Applies experimental policy weights
   */
  public applyExperimentalPolicy(weights: Partial<AdaptivePolicyConfig["weights"]>): {
    success: boolean;
    policy: AdaptivePolicyConfig;
    notes: string;
  } {
    return AdaptiveOptimizer.getInstance().applyExperimentalPolicy(weights);
  }

  /**
   * Rolls back policy to previous snapshot
   */
  public rollbackPolicy() {
    return AdaptiveOptimizer.getInstance().rollbackToLastCheckpoint();
  }
}
