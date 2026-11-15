/**
 * TATTVA AI - Telemetry Monitor & Cross-Platform Adapter (Phase 21)
 * Real-time latency percentiles, error alerts, and cross-platform payload normalization
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
  average: number;
  sampleCount: number;
}

export type PlatformTarget = "web" | "android" | "desktop";

export class TelemetryMonitor {
  private static instance: TelemetryMonitor;
  private latencies: number[] = [];
  private totalRequests: number = 0;
  private totalErrors: number = 0;
  private errorSpikeThreshold = 0.05; // 5% error rate triggers alert

  public static getInstance(): TelemetryMonitor {
    if (!TelemetryMonitor.instance) {
      TelemetryMonitor.instance = new TelemetryMonitor();
    }
    return TelemetryMonitor.instance;
  }

  public recordRequest(latencyMs: number, isError: boolean = false) {
    this.totalRequests++;
    if (isError) {
      this.totalErrors++;
    } else {
      this.latencies.push(latencyMs);
      if (this.latencies.length > 2000) this.latencies.shift();
    }
  }

  public getLatencyPercentiles(): LatencyPercentiles {
    if (this.latencies.length === 0) {
      return { p50: 0, p95: 0, p99: 0, average: 0, sampleCount: 0 };
    }

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const n = sorted.length;
    const p50 = sorted[Math.floor(n * 0.5)];
    const p95 = sorted[Math.floor(n * 0.95)] || sorted[n - 1];
    const p99 = sorted[Math.floor(n * 0.99)] || sorted[n - 1];
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      p50,
      p95,
      p99,
      average: Math.round(sum / n),
      sampleCount: n,
    };
  }

  public checkHealthAndAlerts(): {
    healthy: boolean;
    errorRate: number;
    hasAlert: boolean;
    alertMessage?: string;
  } {
    if (this.totalRequests === 0) {
      return { healthy: true, errorRate: 0, hasAlert: false };
    }

    const errorRate = this.totalErrors / this.totalRequests;
    const hasAlert = errorRate > this.errorSpikeThreshold;

    return {
      healthy: !hasAlert,
      errorRate: Number(errorRate.toFixed(4)),
      hasAlert,
      alertMessage: hasAlert
        ? `ALERT: Error rate spiked to ${(errorRate * 100).toFixed(1)}% exceeding ${this.errorSpikeThreshold * 100}% threshold!`
        : undefined,
    };
  }

  /**
   * Adapts responses for specific cross-platform targets (Web, Android, Desktop)
   */
  public adaptResponseForPlatform(text: string, target: PlatformTarget): {
    content: string;
    targetPlatform: PlatformTarget;
    supportsHaptics: boolean;
    enableHardwareAcceleration: boolean;
  } {
    if (target === "android") {
      return {
        content: text,
        targetPlatform: "android",
        supportsHaptics: true,
        enableHardwareAcceleration: true,
      };
    }

    if (target === "desktop") {
      return {
        content: text,
        targetPlatform: "desktop",
        supportsHaptics: false,
        enableHardwareAcceleration: true,
      };
    }

    // Default Web
    return {
      content: text,
      targetPlatform: "web",
      supportsHaptics: false,
      enableHardwareAcceleration: false,
    };
  }
}

export const telemetryMonitor = TelemetryMonitor.getInstance();
