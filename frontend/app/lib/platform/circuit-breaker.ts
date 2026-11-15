/**
 * TATTVA AI - Circuit Breaker & Fallback Resilience Engine (Phase 21)
 * Manages provider health, trip thresholds, and automated graceful degradation
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface ProviderCircuitStatus {
  provider: string;
  state: CircuitState;
  failureCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  totalRequests: number;
}

export class CircuitBreaker {
  private static instance: CircuitBreaker;
  private circuits: Map<string, ProviderCircuitStatus> = new Map();
  private failureThreshold: number = 3;
  private resetTimeoutMs: number = 30000; // 30s reset window

  public static getInstance(): CircuitBreaker {
    if (!CircuitBreaker.instance) {
      CircuitBreaker.instance = new CircuitBreaker();
    }
    return CircuitBreaker.instance;
  }

  private getOrCreateCircuit(provider: string): ProviderCircuitStatus {
    if (!this.circuits.has(provider)) {
      this.circuits.set(provider, {
        provider,
        state: "CLOSED",
        failureCount: 0,
        totalRequests: 0,
      });
    }
    return this.circuits.get(provider)!;
  }

  /**
   * Checks whether requests can proceed to the requested provider
   */
  public canExecute(provider: string): boolean {
    const circuit = this.getOrCreateCircuit(provider);
    if (circuit.state === "CLOSED") return true;

    if (circuit.state === "OPEN") {
      const elapsed = Date.now() - (circuit.lastFailureTime || 0);
      if (elapsed > this.resetTimeoutMs) {
        // Transition to half-open for canary trial
        circuit.state = "HALF_OPEN";
        return true;
      }
      return false;
    }

    // HALF_OPEN allows single canary probe
    return true;
  }

  /**
   * Records successful execution on a provider
   */
  public recordSuccess(provider: string) {
    const circuit = this.getOrCreateCircuit(provider);
    circuit.failureCount = 0;
    circuit.state = "CLOSED";
    circuit.lastSuccessTime = Date.now();
    circuit.totalRequests++;
  }

  /**
   * Records a failure and trips circuit if threshold reached
   */
  public recordFailure(provider: string): { tripped: boolean; newState: CircuitState } {
    const circuit = this.getOrCreateCircuit(provider);
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();
    circuit.totalRequests++;

    if (circuit.state === "HALF_OPEN" || circuit.failureCount >= this.failureThreshold) {
      circuit.state = "OPEN";
      return { tripped: true, newState: "OPEN" };
    }

    return { tripped: false, newState: circuit.state };
  }

  /**
   * Selects an available healthy provider from a fallback chain
   */
  public selectHealthyProvider(chain: string[]): string {
    for (const provider of chain) {
      if (this.canExecute(provider)) {
        return provider;
      }
    }
    // Default fallback to local / offline heuristic if all remote APIs tripped
    return "local-fallback";
  }

  public getStatus(provider: string): ProviderCircuitStatus {
    return this.getOrCreateCircuit(provider);
  }
}

export const circuitBreaker = CircuitBreaker.getInstance();
