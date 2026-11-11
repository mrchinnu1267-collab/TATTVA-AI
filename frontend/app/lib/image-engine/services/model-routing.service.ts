/**
 * TATTVA AI - Unified Model Routing Service (Phase L)
 * Handles capability-based model selection, health checks, quota-aware routing,
 * reference-compatible routing, and automated provider fallback.
 */

import { routeImageRequest } from "../multi-model-router/intelligent-router";
import { getProviderStatuses, resolveProviderOrder } from "../providers";
import { canExecuteProvider } from "../reliability/circuit-breaker";
import { RoutingAnalysisParams, RouterSelectionDecision } from "../multi-model-router/types";
import { ImageProviderId, ProviderRuntimeStatus } from "../types";

export class ModelRoutingService {
  /**
   * Intelligently selects the optimal model, provider fallback chain,
   * and conditioning strategy based on prompt complexity, reference image, and quotas.
   */
  public static route(params: RoutingAnalysisParams): RouterSelectionDecision {
    return routeImageRequest(params);
  }

  /**
   * Returns live runtime status and cooldown of all providers.
   */
  public static async getProviderStatuses(): Promise<ProviderRuntimeStatus[]> {
    return getProviderStatuses();
  }

  /**
   * Resolves provider execution order with reference conditioning checks and circuit breaker state.
   */
  public static resolveProviderOrder(
    requested: ImageProviderId | "auto",
    hasReferenceImage: boolean = false,
    quality: "fast" | "balanced" | "max" = "balanced"
  ): ImageProviderId[] {
    const rawOrder = resolveProviderOrder(requested, quality, hasReferenceImage);

    // Filter through Circuit Breaker to avoid cascading failures
    return rawOrder.filter((providerId) => canExecuteProvider(providerId));
  }
}

