/**
 * TATTVA AI - Phase U: Real-World Validator
 * Master Orchestrator for Unseen Benchmark, Blind Evaluation, Diagnostics & Correction
 */

import {
  UnseenBenchmarkPrompt,
  IndependentEvaluationResult,
  RealWorldValidationStats,
  CorrectionAttemptResult,
  GeneralizationProbeResult,
  PromptCategory,
} from "./types";
import { UnseenBenchmarkCatalog } from "./unseen-benchmark-dataset";
import { BlindEvaluationEngine } from "./blind-evaluation-engine";
import { RealWorldFailureAnalyzer } from "./real-world-failure-analyzer";
import { SurgicalCorrectionTester } from "./surgical-correction-tester";
import { GeneralizationProber } from "./generalization-prober";
import { ProductionTestHarness } from "./production-test-harness";
import { StatisticalAnalyzer } from "./statistical-analyzer";

export class RealWorldValidator {
  private static instance: RealWorldValidator;
  private catalog: UnseenBenchmarkCatalog;
  private evaluator: BlindEvaluationEngine;
  private failureAnalyzer: RealWorldFailureAnalyzer;
  private correctionTester: SurgicalCorrectionTester;
  private generalizationProber: GeneralizationProber;
  private prodHarness: ProductionTestHarness;
  private statsAnalyzer: StatisticalAnalyzer;

  private constructor() {
    this.catalog = UnseenBenchmarkCatalog.getInstance();
    this.evaluator = BlindEvaluationEngine.getInstance();
    this.failureAnalyzer = RealWorldFailureAnalyzer.getInstance();
    this.correctionTester = SurgicalCorrectionTester.getInstance();
    this.generalizationProber = GeneralizationProber.getInstance();
    this.prodHarness = ProductionTestHarness.getInstance();
    this.statsAnalyzer = StatisticalAnalyzer.getInstance();
  }

  public static getInstance(): RealWorldValidator {
    if (!RealWorldValidator.instance) {
      RealWorldValidator.instance = new RealWorldValidator();
    }
    return RealWorldValidator.instance;
  }

  public getDatasetSummary() {
    return this.catalog.getDatasetSummary();
  }

  public getPrompts(category?: PromptCategory): UnseenBenchmarkPrompt[] {
    if (category) {
      return this.catalog.getPromptsByCategory(category);
    }
    return this.catalog.getAllPrompts();
  }

  public getPromptById(id: string): UnseenBenchmarkPrompt | undefined {
    return this.catalog.getPromptById(id);
  }

  public evaluateSinglePrompt(
    promptId: string,
    maskedModelId: string,
    sampleSeed: number = 42
  ): IndependentEvaluationResult | null {
    const prompt = this.catalog.getPromptById(promptId);
    if (!prompt) return null;
    return this.evaluator.evaluatePromptGeneration(prompt, maskedModelId, sampleSeed);
  }

  public runCorrectionTest(promptId: string, maskedModelId: string = "model_gamma"): CorrectionAttemptResult | null {
    const prompt = this.catalog.getPromptById(promptId);
    if (!prompt) return null;

    const evalResult = this.evaluator.evaluatePromptGeneration(prompt, maskedModelId);
    const failures = this.failureAnalyzer.diagnoseEvaluation(prompt, evalResult);
    const targetFailure = failures[0] || {
      id: `fail-${prompt.id}-def`,
      promptId: prompt.id,
      category: "incorrect_attributes" as const,
      responsibleComponent: "prompt_compiler" as const,
      description: "Minor attribute deviation requiring localized refinement",
      severity: "minor" as const,
      affectedRegionBBox: [0.2, 0.2, 0.8, 0.8] as [number, number, number, number],
      suggestedCorrectionModel: "sd-2-0-inpainting-fp8",
    };

    return this.correctionTester.testCorrection(prompt, evalResult, targetFailure);
  }

  public runGeneralizationSuite() {
    return this.generalizationProber.runGeneralizationSuite();
  }

  public runProductionEnvironmentVerification() {
    return this.prodHarness.verifyProductionEnvironment();
  }

  public getValidationStatistics(): RealWorldValidationStats {
    return this.statsAnalyzer.computeValidationStats();
  }
}

