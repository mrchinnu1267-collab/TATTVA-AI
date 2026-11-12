/**
 * TATTVA AI - Hardware Safety & VRAM Allocation Guardrails (Phase R)
 * Analyzes memory requirements for Diffusion Transformers (DiT), Flow Matching,
 * SDXL, and ControlNet. Enforces safe VRAM ceilings for consumer GPUs
 * (e.g. RTX 3050 4GB) and recommends cloud serverless offloading when appropriate.
 */

import { VRAMAllocationSpec } from "./types";

export class HardwareGuardrails {
  private static readonly MAX_SAFE_LOCAL_VRAM_BYTES = 3.6 * 1024 * 1024 * 1024; // 3.6 GB limit on 4GB hardware

  /**
   * Evaluates hardware suitability and precision strategy for target models.
   */
  public static evaluateModelAllocation(
    modelId: string,
    requestedPrecision: "fp32" | "fp16" | "fp8_e4m3" | "int4_quantized" = "fp8_e4m3"
  ): VRAMAllocationSpec {
    let estimatedBytes = 3.2 * 1024 * 1024 * 1024;
    let archFamily: VRAMAllocationSpec["architectureFamily"] = "diffusion_transformer";
    let offloadLayers = 0;

    switch (modelId) {
      case "flux-schnell":
      case "flux-dev":
        archFamily = "rectified_flow";
        if (requestedPrecision === "fp16") {
          estimatedBytes = 11.5 * 1024 * 1024 * 1024; // ~11.5 GB
        } else if (requestedPrecision === "fp8_e4m3") {
          estimatedBytes = 5.8 * 1024 * 1024 * 1024; // ~5.8 GB
        } else {
          estimatedBytes = 3.1 * 1024 * 1024 * 1024; // ~3.1 GB with Q4/NF4
        }
        break;

      case "sdxl-lightning":
      case "sdxl-base":
        archFamily = "latent_diffusion";
        if (requestedPrecision === "fp16") {
          estimatedBytes = 4.8 * 1024 * 1024 * 1024; // 4.8 GB
        } else {
          estimatedBytes = 2.4 * 1024 * 1024 * 1024; // 2.4 GB FP8
        }
        break;

      case "sd3.5-medium":
        archFamily = "diffusion_transformer";
        estimatedBytes = requestedPrecision === "fp8_e4m3" ? 3.4 * 1024 * 1024 * 1024 : 7.2 * 1024 * 1024 * 1024;
        break;

      default:
        estimatedBytes = 2.8 * 1024 * 1024 * 1024;
        break;
    }

    const safeForRTX3050 = estimatedBytes <= this.MAX_SAFE_LOCAL_VRAM_BYTES;
    const recommendedExecutionMode: VRAMAllocationSpec["recommendedExecutionMode"] = safeForRTX3050
      ? "local_cuda"
      : "cloud_serverless";

    if (!safeForRTX3050 && estimatedBytes < 6 * 1024 * 1024 * 1024) {
      offloadLayers = 12; // Text encoder & VAE offloaded to CPU RAM
    }

    return {
      modelName: modelId,
      architectureFamily: archFamily,
      precision: requestedPrecision,
      estimatedVRAMBytes: estimatedBytes,
      safeForRTX3050_4GB: safeForRTX3050,
      recommendedExecutionMode,
      offloadLayersCount: offloadLayers,
    };
  }
}

