/**
 * TATTVA AI - Unified Production Monitoring Service (Phase Q)
 * Encapsulates telemetry ingestion, health inspection, alerting,
 * and dashboard retrieval for the entire Image Studio engine.
 */

import {
  providerMonitor,
  accuracyMonitor,
  failureMonitor,
  performanceMonitor,
  costMonitor,
  alertManager,
  improvementWorkflow,
  monitoringHub,
  ProductionMonitoringDashboardService,
  type ProductionMonitoringDashboardData,
  type GenerationTelemetryEvent,
  type ProductionAlert,
  type ImprovementRecommendation,
  type DashboardAuthContext,
} from "../production-monitoring";
import { ImageProviderId } from "../types";

export class ProductionMonitoringService {
  /**
   * Retrieves aggregated production monitoring dashboard data with authorization check.
   */
  public static getDashboardData(auth?: DashboardAuthContext): ProductionMonitoringDashboardData {
    return ProductionMonitoringDashboardService.getDashboardData(auth);
  }

  /**
   * Ingests a generation event asynchronously without blocking user generation.
   */
  public static ingestGenerationTelemetry(event: GenerationTelemetryEvent): void {
    monitoringHub.ingestEventAsync(event);
  }

  /**
   * Ingests a generation event synchronously (deterministic audit/test execution).
   */
  public static ingestGenerationTelemetrySync(event: GenerationTelemetryEvent): void {
    monitoringHub.ingestEvent(event);
  }

  /**
   * Returns list of all active or historical alerts.
   */
  public static getAlerts(onlyActive: boolean = false): ProductionAlert[] {
    return alertManager.getAlerts(onlyActive);
  }

  /**
   * Acknowledges an active alert.
   */
  public static acknowledgeAlert(alertId: string, acknowledgedBy: string = "admin"): boolean {
    return alertManager.acknowledgeAlert(alertId, acknowledgedBy);
  }

  /**
   * Retrieves all continuous improvement recommendations.
   */
  public static getImprovementRecommendations(): ImprovementRecommendation[] {
    return improvementWorkflow.getAllRecommendations();
  }

  /**
   * Approves or rejects an improvement recommendation.
   */
  public static reviewImprovement(
    recommendationId: string,
    action: "approve" | "reject",
    reviewerName: string = "admin"
  ): ImprovementRecommendation | null {
    return improvementWorkflow.reviewRecommendation(recommendationId, action, reviewerName);
  }

  /**
   * Inspects a specific provider's live health.
   */
  public static getProviderHealth(providerId: ImageProviderId) {
    return providerMonitor.getProviderTelemetry(providerId);
  }
}

