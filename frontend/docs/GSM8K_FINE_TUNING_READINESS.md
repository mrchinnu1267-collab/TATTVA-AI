# TATTVA AI — GSM8K Custom Mathematical Model Fine-Tuning Readiness

> **Lead Architect & Maintainer:** **kotapati Gowtham Chowdary**  
> **Module:** `Gsm8kFineTuningPipeline` (`app/lib/evaluation/gsm8k/fine-tuning-pipeline.ts`)  
> **Status:** Experimental Pipeline Ready (Awaiting Human Approval for Compute Dispatch)  

---

## 1. Executive Feasibility Summary

GSM8K is an academic training and evaluation dataset (8,792 total questions), not a standalone pre-trained model. To build a specialized TATTVA Mathematical Assistant, a compact open-weight base model must be fine-tuned using Parameter-Efficient Fine-Tuning (PEFT / QLoRA).

### Target Base Model Architecture Candidates:
1. **`Qwen/Qwen2.5-Math-1.5B-Instruct`** (Recommended): Highest math density per parameter; Apache 2.0 license.
2. **`meta-llama/Llama-3.2-1B-Instruct`**: Ultra-compact; suitable for mobile/desktop edge deployment.
3. **`TATTVA-Indic-SLM`**: Specialized multilingual reasoning model.

---

## 2. Hardware Feasibility & VRAM Profiling

| Hardware Profile | Available VRAM | QLoRA 4-bit Feasibility | Full Fine-Tuning | Recommended Configuration |
| :--- | :--- | :--- | :--- | :--- |
| **Local Laptop (RTX 3050)** | **4 GB** | Marginal / Requires CPU Offloading | Not Feasible | Batch size = 1, gradient accumulation = 16, 4-bit NF4 |
| **Google Colab Pro (T4/V100)** | **16 GB** | **100% Feasible** | Marginal | Batch size = 4, gradient accumulation = 4, 4-bit NF4 |
| **Cloud GPU (A10G / L4)** | **24 GB** | **100% Feasible** | **Feasible** | Batch size = 8, bfloat16 mixed precision |

> [!WARNING]
> **Hardware Boundary Policy**: To prevent system freezes or out-of-memory crashes on 4GB laptop GPUs, actual model training will not be automatically initiated locally without human confirmation and cloud dispatch approval.

---

## 3. Supervised Fine-Tuning (SFT) Formats Prepared

The pipeline converts 7,473 GSM8K training records into three standard formats:

### A. Alpaca Instruction Format (`alpaca`)
```json
{
  "instruction": "Solve the following grade-school mathematical word problem step by step. Provide your step-by-step reasoning and conclude with the final numerical answer.",
  "input": "Natalia sold clips to 48 of her friends in April, and then she sold half as many clips in May. How many clips did Natalia sell altogether in April and May?",
  "output": "Natalia sold 48/2 = <<48/2=24>>24 clips in May.\nNatalia sold 48+24 = <<48+24=72>>72 clips altogether in April and May.\n#### 72"
}
```

### B. ChatML Multi-Turn Dialogue Format (`chatml`)
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are an expert mathematical reasoning assistant. Solve word problems step-by-step and terminate your final answer with '#### <number>'."
    },
    {
      "role": "user",
      "content": "Natalia sold clips to 48 of her friends in April, and then she sold half as many clips in May. How many clips did Natalia sell altogether in April and May?"
    },
    {
      "role": "assistant",
      "content": "Natalia sold 48/2 = <<48/2=24>>24 clips in May.\nNatalia sold 48+24 = <<48+24=72>>72 clips altogether in April and May.\n#### 72"
    }
  ]
}
```

---

## 4. Parameter-Efficient QLoRA Hyperparameters

- **Base Model**: `Qwen/Qwen2.5-Math-1.5B`
- **Quantization**: 4-bit NormalFloat4 (NF4) with Double Quantization (`bnb_4bit_use_double_quant=True`)
- **LoRA Rank ($r$)**: `16`
- **LoRA Alpha ($\alpha$)**: `32`
- **LoRA Dropout**: `0.05`
- **Target Attention Modules**: `["q_proj", "k_proj", "v_proj", "o_proj"]`
- **Learning Rate**: `2e-4` with cosine decay
- **Warmup Ratio**: `0.03`
- **Max Sequence Length**: `1024` tokens
