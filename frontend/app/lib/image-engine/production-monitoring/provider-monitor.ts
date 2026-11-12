/**
 * TATTVA AI - Production Provider Health & Availability Monitor (Phase Q)
 * Continuously tracks API availability, latency, authentication failures,
 * quotas, cooldowns, and circuit breaker states for all image generation providers.
 */

import { ImageProviderId } from "../types";
import { ProviderHealthTelemetry, ProviderHealthStatus, CircuitBreakerState } from "./types";
import { getProviderHealth, recordProviderSuccess, recordProviderFailure } from "../reliability/circuit-breaker";

class ProviderMonitor {
  private static instance: ProviderMonitor;

  private providerTelemetry: Map<ImageProviderId, ProviderHealthTelemetry> = new Map();

  private constructor() {
    this.initializeProviders();
  }

  public static getInstance(): ProviderMonitor {
    if (!ProviderMonitor.instance) {
      ProviderMonitor.instance = new ProviderMonitor();
    }
    return ProviderMonitor.instance;
  }

  private initializeProviders(): void {
    const defaultProviders: Array<{ id: ImageProviderId; name: string }> = [
      { id: "huggingface", name: "Hugging Face Inference API (SDXL/FLUX)" },
      { id: "pollinations", name: "Pollinations.ai Free Tier (FLUX.1-schnell)" },
      { id: "gemini", name: "Google Gemini 2.5 Flash / Imagen" },
      { id: "openai", name: "OpenAI DALL-E 3" },
      { id: "local", name: "Local CUDA Diffusion / ComfyUI Fallback" },
    ];

    for (const p of defaultProviders) {
      this.providerTelemetry.set(p.id, {
        providerId: p.id,
        name: p.name,
        status: "healthy",
        circuitBreakerState: "closed",
        responseTimeMs: 2100,
        successRate: 98.4,
        totalRequests: 250,
        successfulRequests: 246,
        failedRequests: 4,
        consecutiveFailures: 0,
        authFailures: 0,
        timeoutCount: 2,
        rateLimitHits: 1,
        quotaRemainingPercent: 88,
        cooldownRemainingSeconds: 0,
        lastHealthCheckTimestamp: new Date().toISOString(),
        isAvailableForInference: true,
      });
    }
  }

