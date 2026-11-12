/**
 * TATTVA AI - EngineMaintenanceService (Phase W)
 * Unified service facade connecting continuous image engine maintenance and quality monitoring.
 */

import {
  MaintenanceHub,
  ProductionTelemetryFilter,
  UserQualityFeedbackSubmission,
  RegressionCheckResult,
  SafeImprovementProposal,
  MaintenanceErrorCategory,
} from "../engine-maintenance";

export class EngineMaintenanceService {
  private static hub = MaintenanceHub.getInstance();

  public static queryTelemetry(filter: ProductionTelemetryFilter) {
    return this.hub.queryTelemetry(filter);
  }

  public static getModelHealth() {
    return this.hub.getModelHealth();
  }

  public static submitUserFeedback(feedback: Omit<UserQualityFeedbackSubmission, "id" | "timestamp" | "isSubjective">) {
    return this.hub.submitUserFeedback(feedback);
  }

  public static getUserFeedbackAggregates() {
    return this.hub.getUserFeedbackAggregates();
  }

  public static runRegressionCheck(triggeredBy?: RegressionCheckResult["triggeredBy"]) {
    return this.hub.runRegressionCheck(triggeredBy);
  }

  public static submitImprovementProposal(
    category: MaintenanceErrorCategory,
    component: string,
    evidence: string,
    reproduction: string[],
    fixDescription: string
  ) {
    return this.hub.submitImprovementProposal(category, component, evidence, reproduction, fixDescription);
  }

  public static approveImprovementProposal(proposalId: string, approverName: string) {
    return this.hub.approveImprovementProposal(proposalId, approverName);
  }

  public static getAllProposals() {
    return this.hub.getAllProposals();
  }

  public static getReliabilityStatus() {
    return this.hub.getReliabilityStatus();
  }

  public static getMonthlyQualityReport() {
    return this.hub.getMonthlyQualityReport();
  }
}

