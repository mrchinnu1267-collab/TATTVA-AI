"""
TATTVA AI - Stage 5: Proxy Model Pre-Training Architecture & WSD Scheduler
Lightweight Transformer prototype with Warmup-Stable-Decay (WSD) learning rate schedule.
Architect: kotapati Gowtham Chowdary
"""

import math
from typing import List, Dict, Any

class WSDLearningRateScheduler:
    """
    Implements Warmup-Stable-Decay (WSD) schedule.
    Superior to Cosine Decay for continuous pre-training and checkpoint branching.
    """

    def __init__(
        self,
        max_lr: float = 3e-4,
        min_lr: float = 3e-5,
        warmup_steps: int = 1000,
        stable_steps: int = 8000,
        decay_steps: int = 1000
    ):
        self.max_lr = max_lr
        self.min_lr = min_lr
        self.warmup_steps = warmup_steps
        self.stable_steps = stable_steps
        self.decay_steps = decay_steps
        self.total_steps = warmup_steps + stable_steps + decay_steps

    def get_lr(self, current_step: int) -> float:
        # Phase 1: Linear Warmup
        if current_step < self.warmup_steps:
            pct = current_step / max(1, self.warmup_steps)
            return self.min_lr + pct * (self.max_lr - self.min_lr)
        
        # Phase 2: Stable Plateau
        if current_step < (self.warmup_steps + self.stable_steps):
            return self.max_lr
        
        # Phase 3: Fast Annealing / Decay
        decay_progress = (current_step - (self.warmup_steps + self.stable_steps)) / max(1, self.decay_steps)
        decay_progress = min(1.0, max(0.0, decay_progress))
        # 1-sqrt or cosine annealing during decay phase
        cosine_decay = 0.5 * (1.0 + math.cos(math.pi * decay_progress))
        return self.min_lr + (self.max_lr - self.min_lr) * cosine_decay

class TattvaProxyConfig:
    """
    Configuration specification for TATTVA proxy models.
    """
    def __init__(
        self,
        vocab_size: int = 32000,
        hidden_dim: int = 256,
        intermediate_dim: int = 688,
        num_layers: int = 6,
        num_heads: int = 8,
        max_seq_len: int = 1024,
        rope_base: float = 10000.0
    ):
        self.vocab_size = vocab_size
        self.hidden_dim = hidden_dim
        self.intermediate_dim = intermediate_dim
        self.num_layers = num_layers
        self.num_heads = num_heads
        self.max_seq_len = max_seq_len
        self.rope_base = rope_base

    def calculate_parameter_count(self) -> int:
        # Embedding: vocab_size * hidden_dim
        embed_params = self.vocab_size * self.hidden_dim
        # Attention per layer: Q, K, V, O projections = 4 * (hidden_dim^2)
        attn_params_per_layer = 4 * (self.hidden_dim * self.hidden_dim)
        # SwiGLU MLP per layer: Gate, Up, Down projections = 3 * (hidden_dim * intermediate_dim)
        mlp_params_per_layer = 3 * (self.hidden_dim * self.intermediate_dim)
        # LayerNorms per layer
        norm_params_per_layer = 2 * self.hidden_dim
        
        layer_params = (attn_params_per_layer + mlp_params_per_layer + norm_params_per_layer) * self.num_layers
        # Final norm and LM head (tied or untied)
        head_params = self.hidden_dim * self.vocab_size
        
        total = embed_params + layer_params + head_params
        return total

if __name__ == "__main__":
    cfg = TattvaProxyConfig(hidden_dim=256, intermediate_dim=688, num_layers=6)
    total_params = cfg.calculate_parameter_count()
    print(f"TATTVA Proxy Architecture Configured: {total_params:,} parameters ({round(total_params / 1e6, 2)}M)")
    
    scheduler = WSDLearningRateScheduler(max_lr=3e-4, warmup_steps=100, stable_steps=800, decay_steps=100)
    print(f"Step 50 LR (Warmup): {scheduler.get_lr(50):.6f}")
    print(f"Step 500 LR (Stable): {scheduler.get_lr(500):.6f}")
    print(f"Step 950 LR (Decay):  {scheduler.get_lr(950):.6f}")
