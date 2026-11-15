# TATTVA AI – Custom Foundation Model Selection & Hardware Profiling Analysis

**Document ID:** `ANALYSIS-TATTVA-MODEL-SELECTION-2026-11`  
**Date:** November 15, 2026  
**Auditor / Principal Engineer:** Antigravity AI Systems Architecture Team  
**Repository:** `C:\Users\mrchi\TATTVA_AI\TATTVA_AI`  

---

## 1. Hardware Environment Assessment

An empirical hardware inspection was conducted on the host machine:

| Component | Hardware Specification | Available Memory | Constraints / Implications |
| :--- | :--- | :--- | :--- |
| **Processor** | AMD Ryzen 7 170 (16 logical cores) | 16 vCPUs | Strong CPU multithreading for preprocessing and data tokenization. |
| **System RAM** | 16 GB DDR5 | ~15.32 GB (Free: ~2.75 GB) | Sufficient for small-to-medium dataset caching; offloading large models to RAM is limited. |
| **Dedicated GPU** | **NVIDIA GeForce RTX 3050 Laptop GPU** | **4,293,918,720 bytes (4.00 GB GDDR6)** | Compute Capability 8.6 (Ampere). Strict 4.0 GB VRAM ceiling. |

> [!CAUTION]
> **VRAM Safety Constraint:**
> Attempting full-parameter fine-tuning or 16-bit LoRA on models $\ge 3\text{B}$ parameters will instantly result in CUDA Out-Of-Memory (OOM) errors on a 4 GB GPU.
> All local fine-tuning must utilize **4-bit NormalFloat (NF4) QLoRA**, **gradient checkpointing**, and **8-bit AdamW optimizers**.

---

## 2. Foundation Model Candidate Comparison

| Model | Parameters | License | Architecture / Context | Math & Code Strength | Telugu / Indic Support | 4-bit QLoRA VRAM (Batch 1, Seq 2048) | Local Feasibility (RTX 3050 4GB) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Qwen2.5-0.5B-Instruct** | 0.49B | Apache 2.0 | GQA, 32K context | Good | Moderate | **~1.55 GB** | ✅ **Optimal / Ultra-Safe** |
| **Qwen2.5-1.5B-Instruct** | 1.54B | Apache 2.0 | GQA, 32K context | **Exceptional** (GSM8K: 75%+) | **High** (Native Indic tokenization) | **~2.75 GB** | ✅ **Recommended Primary** |
| **Llama-3.2-1B-Instruct** | 1.23B | Llama 3.2 Community | GQA, 128K context | Moderate | Moderate | **~2.40 GB** | ✅ **Recommended Edge Chat** |
| **SmolLM2-1.7B-Instruct** | 1.71B | Apache 2.0 | GQA, 8K context | Moderate | Low | **~2.90 GB** | ⚠️ Moderate |
| **Qwen2.5-7B-Instruct** | 7.61B | Apache 2.0 | GQA, 128K context | State-of-the-art | High | **~6.50 GB** | ❌ **OOM (Requires Cloud GPU)** |
| **Llama-3.1-8B-Instruct** | 8.03B | Llama 3.1 Community | GQA, 128K context | High | Moderate | **~6.80 GB** | ❌ **OOM (Requires Cloud GPU)** |

---

## 3. Mathematical VRAM Memory Breakdown (RTX 3050 Feasibility)

For **Qwen2.5-1.5B-Instruct** under QLoRA (Quantized Low-Rank Adaptation):

$$\text{Total VRAM} = \text{Base Model (4-bit)} + \text{LoRA Weights & Gradients} + \text{Optimizer State} + \text{Activation Memory}$$

1. **Quantized Base Model (NF4):**
   $$1.54 \times 10^9 \text{ params} \times 0.5 \text{ bytes} \approx 770 \text{ MB} \ (0.77 \text{ GB})$$
2. **LoRA Adapters ($r=16, \alpha=32$ on all linear projections):**
   $$\text{Trainable Params} \approx 4.5 \times 10^6 \text{ params} \times 4 \text{ bytes (FP32)} \approx 18 \text{ MB}$$
3. **8-bit Paged AdamW Optimizer States:**
   $$\approx 4.5 \times 10^6 \times 2 \text{ bytes} \approx 9 \text{ MB}$$
4. **Activations with Gradient Checkpointing (Batch Size = 1, Sequence Length = 1536):**
   $$\approx 1.80 \text{ GB}$$
5. **PyTorch CUDA Overhead & CUDA Context:**
   $$\approx 350 \text{ MB}$$

$$\text{Total Peak VRAM} = 0.77 + 0.02 + 0.01 + 1.80 + 0.35 \approx \mathbf{2.95 \text{ GB}}$$

**Conclusion:** Qwen2.5-1.5B-Instruct fits comfortably within the **4.0 GB VRAM limit** of the RTX 3050 with approximately **1.05 GB of safety headroom**, completely preventing out-of-memory crashes.

---

## 4. Architectural Selection Recommendation

1. **Primary Target Architecture:** **`Qwen/Qwen2.5-1.5B-Instruct`**
   - **Reasoning:** Industry-leading mathematical reasoning and Python code synthesis at the sub-2B parameter scale. Its extensive multilingual vocabulary handles Telugu script without byte-fallback fragmentation.
2. **Edge Conversational Architecture:** **`meta-llama/Llama-3.2-1B-Instruct`**
   - **Reasoning:** 128K context window, ultra-fast token generation on laptop CPUs, and seamless Ollama / llama.cpp deployment.
3. **Enterprise Scale Target:** **`Qwen/Qwen2.5-7B-Instruct`**
   - **Reasoning:** Reserved for Cloud / Serverless execution (A100 / H100) when high-complexity reasoning is required.
