/**
 * TATTVA AI - Production Reliability Engineering Types (Phase 48)
 * Defines synthetic probe schemas, incident mitigation lifecycles, and SLA/SLO telemetry.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type ServiceHealthStatus = "operational" | "degraded" | "outage" | "maintenance";

export interface SyntheticProbeResult {
  id: string;
  endpoint: string;
  name: string;
  latencyMs: number;
  statusCode: number;
  status: "healthy" | "degraded" | "failed";
  timestamp: number;
}

export interface LatencyHeatmapBin {
  timeWindow: string; // e.g. "00:00 - 04:00"
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  requestCount: number;
}

export interface ReliabilityMetrics {
  uptimePercent: number;          // Target 99.95%
  mtbfHours: number;              // Mean Time Between Failures
  mttrMinutes: number;            // Mean Time to Recovery
  latencyP50Ms: number;
  latencyP90Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  activeIncidentsCount: number;
  resolvedIncidentsCount: number;
  circuitBreakerStatus: {
    gemini: "CLOSED" | "HALF_OPEN" | "OPEN";
    deepseek: "CLOSED" | "HALF_OPEN" | "OPEN";
    anthropic: "CLOSED" | "HALF_OPEN" | "OPEN";
    database: "CLOSED" | "HALF_OPEN" | "OPEN";
  };
  lastEvaluatedTimestamp: number;
}

export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";

export interface IncidentRecord {
  id: string;
  severity: IncidentSeverity;
  title: string;
  service: string;
  status: IncidentStatus;
  createdAt: number;
  resolvedAt?: number;
  mitigationActionTaken?: string;
  timeline: Array<{
    timestamp: number;
    message: string;
    actor: string;
  }>;
}

export interface TelemetryErrorEvent {
  id: string;
  level: "info" | "warning" | "error" | "fatal";
  message: string;
  service: string;
  stackTrace?: string;
  breadcrumbs: string[];
  timestamp: number;
}
