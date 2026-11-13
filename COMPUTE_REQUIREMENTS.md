# TATTVA AI — Compute & Hardware Assessment

> **Document Version:** `2.0.0-compute`  
> **Assessment Date:** November 14, 2026  
> **Lead Architect & Maintainer:** kotapati Gowtham Chowdary  
> **Workstation Profile:** AMD Ryzen 7 / NVIDIA RTX 3050 Laptop GPU / Windows 11  

---

## 1. Verified Local Workstation Hardware Profile

An exhaustive hardware audit was executed via CIM and `nvidia-smi` on the active development machine:

| Component | Specification | Operational Limits & Safe Boundaries |
| :--- | :--- | :--- |
| **CPU** | AMD Ryzen 7 170 (8 Cores, 16 Logical Processors) | Ideal for data ingestion, deduplication, MinHash, tokenization, and test harnesses. |
| **System RAM** | 16.0 GB Total Physical RAM (~2.0 GB currently free) | Suitable for running local FastAPI image server, Next.js dev server, and small dataset loaders. Large in-memory datasets require memory-mapping (`mmap`). |
| **Discrete GPU** | NVIDIA GeForce RTX 3050 Laptop GPU | Ada/Ampere architecture with Tensor Cores and FP16/BF16 support. |
| **GPU VRAM** | **4,096 MiB (4.0 GB) GDDR6** | **Strict Boundary:** Maximum VRAM for training is ~3.5 GB (leaving 0.5 GB for OS/Display). Full FP16 pre-training is bounded to $\le 125\text{M}$ parameter models. |
| **CUDA Driver** | NVIDIA 591.84 (CUDA Runtime 13.1) | Supports PyTorch 2.x, cuDNN 9, and FlashAttention-2. |
| **Primary Storage** | NVMe SSD: 153.81 GB Free Space (Drive C:\) | Plenty of room for small checkpoint storage ($\le 20\text{GB}$), tokenized datasets, and virtual environments. |

---

## 2. Model Tier Classification & Compute Boundaries

To prevent out-of-memory (OOM) crashes and system instability, all TATTVA AI model configurations are strictly classified into 4 tiers:

### Tier 1: Micro Proxy & Research Models (10M – 125M Parameters)
* **Target Configurations:** `TATTVA-Proxy-15M`, `TATTVA-Proxy-60M`, `TATTVA-Micro-125M`.
* **VRAM Footprint (FP16/BF16):**
  - Model Weights: 250 MB
  - Gradients: 250 MB
  - AdamW Optimizer States: 1,000 MB (4 bytes per parameter for first and second moments)
  - Activations & Buffers (seq len 1024, batch size 4): ~500 MB
  - **Total Training VRAM:** $\approx 2.0\text{ GB} - 2.8\text{ GB}$
* **Execution Environment:** **100% Local Laptop Development (RTX 3050 4GB).**
* **Purpose:** Architecture validation, $\mu$P hyperparameter transfer, learning rate experiments, and tokenizer verification.

---

### Tier 2: Small Language Models / SLMs (500M – 1.5B Parameters)
* **Target Configurations:** `TATTVA-SLM-500M`, `TATTVA-Code-1B`, `TATTVA-Math-1B`.
* **VRAM Footprint:**
  - *Full Pre-training (BF16):* $\approx 16\text{ GB} - 24\text{ GB}$ (Exceeds local laptop VRAM).
  - *Inference (INT4 / FP8):* $\approx 0.8\text{ GB} - 1.5\text{ GB}$ (Runs smoothly on RTX 3050).
  - *Fine-Tuning (4-bit QLoRA, rank 16):* $\approx 3.2\text{ GB} - 3.8\text{ GB}$ (Tight but feasible locally with gradient checkpointing and batch size 1).
* **Execution Environment:**
  - Pre-training: **Cloud GPU (1x NVIDIA A10G 24GB or 1x L4 24GB)**.
  - SFT / LoRA Fine-Tuning: Local RTX 3050 (with QLoRA) or Cloud GPU.
  - Inference: Local RTX 3050 via llama.cpp or ONNX Runtime.

---

### Tier 3: Medium Specialized Models (3B – 8B Parameters)
* **Target Configurations:** `TATTVA-General-3B`, `TATTVA-Omni-7B`, `TATTVA-MoE (8x1B)`.
* **VRAM Footprint:**
  - *Full Training:* $\approx 48\text{ GB} - 80\text{ GB}$.
  - *QLoRA Fine-Tuning (4-bit):* $\approx 6.5\text{ GB} - 9.0\text{ GB}$ (Exceeds local 4GB VRAM).
  - *Quantized Inference (INT4):* $\approx 2.5\text{ GB} - 4.5\text{ GB}$.
