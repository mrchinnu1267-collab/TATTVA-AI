/**
 * TATTVA AI - Phase T: Final Accuracy Optimization Service
 * Provides unified high-level facade for Root Cause Diagnostics, Verified Prompt Optimization,
 * Model Accuracy Profiling, Fine-Grained Reference Vault, Surgical Inpainting, and Benchmark Matrix.
 */

import {
  ErrorEliminationEngine,
  VerifiedPromptOptimizer,
  ModelAccuracyProfiler,
  FineGrainedReferenceVault,
  TargetedErrorCorrector,
  CostPerformanceBalancer,
  FinalBenchmarkRunner,
  PipelineOptimizer,
  RootCauseDiagnostic,
  PromptVerificationCheckResult,
  ModelAccuracyProfile,
  ReferenceElementInstruction,
  FineGrainedReferenceAudit,
  SurgicalCorrectionReport,
  FinalAccuracyBenchmarkSummary,
  OptimizedGenerationRequest,
  OptimizedGenerationResponse,
} from "../final-accuracy-optimization";
import { ImageProviderId } from "../types";

export class FinalAccuracyOptimizationService {
  private static instance: FinalAccuracyOptimizationService;

  private constructor() {}

  public static getInstance(): FinalAccuracyOptimizationService {
    if (!FinalAccuracyOptimizationService.instance) {
      FinalAccuracyOptimizationService.instance = new FinalAccuracyOptimizationService();
    }
    return FinalAccuracyOptimizationService.instance;
  }

  /**
   * Retrieves all 10 root-cause diagnostics with before/after accuracy deltas
   */
  public getErrorDiagnostics(): RootCauseDiagnostic[] {
    return ErrorEliminationEngine.getInstance().getAllDiagnostics();
  }

  /**
   * Compiles and audits prompt payload before provider dispatch
   */
  public verifyAndCompilePrompt(
    prompt: string,
    provider: ImageProviderId,
    negativePrompt?: string
  ): {
    compiledPositivePrompt: string;
    compiledNegativePrompt: string;
    verification: PromptVerificationCheckResult;
  } {
    return VerifiedPromptOptimizer.getInstance().compileAndVerifyPrompt(prompt, provider, negativePrompt);
  }

  /**
   * Retrieves all verified model accuracy profiles
   */
  public getModelProfiles(): ModelAccuracyProfile[] {
    return ModelAccuracyProfiler.getInstance().getAllProfiles();
  }

  /**
   * Audits reference preservation instructions
   */
  public auditReferencePreservation(
    referenceId: string,
    instructions: ReferenceElementInstruction[]
  ): FineGrainedReferenceAudit {
    return FineGrainedReferenceVault.getInstance().auditReferencePreservation(referenceId, instructions);
  }

  /**
   * Executes the Phase T optimized generation lifecycle
   */
  public async executeOptimizedGeneration(
    request: OptimizedGenerationRequest
  ): Promise<OptimizedGenerationResponse> {
    return PipelineOptimizer.getInstance().executeOptimizedGeneration(request);
  }

  /**
   * Runs the final comparative benchmark across Architectures A through F
   */
  public runFinalBenchmark(): FinalAccuracyBenchmarkSummary {
    return FinalBenchmarkRunner.getInstance().runFinalBenchmark();
  }
}

