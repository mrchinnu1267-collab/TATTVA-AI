/**
 * TATTVA AI - Platform Evolution & Autonomous Maintenance Engine
 * Unified export point for Phase 43.
 */

export * from "./types";
export { PlatformPerformanceMonitor, platformPerformanceMonitor } from "./performance-monitor";
export { AIQualityEvaluator, aiQualityEvaluator } from "./ai-quality-evaluator";
export { ModelProviderManager, modelProviderManager } from "./model-provider-manager";
export { AutomatedBugDetector, automatedBugDetector } from "./automated-bug-detector";
export { BackupRecoveryVerifier, backupRecoveryVerifier } from "./backup-recovery-verifier";
export { MonthlyReportGenerator } from "./monthly-report-generator";

import { platformPerformanceMonitor } from "./performance-monitor";
import { aiQualityEvaluator } from "./ai-quality-evaluator";
import { modelProviderManager } from "./model-provider-manager";
import { automatedBugDetector } from "./automated-bug-detector";
import { backupRecoveryVerifier } from "./backup-recovery-verifier";
import { MonthlyReportGenerator } from "./monthly-report-generator";

export class PlatformEvolutionEngine {
  public static getPerformanceSnapshot() {
    return platformPerformanceMonitor.getSnapshot();
  }

  public static runQualityEvaluation(targetModel = "gemini-2.5-flash", responses?: Record<string, string>) {
    return aiQualityEvaluator.evaluateResponses(targetModel, responses);
  }

  public static getBenchmarkQuestions(category?: any) {
    return aiQualityEvaluator.getBenchmarkQuestions(category);
  }

  public static getProviders() {
    return modelProviderManager.getRegisteredModels();
  }

  public static testModelCanary(candidateModel: any, baselineModelId?: string) {
    return modelProviderManager.runCanaryTest(candidateModel, baselineModelId);
  }

  public static captureBugReport(errorData: any) {
    return automatedBugDetector.captureError(errorData);
  }

  public static getBugReports(severity?: any) {
    return automatedBugDetector.getReports(severity);
  }

  public static verifyBackupIntegrity() {
    return backupRecoveryVerifier.verifyBackupIntegrity();
  }

  public static getLatestBackupStatus() {
    return backupRecoveryVerifier.getLatestVerification();
  }

  public static generateMonthlyReport(period?: string) {
    return MonthlyReportGenerator.generateReport(period);
  }

  public static getMonthlyReportMarkdown(period?: string) {
    const rep = MonthlyReportGenerator.generateReport(period);
    return MonthlyReportGenerator.toMarkdown(rep);
  }
}
