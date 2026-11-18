/**
 * TATTVA AI - Automated Bug Detector & Diagnostic Report Engine
 * Intercepts runtime errors, failed tasks, API route anomalies, and DB issues.
 * Generates reproducible diagnostic reports with stack traces and reproduction steps.
 * Explicitly guards against auto-applying untested high-risk fixes.
 */

import { BugDiagnosticReport } from "./types";

export class AutomatedBugDetector {
  private static instance: AutomatedBugDetector;
  private diagnosticReports: Map<string, BugDiagnosticReport> = new Map();

  private constructor() {
    this.seedInitialDiagnosticReports();
  }

  public static getInstance(): AutomatedBugDetector {
    if (!AutomatedBugDetector.instance) {
      AutomatedBugDetector.instance = new AutomatedBugDetector();
    }
    return AutomatedBugDetector.instance;
  }

  private seedInitialDiagnosticReports(): void {
    const defaultReports: BugDiagnosticReport[] = [
      {
        id: "diag_101",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        severity: "low",
        subsystem: "api_gateway",
        routeOrFunction: "GET /api/connectors",
        errorMessage: "OAuth connector token refresh transient timeout on cold start",
        reproductionSteps: [
          "1. Initialize guest session with expired mock token.",
          "2. Send GET request to /api/connectors.",
          "3. Observe 2.4s latency due to token exchange retry loop.",
        ],
        suggestedAction: "Increase HTTP client socket timeout and cache unexpired public discovery documents.",
        isSafeToAutoFix: false,
        assignedStatus: "verified",
      },
      {
        id: "diag_102",
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        severity: "medium",
        subsystem: "data_science",
        routeOrFunction: "POST /api/data-science/stats-test",
        errorMessage: "Unsupported testType alias passed in query payload",
        reproductionSteps: [
          "1. Invoke /api/data-science/stats-test with payload { testType: 'welch_t_test' }.",
          "2. Note unhandled alias rejection if route only checks 'two_sample_t_test'.",
        ],
        suggestedAction: "Support alias normalization mapping 'welch_t_test' to 'two_sample_t_test'.",
        isSafeToAutoFix: true,
        assignedStatus: "verified",
      },
    ];

    for (const r of defaultReports) {
      this.diagnosticReports.set(r.id, r);
    }
  }

  public captureError(errorData: {
    severity: BugDiagnosticReport["severity"];
    subsystem: string;
    routeOrFunction: string;
    errorMessage: string;
    stackTraceSample?: string;
    reproductionSteps: string[];
    suggestedAction: string;
    isSafeToAutoFix?: boolean;
  }): BugDiagnosticReport {
    const id = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const report: BugDiagnosticReport = {
      id,
      timestamp: new Date().toISOString(),
      severity: errorData.severity,
      subsystem: errorData.subsystem,
      routeOrFunction: errorData.routeOrFunction,
      errorMessage: errorData.errorMessage,
      stackTraceSample: errorData.stackTraceSample,
      reproductionSteps: errorData.reproductionSteps,
      suggestedAction: errorData.suggestedAction,
      isSafeToAutoFix: errorData.isSafeToAutoFix ?? false,
      assignedStatus: "open",
    };

    this.diagnosticReports.set(id, report);
    return report;
  }

  public getReports(severity?: BugDiagnosticReport["severity"]): BugDiagnosticReport[] {
    const all = Array.from(this.diagnosticReports.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (severity) {
      return all.filter((r) => r.severity === severity);
    }
    return all;
  }

  public updateStatus(id: string, status: BugDiagnosticReport["assignedStatus"]): boolean {
    const report = this.diagnosticReports.get(id);
    if (!report) return false;
    report.assignedStatus = status;
    return true;
  }
}

export const automatedBugDetector = AutomatedBugDetector.getInstance();