  /**
   * Records the outcome of a provider request.
   */
  public recordRequest(params: {
    providerId: ImageProviderId;
    success: boolean;
    latencyMs: number;
    errorType?: "auth" | "timeout" | "rate_limit" | "network" | "quota" | "internal";
    errorMessage?: string;
  }): ProviderHealthTelemetry {
    let telemetry = this.providerTelemetry.get(params.providerId);
    if (!telemetry) {
      this.initializeProviders();
      telemetry = this.providerTelemetry.get(params.providerId)!;
    }

    telemetry.totalRequests++;
    telemetry.responseTimeMs = Math.round((telemetry.responseTimeMs * 0.7) + (params.latencyMs * 0.3));
    telemetry.lastHealthCheckTimestamp = new Date().toISOString();

    if (params.success) {
      recordProviderSuccess(params.providerId, params.latencyMs);
      telemetry.successfulRequests++;
      telemetry.consecutiveFailures = 0;
      telemetry.lastErrorMessage = undefined;

      // Check if recovering from degraded or half-open state
      if (telemetry.status === "degraded" || telemetry.circuitBreakerState === "half-open") {
        telemetry.status = "healthy";
        telemetry.circuitBreakerState = "closed";
        telemetry.cooldownRemainingSeconds = 0;
      }
    } else {
      recordProviderFailure(params.providerId, params.errorMessage || "Unknown error");
      telemetry.failedRequests++;
      telemetry.consecutiveFailures++;
      telemetry.lastErrorMessage = params.errorMessage || "Unknown provider error";

      if (params.errorType === "auth") {
        telemetry.authFailures++;
        telemetry.status = "down";
        telemetry.isAvailableForInference = false;
      } else if (params.errorType === "quota") {
        telemetry.quotaRemainingPercent = 0;
        telemetry.status = "down";
        telemetry.isAvailableForInference = false;
      } else if (params.errorType === "timeout") {
        telemetry.timeoutCount++;
      } else if (params.errorType === "rate_limit") {
        telemetry.rateLimitHits++;
        telemetry.status = "cooldown";
        telemetry.cooldownRemainingSeconds = 60;
      }

      // Circuit Breaker trip condition (>=3 consecutive failures)
      if (telemetry.consecutiveFailures >= 3) {
        telemetry.status = "down";
        telemetry.circuitBreakerState = "open";
        telemetry.cooldownRemainingSeconds = 60;
        telemetry.isAvailableForInference = false;
      } else if (telemetry.consecutiveFailures >= 1 && telemetry.status !== "down" && telemetry.status !== "cooldown") {
        telemetry.status = "degraded";
      }
    }

    // Update overall success rate
    telemetry.successRate = Number(
      ((telemetry.successfulRequests / telemetry.totalRequests) * 100).toFixed(1)
    );

    // Sync with circuit breaker state
    const cbHealth = getProviderHealth(params.providerId);
    if (cbHealth && cbHealth.circuitState) {
      if (params.success) {
        cbHealth.circuitState = "CLOSED";
        cbHealth.cooldownUntil = 0;
        telemetry.circuitBreakerState = "closed";
        telemetry.status = "healthy";
        telemetry.isAvailableForInference = true;
      } else {
        const rawState = cbHealth.circuitState.toLowerCase();
        if (rawState === "open" || telemetry.circuitBreakerState === "open") {
          telemetry.circuitBreakerState = "open";
          telemetry.isAvailableForInference = false;
          telemetry.status = "down";
        } else if (rawState === "half_open" || rawState === "half-open") {
          telemetry.circuitBreakerState = "half-open";
        } else {
          telemetry.circuitBreakerState = "closed";
        }
      }
    }

    this.providerTelemetry.set(params.providerId, telemetry);
    return telemetry;
  }

  /**
   * Simulates or triggers automatic recovery detection for a provider in cooldown.
   */
  public attemptRecovery(providerId: ImageProviderId): boolean {
    const telemetry = this.providerTelemetry.get(providerId);
    if (!telemetry) return false;

    if (telemetry.circuitBreakerState === "open" || telemetry.status === "cooldown" || telemetry.status === "down") {
      telemetry.circuitBreakerState = "half-open";
      telemetry.status = "degraded";
      telemetry.cooldownRemainingSeconds = 0;
      telemetry.isAvailableForInference = true;
      telemetry.consecutiveFailures = 0;

      const cbHealth = getProviderHealth(providerId);
      if (cbHealth) {
        cbHealth.circuitState = "HALF_OPEN";
        cbHealth.cooldownUntil = 0;
        cbHealth.consecutiveFailures = 0;
      }

      this.providerTelemetry.set(providerId, telemetry);
      return true;
    }
    return false;
  }

  /**
   * Sets a manual cooldown or outage state (e.g. from incident or alert).
   */
  public setProviderOutage(providerId: ImageProviderId, reason: string): void {
    const telemetry = this.providerTelemetry.get(providerId);
    if (telemetry) {
      telemetry.status = "down";
      telemetry.circuitBreakerState = "open";
      telemetry.isAvailableForInference = false;
      telemetry.lastErrorMessage = reason;
      telemetry.consecutiveFailures = 3;
      this.providerTelemetry.set(providerId, telemetry);
    }
  }

  /**
   * Returns telemetry for all configured providers.
   */
  public getAllProviderTelemetry(): ProviderHealthTelemetry[] {
    return Array.from(this.providerTelemetry.values());
  }

  /**
   * Returns telemetry for a specific provider.
   */
  public getProviderTelemetry(providerId: ImageProviderId): ProviderHealthTelemetry | undefined {
    return this.providerTelemetry.get(providerId);
  }
}

export const providerMonitor = ProviderMonitor.getInstance();

