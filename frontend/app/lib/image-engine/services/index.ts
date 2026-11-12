/**
 * TATTVA AI - Unified Image Studio Services Index (Phase L)
 * Exports all 12 unified services covering the complete generation, editing,
 * enhancement, evaluation, benchmark, and storage lifecycle.
 */

export * from "./prompt-understanding.service";
export * from "./requirement-extraction.service";
export * from "./reference-analysis.service";
export * from "./model-routing.service";
export * from "./image-generation.service";
export * from "./image-editing.service";
export * from "./image-enhancement.service";
export * from "./image-evaluation.service";
export * from "./correction.service";
export * from "./benchmark.service";
export * from "./storage.service";
export * from "./job-management.service";
export * from "./production-monitoring.service";

import { PromptUnderstandingService } from "./prompt-understanding.service";
import { RequirementExtractionService } from "./requirement-extraction.service";
import { ReferenceAnalysisService } from "./reference-analysis.service";
import { ModelRoutingService } from "./model-routing.service";
import { ImageGenerationService } from "./image-generation.service";
import { ImageEditingService } from "./image-editing.service";
import { ImageEnhancementService } from "./image-enhancement.service";
import { ImageEvaluationService } from "./image-evaluation.service";
import { CorrectionService } from "./correction.service";
import { BenchmarkService } from "./benchmark.service";
import { StorageService } from "./storage.service";
import { JobManagementService } from "./job-management.service";
import { ProductionMonitoringService } from "./production-monitoring.service";

/**
 * Unified Facade for the complete TATTVA AI Image Studio
 */
export const UnifiedImageStudioEngine = {
  PromptUnderstanding: PromptUnderstandingService,
  RequirementExtraction: RequirementExtractionService,
  ReferenceAnalysis: ReferenceAnalysisService,
  ModelRouting: ModelRoutingService,
  ImageGeneration: ImageGenerationService,
  ImageEditing: ImageEditingService,
  ImageEnhancement: ImageEnhancementService,
  ImageEvaluation: ImageEvaluationService,
  Correction: CorrectionService,
  Benchmark: BenchmarkService,
  Storage: StorageService,
  JobManagement: JobManagementService,
  ProductionMonitoring: ProductionMonitoringService,
};

