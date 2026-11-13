/**
 * TATTVA AI - Circuit Breaker & Provider Resiliency Engine (Phase K)
 * Protects against cascading failures, API quota exhaustion, and unresponsive endpoints
 * using stateful circuit breakers, exponential backoff with jitter, and request timeouts.
 */

import { ImageProviderId } from "../types";
import { CircuitBreakerState, ProviderHealthRecord } from "./types";

const FAILURE_THRESHOLD = 3;
const DEFAULT_COOLDOWN_MS = 60_000; // 1 minute
const QUOTA_COOLDOWN_MS = 600_000; // 10 minutes
const AUTH_COOLDOWN_MS = 1_800_000; // 30 minutes
const TRIAL_PROBE_SUCCESS_THRESHOLD = 1;

const providerRecords = new Map<ImageProviderId, ProviderHealthRecord>();

const ALL_PROVIDERS: ImageProviderId[] = [
  "gemini",
  "huggingface",
  "openai",
  "azure-openai",
  "local",
  "pollinations",
];

function initProvider(providerId: ImageProviderId): ProviderHealthRecord {
  return {
    providerId,
    circuitState: "CLOSED",
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    cooldownUntil: 0,
    isQuotaExhausted: false,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    recentLatenciesMs: [],
  };
}

// Initialize all providers
for (const p of ALL_PROVIDERS) {
  providerRecords.set(p, initProvider(p));
}

/**
 * Retrieves the live health and circuit breaker record for a given provider.
 */
export function getProviderHealth(providerId: ImageProviderId): ProviderHealthRecord {
  let rec = providerRecords.get(providerId);
  if (!rec) {
    rec = initProvider(providerId);
    providerRecords.set(providerId, rec);
  }

  // Check state transition from OPEN -> HALF_OPEN on cooldown expiry
  if (rec.circuitState === "OPEN" && Date.now() >= rec.cooldownUntil) {
    rec.circuitState = "HALF_OPEN";
  }

  return rec;
}

/**
 * Checks whether requests can be dispatched to the provider right now.
 */
export function canExecuteProvider(providerId: ImageProviderId): boolean {
  const health = getProviderHealth(providerId);

  if (health.circuitState === "CLOSED") {
    return true;
  }
  if (health.circuitState === "HALF_OPEN") {
    // Allows limited single trial probe
    return true;
  }
  // OPEN state: rejected while in cooldown
  return false;
}

/**
 * Records a successful execution on a provider, updating metrics and circuit state.
 */
export function recordProviderSuccess(providerId: ImageProviderId, latencyMs: number): void {
  const health = getProviderHealth(providerId);

  health.totalRequests++;
  health.successfulRequests++;
  health.consecutiveSuccesses++;
  health.consecutiveFailures = 0;
  health.lastSuccessTime = Date.now();
  health.isQuotaExhausted = false;

  // Add latency
  health.recentLatenciesMs.push(latencyMs);
  if (health.recentLatenciesMs.length > 50) {
    health.recentLatenciesMs.shift();
  }

  // If in HALF_OPEN, trial succeeded -> reset circuit to CLOSED
  if (health.circuitState === "HALF_OPEN" && health.consecutiveSuccesses >= TRIAL_PROBE_SUCCESS_THRESHOLD) {
    health.circuitState = "CLOSED";
    health.cooldownUntil = 0;
  }
}

/**
 * Records a failed execution on a provider, tripping circuit if threshold is reached.
 */
export function recordProviderFailure(providerId: ImageProviderId, error: unknown): void {
  const health = getProviderHealth(providerId);
  const errMessage = error instanceof Error ? error.message : String(error);
  const lower = errMessage.toLowerCase();

  health.totalRequests++;
  health.failedRequests++;
  health.consecutiveFailures++;
  health.consecutiveSuccesses = 0;
  health.lastFailureTime = Date.now();
  health.lastFailureReason = errMessage.slice(0, 200);

  const isQuota = /quota|insufficient|zerogpu|exceeded|credit/i.test(lower);
  const isAuth = /unauthorized|401|403|invalid key|forbidden/i.test(lower);

  if (isQuota) {
    health.isQuotaExhausted = true;
    health.circuitState = "OPEN";
    health.cooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
    return;
  }

  if (isAuth) {
    health.circuitState = "OPEN";
    health.cooldownUntil = Date.now() + AUTH_COOLDOWN_MS;
    return;
  }

  // If already in HALF_OPEN, any failure trips back to OPEN immediately
  if (health.circuitState === "HALF_OPEN") {
    health.circuitState = "OPEN";
    health.cooldownUntil = Date.now() + DEFAULT_COOLDOWN_MS;
    return;
  }

  // If consecutive failures exceed threshold, trip to OPEN
  if (health.consecutiveFailures >= FAILURE_THRESHOLD) {
    health.circuitState = "OPEN";
    health.cooldownUntil = Date.now() + DEFAULT_COOLDOWN_MS;
  }
}

/**
 * Calculates exponential backoff delay with randomized jitter.
 */
export function calculateBackoffWithJitter(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 15000
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
  const jitter = Math.random() * 0.3 * exponential; // +/- 30% jitter
  return Math.round(exponential + (Math.random() > 0.5 ? jitter : -jitter));
}

/**
 * Wraps an asynchronous operation with an AbortController timeout.
 */
export async function withTimeout<T>(
  promiseFactory: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  timeoutErrorMessage: string = "Provider request timed out"
): Promise<T> {
  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`${timeoutErrorMessage} after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      promiseFactory(controller.signal),
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Returns health records for all providers.
 */
export function getAllProviderHealth(): Record<ImageProviderId, ProviderHealthRecord> {
  const result: Record<string, ProviderHealthRecord> = {};
  for (const p of ALL_PROVIDERS) {
    result[p] = getProviderHealth(p);
  }
  return result as Record<ImageProviderId, ProviderHealthRecord>;
}

/**
 * Resets all circuit breakers for test isolation.
 */
export function resetAllCircuitBreakers(): void {
  for (const p of ALL_PROVIDERS) {
    providerRecords.set(p, initProvider(p));
  }
}
