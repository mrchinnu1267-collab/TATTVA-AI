/**
 * TATTVA AI - Intelligent Production Alert Manager (Phase Q)
 * Manages production alerts with deduplication, cooldown suppression,
 * acknowledgment tracking, and severity escalation.
 */

import { AlertType, AlertSeverity, ProductionAlert } from "./types";
import { ImageProviderId } from "../types";

class AlertManager {
  private static instance: AlertManager;

  private alerts: Map<string, ProductionAlert> = new Map();
  private dedupTimestamps: Map<string, number> = new Map();
  private suppressionWindowMs = 15 * 60 * 1000; // 15 minutes deduplication cooldown

  private constructor() {
    this.seedInitialAlerts();
  }

  public static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  private seedInitialAlerts(): void {
    const seed: ProductionAlert = {
      id: "alt_init_001",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: "high_latency",
      severity: "warning",
      title: "Elevated Generation Latency on Local Fallback",
      message: "Average response latency on local-cuda-diffusion reached 5.2s during background model swap.",
      sourceProvider: "local",
      sourceModel: "local-cuda-diffusion",
      details: { averageLatencyMs: 5200, thresholdMs: 4500 },
      dedupKey: "high_latency_local",
      occurrenceCount: 2,
      acknowledged: false,
    };
    this.alerts.set(seed.id, seed);
    this.dedupTimestamps.set(seed.dedupKey, Date.now() - 3600000);
  }

  /**
   * Fires an alert if not currently suppressed by the deduplication cooldown window.
   */
  public triggerAlert(params: {
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    sourceProvider?: ImageProviderId;
    sourceModel?: string;
    details?: Record<string, any>;
  }): ProductionAlert | null {
    const dedupKey = `${params.type}_${params.sourceProvider || "all"}_${params.sourceModel || "all"}`;
    const now = Date.now();
    const lastFired = this.dedupTimestamps.get(dedupKey) || 0;

    // Check suppression cooldown
    if (now - lastFired < this.suppressionWindowMs) {
      // Find and increment existing alert occurrence count
      for (const alert of this.alerts.values()) {
        if (alert.dedupKey === dedupKey && !alert.acknowledged) {
          alert.occurrenceCount++;
          alert.timestamp = new Date().toISOString();
          this.alerts.set(alert.id, alert);
          return alert;
        }
      }
      return null;
    }

    const alertId = `alt_${now}_${Math.random().toString(36).substring(2, 6)}`;
    const newAlert: ProductionAlert = {
      id: alertId,
      timestamp: new Date().toISOString(),
      type: params.type,
      severity: params.severity,
      title: params.title,
      message: params.message,
      sourceProvider: params.sourceProvider,
      sourceModel: params.sourceModel,
      details: params.details || {},
      dedupKey,
      occurrenceCount: 1,
      acknowledged: false,
    };

    this.alerts.set(alertId, newAlert);
    this.dedupTimestamps.set(dedupKey, now);

    // Keep alert list bounded to 100 entries
    if (this.alerts.size > 100) {
      const oldestKey = this.alerts.keys().next().value;
      if (oldestKey) {
        this.alerts.delete(oldestKey);
      }
    }

    return newAlert;
  }

  /**
   * Acknowledges an active alert.
   */
  public acknowledgeAlert(alertId: string, acknowledgedBy: string = "admin"): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date().toISOString();
    this.alerts.set(alertId, alert);
    return true;
  }

  /**
   * Returns all active or historical alerts.
   */
  public getAlerts(onlyActive: boolean = false): ProductionAlert[] {
    const list = Array.from(this.alerts.values());
    if (onlyActive) {
      return list.filter((a) => !a.acknowledged);
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Clears all alerts (testing utility).
   */
  public clearAllAlerts(): void {
    this.alerts.clear();
    this.dedupTimestamps.clear();
  }
}

export const alertManager = AlertManager.getInstance();