* **Execution Environment:** **Cloud GPU (1x NVIDIA A100 80GB or 1x H100 80GB)**.

---

### Tier 4: Frontier Scale Models (14B – 70B+ Sparse MoE)
* **Target Configurations:** `TATTVA-Frontier-MoE (8x7B)`.
* **VRAM Footprint:** $\ge 160\text{ GB}$ across multiple nodes.
* **Execution Environment:** **Distributed Multi-Node GPU Cluster (8x–64x H100 SXM5 with NVLink & InfiniBand)**.

---

## 3. Mathematical Compute Budget Formulations

Before launching any pre-training run, the exact compute budget must be calculated using standard scaling law formulations:

$$\text{Total Training FLOPs} \approx 6 \times N \times D$$

Where:
* $N$ is the active non-embedding parameter count.
* $D$ is the total number of training tokens processed.

### Chinchilla Compute-Optimal Configuration:
$$D_{\text{optimal}} \approx 20 \times N$$

For a small $125\text{M}$ proxy model:
$$D_{\text{optimal}} = 20 \times 125 \times 10^6 = 2.5 \times 10^9 \text{ tokens (2.5B tokens)}$$
$$\text{Compute Budget} = 6 \times (125 \times 10^6) \times (2.5 \times 10^9) = 1.875 \times 10^{18} \text{ FLOPs (1.875 ExaFLOPs)}$$

On an RTX 3050 Laptop GPU delivering $\sim 15$ TFLOPs FP16 sustained throughput with MFU $\approx 30\%$:
$$\text{Effective Throughput} = 4.5 \times 10^{12} \text{ FLOPs/sec}$$
$$\text{Training Time for 2.5B tokens} \approx \frac{1.875 \times 10^{18}}{4.5 \times 10^{12}} \approx 416,666 \text{ seconds} \approx 4.8 \text{ days}$$

For small proof-of-concept experiments ($\le 50\text{M}$ tokens for architecture validation):
$$\text{Validation Time} \approx \frac{6 \times 125\times 10^6 \times 50 \times 10^6}{4.5 \times 10^{12}} \approx 8,333 \text{ seconds} \approx 2.3 \text{ hours}$$

---

## 4. The Three Execution Paths

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PATH 1: LOCAL LAPTOP DEVELOPMENT                                            │
│ - Hardware: AMD Ryzen 7 (16t) + RTX 3050 (4GB) + 16GB RAM                   │
│ - Workload: Micro proxy models (10M–125M), synthetic data generation,      │
│   MinHash deduplication, tokenizer training, Next.js orchestrator & tools.  │
│ - Financial Cost: $0.00 / hour.                                             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PATH 2: CLOUD GPU EXPERIMENTATION                                           │
│ - Hardware: 1x NVIDIA A10G (24GB) or 1x A100 (80GB) on demand               │
│ - Providers: Lambda Labs, RunPod, Google Cloud Vertex AI, Modal.             │
│ - Workload: SLM pre-training (500M–1.5B), 8B QLoRA SFT, GRPO/RLVR training. │
│ - Estimated Cost: $0.70 – $2.10 / hour.                                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PATH 3: DISTRIBUTED GPU CLUSTER                                             │
│ - Hardware: 8x–64x NVIDIA H100 (80GB SXM5) with InfiniBand interconnect   │
│ - Workload: Scaled MoE foundation pre-training, large-scale distillation.    │
│ - Condition: Activated ONLY after Phase 1 proxy scaling laws are empirically │
│   proven and verified.                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Strict Safe Compute Guardrails

1. **Memory Pre-Flight Verification:** No PyTorch training script may execute without first querying `torch.cuda.get_device_properties(0).total_memory` and confirming memory headroom.
2. **Batch-Size Assertion:** If batch size $\times$ sequence length yields estimated activation memory $>3.2\text{ GB}$, the process must fail gracefully with a recommendation to enable gradient accumulation or reduce sequence length.
3. **Storage Protection:** Never download weights or datasets $>15\text{ GB}$ to the local disk without verifying $>50\text{ GB}$ of remaining free disk headroom.
4. **Thermal & Battery Safety:** Laptop GPU compute runs must monitor thermal throttling and automatically pause if GPU junction temperature exceeds $85^\circ\text{C}$.
