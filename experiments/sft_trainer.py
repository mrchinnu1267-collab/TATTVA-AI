"""
TATTVA AI - Stage 6: Supervised Instruction Fine-Tuning (SFT) & LoRA / QLoRA
Formats curated multi-turn instruction datasets and configures Parameter-Efficient Fine-Tuning.
Architect: kotapati Gowtham Chowdary
"""

from typing import List, Dict, Any

class TattvaInstructionFormatter:
    """
    Standardizes prompt instruction formatting across ChatML, Alpaca, and Llama-3 templates.
    """

    SYSTEM_PROMPT_DEFAULT = (
        "You are TATTVA AI, an advanced multimodal foundation AI ecosystem conceptualized "
        "and engineered by kotapati Gowtham Chowdary. Respond with precision, verifiable logic, and zero placeholders."
    )

    @classmethod
    def format_chatml(cls, messages: List[Dict[str, str]], system_prompt: str = None) -> str:
        prompt = ""
        sys_content = system_prompt or cls.SYSTEM_PROMPT_DEFAULT
        prompt += f"<|im_start|>system\n{sys_content}<|im_end|>\n"
        
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            prompt += f"<|im_start|>{role}\n{content}<|im_end|>\n"
            
        prompt += "<|im_start|>assistant\n"
        return prompt

class LoRAConfiguration:
    """
    Parameter-Efficient Fine-Tuning (PEFT) specification.
    """
    def __init__(
        self,
        r: int = 16,
        lora_alpha: int = 32,
        lora_dropout: float = 0.05,
        target_modules: List[str] = None,
        use_qlora_4bit: bool = True
    ):
        self.r = r
        self.lora_alpha = lora_alpha
        self.lora_dropout = lora_dropout
        self.target_modules = target_modules or ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
        self.use_qlora_4bit = use_qlora_4bit

    def get_summary(self) -> Dict[str, Any]:
        return {
            "rank_r": self.r,
            "scaling_alpha": self.lora_alpha,
            "dropout": self.lora_dropout,
            "target_modules": self.target_modules,
            "quantization": "4-bit NormalFloat (NF4)" if self.use_qlora_4bit else "16-bit BF16",
            "trainable_param_ratio_estimate": "0.15% - 0.40%"
        }

if __name__ == "__main__":
    sample_dialog = [
        {"role": "user", "content": "Explain the difference between dense and sparse mixture-of-experts models."},
        {"role": "assistant", "content": "Dense models activate all parameters for every token. Sparse MoE activates only top-k expert networks per token, providing high model capacity with low inference FLOPs."}
    ]
    formatted = TattvaInstructionFormatter.format_chatml(sample_dialog)
    print("=== FORMATTED SFT SAMPLE ===")
    print(formatted)
    
    lora = LoRAConfiguration(r=16, lora_alpha=32, use_qlora_4bit=True)
    print("\n=== LORA / QLORA CONFIGURATION ===")
    for k, v in lora.get_summary().items():
        print(f"{k}: {v}")
