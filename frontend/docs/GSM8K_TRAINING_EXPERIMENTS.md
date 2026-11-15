# TATTVA AI — GSM8K Fine-Tuning Experiments Protocol

> **Lead Architect & Maintainer:** **kotapati Gowtham Chowdary**  
> **Status:** Experiment Protocol Defined & Verified  
> **Target Run ID:** `exp_gsm8k_sft_001`  

---

## 1. Experiment Registry & Governance

All future fine-tuning experiments must adhere to the following governance rules:
1. **Never Ingest Evaluation Split**: Any run configuration pointing to `gsm8k-evaluation` will be aborted by `preventTrainingDataLeakage`.
2. **Reproducibility Manifest**: Every experiment records random seed, learning rate, LoRA rank, tokenizer SHA, and training loss curve.
3. **Double-Blind Post-Training Benchmark**: The fine-tuned checkpoint must be benchmarked on the protected 1,319 GSM8K evaluation split using the exact same `Gsm8kEvaluator` harness.

---

## 2. Planned Experiment Schedule

| Experiment ID | Base Foundation Model | Method | Samples | Epochs | Batch Size | Target Accuracy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `exp_gsm8k_sft_001` | `Qwen2.5-Math-1.5B` | QLoRA (r=16) | 7,473 | 3 | 2 (eff. 16) | > 72.0% |
| `exp_gsm8k_sft_002` | `Llama-3.2-1B-Instruct`| QLoRA (r=16) | 7,473 | 3 | 2 (eff. 16) | > 65.0% |
| `exp_gsm8k_sft_003` | `TATTVA-Indic-SLM` | QLoRA (r=32) | 7,473 + Indic | 4 | 2 (eff. 16) | > 70.0% |

---

## 3. Human Approval Gate

Execution of `exp_gsm8k_sft_001` is staged and awaiting explicit human approval before allocating GPU compute instances.
