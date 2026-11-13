"""
TATTVA AI - Stage 5: Scaling Laws, Compute-Optimal Budgets & Maximal Update Parameterization (μP)
Empirical framework for compute budget estimation, IsoFLOP scaling, and hyperparameter transfer.
Architect: kotapati Gowtham Chowdary
"""

import math
from typing import Dict, Any, Tuple

class TattvaScalingEngine:
    """
    Implements Chinchilla compute-optimal scaling laws, IsoFLOP estimation,
    and Maximal Update Parameterization (μP) rules for TATTVA models.
    """

    def __init__(self, hardware_tflops_fp16: float = 15.0, hardware_vram_gb: float = 4.0):
        self.hardware_tflops = hardware_tflops_fp16
        self.hardware_vram_gb = hardware_vram_gb

    def compute_optimal_tokens(self, param_count: int) -> int:
        """
        Chinchilla optimal token formulation: D ≈ 20 * N
        """
        return int(20 * param_count)

    def calculate_training_flops(self, param_count: int, token_count: int) -> float:
        """
        Standard pre-training FLOPs estimate: FLOPs ≈ 6 * N * D
        """
        return 6.0 * float(param_count) * float(token_count)

    def estimate_training_time_hours(
        self,
        param_count: int,
        token_count: int,
        model_flops_utilization: float = 0.30
    ) -> float:
        """
        Estimates training wall-clock duration in hours based on sustained hardware throughput.
        """
        total_flops = self.calculate_training_flops(param_count, token_count)
        sustained_flops_per_sec = (self.hardware_tflops * 1e12) * model_flops_utilization
        total_seconds = total_flops / sustained_flops_per_sec
        return total_seconds / 3600.0

    def estimate_vram_footprint_gb(
        self,
        param_count: int,
        precision_bytes: int = 2,  # BF16 / FP16 = 2 bytes
        batch_size: int = 4,
        seq_len: int = 1024,
        num_layers: int = 12,
        hidden_dim: int = 768
    ) -> Dict[str, float]:
        """
        Computes exact VRAM allocation breakdown (Weights, Gradients, AdamW Optimizer, Activations).
        """
        weights_gb = (param_count * precision_bytes) / (1024 ** 3)
        gradients_gb = (param_count * precision_bytes) / (1024 ** 3)
        # AdamW stores 2 states (FP32 moments) per parameter = 8 bytes per parameter
        optimizer_gb = (param_count * 8) / (1024 ** 3)
        
        # Approximate activation memory per token
        bytes_per_token = 34 * num_layers * hidden_dim
        activations_gb = (batch_size * seq_len * bytes_per_token) / (1024 ** 3)

        total_vram_gb = weights_gb + gradients_gb + optimizer_gb + activations_gb
        is_safe_local = total_vram_gb <= (self.hardware_vram_gb * 0.85)

        return {
            "weights_gb": round(weights_gb, 4),
            "gradients_gb": round(gradients_gb, 4),
            "optimizer_adamw_gb": round(optimizer_gb, 4),
            "activations_gb": round(activations_gb, 4),
            "total_vram_gb": round(total_vram_gb, 4),
            "is_safe_local": is_safe_local,
            "max_available_vram_gb": self.hardware_vram_gb
        }

    def compute_mu_p_multipliers(
        self,
        base_width: int,
        target_width: int
    ) -> Dict[str, float]:
        """
        Calculates Maximal Update Parameterization (μP) scaling factors
        allowing hyperparameter transfer across model widths without re-tuning.
        """
        width_ratio = target_width / base_width
        return {
            "base_width": base_width,
            "target_width": target_width,
            "width_multiplier": round(width_ratio, 4),
            "attention_output_lr_scale": round(1.0 / width_ratio, 4),
            "mlp_output_lr_scale": round(1.0 / width_ratio, 4),
            "embedding_init_scale": 1.0,
            "output_init_scale": round(1.0 / math.sqrt(width_ratio), 4)
        }

if __name__ == "__main__":
    engine = TattvaScalingEngine(hardware_tflops_fp16=15.0, hardware_vram_gb=4.0)
    print("=== TATTVA AI SCALING & COMPUTE REPORT ===")
    
    # 1. 125M Proxy Model
    m125 = 125_000_000
    vram_125 = engine.estimate_vram_footprint_gb(m125)
    hours_125 = engine.estimate_training_time_hours(m125, 50_000_000)
    print(f"\n1. TATTVA-Micro-125M:")
    print(f"   VRAM Total: {vram_125['total_vram_gb']} GB (Safe for local 4GB VRAM: {vram_125['is_safe_local']})")
    print(f"   Validation Run (50M tokens): {round(hours_125, 2)} hours")

    # 2. μP Transfer from 256 to 2048 width
    mup = engine.compute_mu_p_multipliers(256, 2048)
    print(f"\n2. μP Hyperparameter Transfer (Width 256 -> 2048):")
    print(f"   Output LR Scale: {mup['mlp_output_lr_scale']}")
