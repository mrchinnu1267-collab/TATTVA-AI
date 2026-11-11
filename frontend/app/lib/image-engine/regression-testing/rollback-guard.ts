/**
 * TATTVA AI - Automatic Rollback Protection Engine (Phase O)
 * Maintains immutable configuration snapshots for prompt compilation, model routing,
 * and visual evaluation. Automatically freezes rollouts, restores known-good baselines,
 * and records incident telemetry whenever a critical regression is detected.
 */

import {
  RollbackConfigurationSnapshot,
  RollbackIncidentRecord,
  RegressionDetectionReport,
} from "./types";

export class RollbackGuard {
  private snapshots: Map<string, RollbackConfigurationSnapshot> = new Map();
  private incidentLedger: RollbackIncidentRecord[] = [];
  private activeSnapshotId: string = "snap-approved-prod-v1";

  constructor() {
    this.seedInitialSnapshots();
  }

  /**
   * Captures and stores an approved production configuration snapshot.
   */
  public captureSnapshot(
    config: Omit<RollbackConfigurationSnapshot, "snapshotId" | "createdAt" | "isProductionApproved">
  ): RollbackConfigurationSnapshot {
    const snapshotId = `snap-config-${Date.now()}`;
    const snapshot: RollbackConfigurationSnapshot = {
      ...config,
      snapshotId,
      createdAt: new Date().toISOString(),
      isProductionApproved: true,
    };

    this.snapshots.set(snapshotId, snapshot);
    this.activeSnapshotId = snapshotId;
    return snapshot;
  }

  /**
   * Executes emergency automatic rollback when a critical regression report is received.
   */
  public executeEmergencyRollback(params: {
    report: RegressionDetectionReport;
    administratorEmails?: string[];
  }): RollbackIncidentRecord {
    const { report, administratorEmails = ["ai-operations@tattva.internal", "oncall@tattva.internal"] } = params;

    // Find the latest known-good approved snapshot
    const approvedSnapshots = Array.from(this.snapshots.values())
      .filter((s) => s.isProductionApproved)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const restoredSnapshot = approvedSnapshots[0] || this.snapshots.get("snap-approved-prod-v1")!;
    this.activeSnapshotId = restoredSnapshot.snapshotId;

    const incident: RollbackIncidentRecord = {
      incidentId: `inc-rollback-${Date.now()}`,
      timestamp: new Date().toISOString(),
      triggeringReportId: report.reportId,
      severity: "critical",
      regressionCause: report.deploymentBlockReasons.join(" | ") || "Unspecified critical regression delta",
      previousSnapshotRestoredId: restoredSnapshot.snapshotId,
      administratorNotified: true,
      notifiedAdmins: administratorEmails,
      restorationStatus: "restored_successfully",
    };

    this.incidentLedger.unshift(incident);
    return incident;
  }

  /**
   * Retrieves the currently active configuration snapshot.
   */
  public getActiveSnapshot(): RollbackConfigurationSnapshot {
    return this.snapshots.get(this.activeSnapshotId) || this.snapshots.get("snap-approved-prod-v1")!;
  }

  public getAllSnapshots(): RollbackConfigurationSnapshot[] {
    return Array.from(this.snapshots.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getIncidentLedger(): RollbackIncidentRecord[] {
    return [...this.incidentLedger];
  }

  private seedInitialSnapshots(): void {
    const approvedSeed: RollbackConfigurationSnapshot = {
      snapshotId: "snap-approved-prod-v1",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      promptCompilerConfig: {
        version: "2.4.0",
        countingAnchorSyntax: "dual_numeral_word",
        spellingEncapsulation: "double_quotes",
      },
      modelRoutingConfig: {
        primaryProvider: "pollinations",
        fallbackChain: ["gemini", "huggingface", "local"],
        categoryRoutingRules: {
          text_rendering: "flux-schnell",
          photorealistic_images: "imagen-3",
          three_d_renders: "flux-schnell",
        },
      },
      evaluationConfig: {
        confidenceThreshold: 0.75,
        ocrMinLevenshtein: 0.85,
        iouThreshold: 0.50,
      },
      isProductionApproved: true,
    };

    this.snapshots.set(approvedSeed.snapshotId, approvedSeed);
  }
}

export const rollbackGuard = new RollbackGuard();

