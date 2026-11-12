/**
 * TATTVA AI - RealWorldValidationService (Phase U)
 * Unified service facade connecting the Real-World Validation system to the image studio.
 */

import {
  RealWorldValidator,
  UnseenBenchmarkCatalog,
  BlindEvaluationEngine,
  RealWorldFailureAnalyzer,
  SurgicalCorrectionTester,
  GeneralizationProber,
  ProductionTestHarness,
  StatisticalAnalyzer,
  PromptCategory,
} from "../real-world-validation";

export class RealWorldValidationService {
  private static validator = RealWorldValidator.getInstance();
  private static catalog = UnseenBenchmarkCatalog.getInstance();
  private static evaluator = BlindEvaluationEngine.getInstance();
  private static failureAnalyzer = RealWorldFailureAnalyzer.getInstance();
  private static correctionTester = SurgicalCorrectionTester.getInstance();
  private static prober = GeneralizationProber.getInstance();
  private static prodHarness = ProductionTestHarness.getInstance();
  private static stats = StatisticalAnalyzer.getInstance();

  public static getDatasetSummary() {
    return this.validator.getDatasetSummary();
  }

  public static getPrompts(category?: PromptCategory) {
    return this.validator.getPrompts(category);
  }

  public static getPromptById(id: string) {
    return this.validator.getPromptById(id);
  }

  public static evaluatePrompt(promptId: string, maskedModelId: string, sampleSeed?: number) {
    return this.validator.evaluateSinglePrompt(promptId, maskedModelId, sampleSeed);
  }

  public static testCorrection(promptId: string, maskedModelId?: string) {
    return this.validator.runCorrectionTest(promptId, maskedModelId);
  }

  public static runGeneralizationSuite() {
    return this.validator.runGeneralizationSuite();
  }

  public static verifyProduction() {
    return this.validator.runProductionEnvironmentVerification();
  }

  public static getStatistics() {
    return this.validator.getValidationStatistics();
  }
}

