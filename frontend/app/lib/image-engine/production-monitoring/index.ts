/**
 * TATTVA AI - Production Monitoring & Observability Module (Phase Q)
 * Re-exports all singletons, services, and types.
 */

export * from "./types";
export { providerMonitor } from "./provider-monitor";
export { accuracyMonitor } from "./accuracy-monitor";
export { failureMonitor } from "./failure-monitor";
export { performanceMonitor } from "./performance-monitor";
export { costMonitor } from "./cost-monitor";
export { alertManager } from "./alert-manager";
export { improvementWorkflow } from "./improvement-workflow";
export { monitoringHub } from "./monitoring-hub";
export type { GenerationTelemetryEvent } from "./monitoring-hub";
export { ProductionMonitoringDashboardService } from "./dashboard-service";
export type { DashboardAuthContext } from "./dashboard-service";

