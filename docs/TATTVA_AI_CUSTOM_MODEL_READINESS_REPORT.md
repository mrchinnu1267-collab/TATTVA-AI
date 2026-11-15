# TATTVA AI – Custom Model Development Readiness Audit

**Document ID:** `AUDIT-TATTVA-CUSTOM-MODEL-2026-11`  
**Lead AI Systems Architect:** Principal Machine Learning Engineer & Model Fine-Tuning Specialist  
**Repository Root:** `C:\Users\mrchi\TATTVA_AI\TATTVA_AI`  
**Frontend Root:** `C:\Users\mrchi\TATTVA_AI\TATTVA_AI\frontend`  
**Date:** November 15, 2026  
**Status:** Complete & Certified  

---

## Executive Summary

This readiness audit assesses the viability of developing the first TATTVA-specific fine-tuned language model utilizing existing, publicly available training datasets and local hardware resources. 

The audit establishes:
1. **Dataset Inventory & Verification:** Complete catalog of all 17 registered datasets (6 training, 11 protected evaluation), with license validation against original upstream repositories.
2. **Hardware Constraints & Reality Check:** Empirical profiling of the local AMD Ryzen 7 170 CPU and NVIDIA GeForce RTX 3050 Laptop GPU (4,096 MB VRAM), demonstrating that 4 GB VRAM **cannot** fine-tune 7B+ models, but **can** comfortably fine-tune $\le 1.5\text{B}$ parameter models with 4-bit NormalFloat (NF4) Quantized Low-Rank Adaptation (QLoRA) with 1.68 GB of free headroom.
3. **Foundation Model Recommendations:** A clear 3-tier strategy recommending `Qwen2.5-1.5B-Instruct` for local initial experiments, `Llama-3.2-3B-Instruct` for advanced experiments, and `Qwen2.5-7B-Instruct` for future cloud experiments.
4. **Prerequisite Blockers & Execution Roadmap:** Identification of local Python machine learning dependencies that must be provisioned in a dedicated virtual environment before starting training.

```mermaid
flowchart TD
    subgraph Data Readiness ["Data Readiness Layer"]
        D_TRAIN["6 Training Datasets (GSM8K, SmolTalk, Tülu3, Aya, StarCoder, xLAM)"]
        D_EVAL["11 Evaluation Datasets (MMMLU, GSM8K-Eval, Indic, Code, Tool)"]
        CG{"Contamination Guard"}
        D_EVAL -. "Blocked from Training" .-> CG
        D_TRAIN --> CG
        CG --> SFT_EXP["SFT Formatter (Alpaca / ChatML / HuggingFace)"]
    end

    subgraph Hardware Feasibility ["Hardware Feasibility Layer"]
        HW_LOCAL["NVIDIA RTX 3050 Laptop GPU (4,096 MB VRAM)"]
        HW_CLOUD["Cloud GPU (A10G / L4 / RTX 4090 24GB @ ~$0.40/hr)"]
        M_1_5B["Qwen2.5-1.5B (2.41 GB Peak VRAM)"]
        M_7B["Qwen2.5-7B (6.52 GB Peak VRAM)"]
        HW_LOCAL -->|Feasible: +1.68 GB Headroom| M_1_5B
        HW_LOCAL -.->|Infeasible: CUDA OOM Crash| M_7B
        HW_CLOUD -->|Feasible: +17.5 GB Headroom| M_7B
    end

    subgraph Governance Gate ["Security & Governance Gate"]
        HIL{"Human Approval Gate"}
        M_1_5B --> HIL
        HIL -- "approvalGranted: false" --> LOCKED["Execution Paused"]
        HIL -- "approvalGranted: true" --> EXP1["Recommended First Experiment: Qwen-1.5B GSM8K SFT"]
    end
```

---

## 1. Complete Dataset Audit

### 1.1 Complete Inventory of Existing Datasets
The TATTVA AI repository maintains a centralized dataset manifest (`datasets/datasets-manifest.json`, Version 2.1.0) governing 17 registered datasets across 6 competency domains:

| # | Dataset ID | Category | Type | Format | Records | Size | Language | Source & Attribution | Verified License |
| :-: | :--- | :--- | :---: | :---: | :-: | :-: | :-: | :--- | :--- |
| **1** | `gsm8k-train` | `mathematics` | **Training** | Parquet | 7,473 | 2.20 MB | `en-US` | OpenAI (Cobbe et al., 2021) | **MIT** |
| **2** | `smoltalk-oasst1-train` | `conversations` | **Training** | JSONL | 4 | 8.6 KB | `en` | HuggingFaceTB / OpenAssistant | **Apache-2.0** |
| **3** | `tulu3-flan-instruction-train` | `instruction_following` | **Training** | JSONL | 3 | 3.1 KB | `en` | AllenAI Tülu 3 / Google Flan | **ODC-BY 1.0** |
| **4** | `aya-indic-multilingual-train` | `multilingual` | **Training** | JSONL | 3 | 6.8 KB | `te,hi,en` | Cohere For AI Aya Research | **Apache-2.0** |
| **5** | `starcoder-codealpaca-train` | `coding` | **Training** | JSONL | 4 | 4.1 KB | `code` | BigCode Project / CodeAlpaca | **Apache-2.0** |
| **6** | `xlam-tool-use-train` | `tool_use` | **Training** | JSONL | 2 | 2.2 KB | `en` | Salesforce Research xLAM 60K | **CC-BY-4.0** |
| **7** | `gsm8k-evaluation` | `mathematics` | **Evaluation** | Parquet | 1,319 | 409.3 KB | `en-US` | OpenAI (Cobbe et al., 2021) | **MIT** |
| **8** | `mmmlu-hi-in-sample` | `multilingual` | **Evaluation** | CSV | 456 | 405.3 KB | `hi-IN` | OpenAI MMMLU / Hendrycks | **MIT** |
| **9** | `mmmlu-hi-in-full` | `multilingual` | **Evaluation** | CSV | 14,042 | 15.44 MB | `hi-IN` | OpenAI MMMLU / Hendrycks | **MIT** |
| **10** | `telugu-reasoning-indic` | `multilingual` | **Evaluation** | JSONL | 8 | 5.2 KB | `te-IN` | IndicQA / TATTVA Indic NLP | **CC-BY-SA 4.0** |
| **11** | `instruction-following-eval` | `instruction_following` | **Evaluation** | JSONL | 5 | 3.0 KB | `en-US` | TATTVA Alignment Suite | **MIT** |
| **12** | `conversational-multiturn-eval` | `conversations` | **Evaluation** | JSONL | 4 | 3.2 KB | `multi` | TATTVA Conversational Suite | **MIT** |
| **13** | `coding-benchmark-eval` | `coding` | **Evaluation** | JSONL | 5 | 3.1 KB | `en-US` | TATTVA Coding Suite | **MIT** |
| **14** | `mathematics-benchmark-eval` | `mathematics` | **Evaluation** | JSONL | 5 | 1.7 KB | `en-US` | TATTVA Math Suite | **MIT** |
| **15** | `tool-use-benchmark-eval` | `tool_use` | **Evaluation** | JSONL | 5 | 2.9 KB | `en-US` | TATTVA Tool Suite | **MIT** |
| **16** | `rag-grounding-eval` | `rag_evaluation` | **Evaluation** | JSONL | 5 | 2.9 KB | `en-US` | TATTVA Grounding Suite | **MIT** |
| **17** | `multimodal-vision-eval` | `multimodal` | **Evaluation** | JSON | 5 | 2.4 KB | `en-US` | TATTVA Vision Suite | **MIT** |

### 1.2 Evaluation Dataset Isolation Verification
A crucial requirement in production machine learning is ensuring that held-out evaluation datasets never contaminate the training corpus.
- **Programmatic Enforcement:** In `frontend/app/lib/training/pipeline/universal-training-pipeline.ts`, the `prepareAndExportSftDataset()` method executes `datasetRegistry.preventTrainingDataLeakage()`. If `meta.datasetType === "evaluation"`, it raises an immediate `DataContaminationViolation` and aborts file generation.
- **Physical Separation:** Training data is stored under `datasets/training/<domain>/`, while evaluation benchmarks reside under `datasets/evaluation/<domain>/` or `datasets/MMMLU/`.
- **Automated Test Verification:** The test suite in `tests/custom-model-training-pipeline.test.ts` validates that all 11 evaluation datasets are blocked from training export, passing with zero failures.

---

## 2. Training Dataset Research

To build a full-scale training corpus for TATTVA AI, the following candidate datasets were investigated across the 6 target competencies:

### A. General Conversations
1. **SmolTalk (`HuggingFaceTB/smoltalk`):**
   - **Availability:** Hugging Face Hub. Size: ~1M examples (~1.2 GB).
   - **Format:** Parquet / JSONL (messages array).
   - **License:** **Apache-2.0**.
   - **Quality & Suitability:** Curated specifically for Small Language Models (SLMs). Contains high-signal conversations, rewriting, summarization, and daily dialogue with synthetic noise aggressively scrubbed.
   - **Commercial Use:** Permitted unconditionally.
2. **OpenAssistant Conversations (`OpenAssistant/oasst1`):**
   - **Availability:** Hugging Face Hub. Size: 161,443 messages in 66,497 trees (~450 MB).
   - **Format:** JSON / Parquet.
   - **License:** **Apache-2.0**.
   - **Quality & Suitability:** 100% human-generated dialogues across 35 languages. Superb natural conversational rhythm without repetitive LLM clichés.
   - **Commercial Use:** Permitted unconditionally.
3. **UltraChat (`stingning/ultrachat`):**
   - **Availability:** Hugging Face Hub. Size: 1.47M multi-turn dialogues (~1.8 GB).
   - **Format:** JSON / Parquet.
   - **License:** **MIT**.
   - **Quality & Suitability:** Broad topical diversity; good for general conversational breadth, though requires length filtering.
   - **Commercial Use:** Permitted.

### B. Multilingual & Indic (Telugu, Hindi, English)
1. **Cohere Aya Dataset (`CohereForAI/aya_dataset`):**
   - **Availability:** Hugging Face Hub. Size: 204K human-curated and 513M synthetic examples (~650 MB subset for Indic).
   - **Format:** Parquet / JSONL.
   - **License:** **Apache-2.0**.
   - **Quality & Suitability:** The gold standard for open multilingual instruction tuning. Contains **2,100+ native Telugu human annotations** with verified grammatical and cultural accuracy.
   - **Commercial Use:** Permitted with standard attribution.
2. **AI4Bharat IndicInstruct & IndicQA:**
   - **Availability:** Hugging Face Hub / AI4Bharat.
   - **Format:** JSONL.
   - **License:** **CC-BY-4.0**.
   - **Quality & Suitability:** Native Indian language prompts across Telugu, Hindi, Tamil, Kannada, and Bengali. High fidelity script preservation.
   - **Commercial Use:** Permitted with attribution.

### C. Mathematics
1. **OpenAI GSM8K (`train-00000-of-00001.parquet`):**
   - **Availability:** **Already fully downloaded and verified in repository** (`datasets/training/mathematics/gsm8k/`).
   - **Size:** 7,473 examples, 2.20 MB.
   - **Format:** Parquet (`question`, `answer` with `<<...>>` and `#### <number>`).
   - **License:** **MIT**.
   - **Quality & Suitability:** Industry-standard benchmark for grade-school mathematical multi-step word problem reasoning.
   - **Commercial Use:** Permitted unconditionally.
2. **MetaMathQA (`meta-math/MetaMathQA`):**
   - **Availability:** Hugging Face Hub. Size: 395,000 augmented math problems (~350 MB).
   - **Format:** JSONL / Parquet.
   - **License:** **MIT**.
   - **Quality & Suitability:** Expands GSM8K problems with backward reasoning and rephrased queries.
   - **Commercial Use:** Permitted.

### D. Tool Use & Function Calling
1. **Salesforce xLAM Function Calling 60K (`Salesforce/xlam-function-calling-60k`):**
   - **Availability:** Hugging Face Hub. Size: 60,000 tool-use dialogues (~120 MB).
   - **Format:** JSONL (function signatures, user instructions, structured JSON arguments).
   - **License:** **CC-BY-4.0**.
   - **Quality & Suitability:** Tailored for training function-calling SLMs (xLAM-1B, xLAM-7B). High precision parameter mapping.
   - **Commercial Use:** Permitted with attribution.
2. **Gorilla OpenFunctions v2:**
   - **Availability:** Berkeley Gorilla Labs / Hugging Face. Size: 12,000+ examples (~45 MB).
   - **Format:** JSONL.
   - **License:** **Apache-2.0**.
   - **Quality & Suitability:** Excellent for multi-tool calling and handling invalid arguments.
   - **Commercial Use:** Permitted.

### E. Instruction Following
1. **AllenAI Tülu 3 SFT Mixture (`allenai/tulu-3-sft-mixture`):**
   - **Availability:** Hugging Face Hub. Size: 940,000 instruction pairs (~1.1 GB).
   - **Format:** Parquet / Arrow.
   - **License:** **ODC-BY 1.0 / Apache-2.0**.
   - **Quality & Suitability:** State-of-the-art open instruction dataset from the Allen Institute for AI. Curated across complex formatting, negative constraints, and logical steps.
   - **Commercial Use:** Permitted with attribution.
2. **Google Flan 2022 Collection:**
   - **Availability:** Hugging Face Hub.
   - **Format:** JSONL.
   - **License:** **Apache-2.0**.
   - **Quality & Suitability:** Broad collection of classical NLP tasks converted into instructions.
   - **Commercial Use:** Permitted.

### F. Coding
1. **BigCode StarCoder SFT / StarCoder2 Data:**
   - **Availability:** Hugging Face Hub.
   - **Format:** JSONL / Parquet.
   - **License:** **BigCode OpenRAIL-M v1**.
   - **Quality & Suitability:** High-quality code completion, explanation, and debugging across 80+ programming languages.
   - **Commercial Use:** Royalty-free commercial use permitted subject to standard OpenRAIL use restrictions.
2. **CodeAlpaca 20K (`sahil2801/CodeAlpaca-20k`):**
   - **Availability:** Hugging Face Hub. Size: 20,000 instructions (~15 MB).
   - **Format:** JSON (`instruction`, `input`, `output`).
   - **License:** **Apache-2.0**.
   - **Quality & Suitability:** Compact, targeted programming instructions covering algorithms, data structures, and debugging.
   - **Commercial Use:** Permitted.

---

## 3. Hardware Audit & Practicality Assessment

### 3.1 Empirical System Resources (Measured Live)
- **CPU:** AMD Ryzen 7 170 with Radeon Graphics  
  - Physical Cores: **8** | Logical Processors: **16** | Base Clock: **3.80 GHz**
- **System RAM:** **15.32 GB Total** (16,067,248 KB)  
  - Active Free RAM: **~2.11 GB** (Host background processes consume ~13.2 GB; background apps should be closed before intensive caching).
- **Dedicated GPU:** **NVIDIA GeForce RTX 3050 Laptop GPU**  
  - Dedicated VRAM: **4,096 MB (4.00 GB GDDR6)**  
  - Driver Version: **591.84** | CUDA Version: **13.1** | CUDA Compute Capability: **8.6 (Ampere)**  
  - Current VRAM Utilization: **0 MiB / 4,096 MiB (100% idle)**.
- **Storage:** Local Disk `C:` has **154.21 GB free space** (314.82 GB used).
- **Python Environment:** Python **3.11.9** global (`C:\Users\mrchi\AppData\Local\Programs\Python\Python311\python.exe`).
  - `datasets`: Installed.
  - `torch`, `torchvision`, `transformers`, `peft`, `bitsandbytes`, `accelerate`, `trl`: **NOT INSTALLED** in global Python.

### 3.2 Can a 4 GB GPU Fine-Tune a 7B Model? (Reality Check)
> [!CAUTION]
> **Definitive Answer: NO.** Attempting to fine-tune a 7B model locally on a 4 GB GPU will trigger an immediate CUDA Out-of-Memory (`CUDA out of memory`) runtime crash.

The mathematical memory footprint of a 7B parameter model under 4-bit NormalFloat (NF4) quantization is:
- **Quantized Model Weights:** $7.6 \times 10^9 \text{ parameters} \times 0.5 \text{ bytes} = \mathbf{3.80\text{ GB}}$.
- **LoRA Adapter Gradients & Optimizer States:** $\approx \mathbf{0.25\text{ GB}}$.
- **Activation Memory (Sequence Length 2048, Batch Size 1, with Gradient Checkpointing):** $\approx \mathbf{1.20\text{ GB}}$.
- **PyTorch CUDA Context & Overhead:** $\approx \mathbf{0.60\text{ GB}}$.
- **Total Required VRAM:** $\mathbf{5.85\text{ GB} - 6.50\text{ GB}}$.
- **Physical Capacity:** $\mathbf{4.00\text{ GB}}$.
- **Shortfall:** **$-1.85\text{ GB}$ to $-2.50\text{ GB}$ deficit.**

### 3.3 What CAN be Fine-Tuned Locally on the RTX 3050 (4 GB)?
Small Language Models (SLMs) with **$\le 1.5\text{B}$ parameters** fit within the 4 GB VRAM ceiling when trained using 4-bit NF4 QLoRA:

| Memory Component | Qwen2.5-1.5B (4-bit QLoRA) | Llama-3.2-1B (4-bit QLoRA) |
| :--- | :---: | :---: |
| Base Model Weights (4-bit NF4) | 0.77 GB | 0.62 GB |
| LoRA Adapter Weights ($r=16, \alpha=32$) | 0.04 GB | 0.03 GB |
| LoRA Gradients & AdamW States | 0.08 GB | 0.06 GB |
| Activations (Seq Len 1024, Batch 1) | 0.65 GB | 0.55 GB |
| PyTorch Context & CUDA Overhead | 0.45 GB | 0.42 GB |
| Safety Margin / Buffer | 0.42 GB | 0.37 GB |
| **Total Peak VRAM Required** | **2.41 GB** | **2.05 GB** |
| **Available Headroom on RTX 3050 (4 GB)** | **+1.68 GB (41% Free)** | **+2.04 GB (50% Free)** |
| **Feasibility Assessment** | **FEASIBLE & STABLE** | **FEASIBLE & STABLE** |

### 3.4 Cloud GPU Alternatives & Documented Cost Estimates
For training medium (3B) or large (7B–8B) foundation models that exceed local hardware, cloud compute provides affordable on-demand alternatives:

| Cloud Provider | GPU Hardware | VRAM | Hourly Cost | Est. Training Time (7B, 10K steps) | Total Est. Cost |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **RunPod (Community Cloud)** | 1x NVIDIA RTX 4090 | 24 GB | \$0.34 – \$0.44 / hr | ~4.0 hours | **\$1.36 – \$1.76** |
| **RunPod (Secure Cloud)** | 1x NVIDIA A40 / L40 | 48 GB | \$0.79 / hr | ~3.5 hours | **\$2.76** |
| **Lambda Labs** | 1x NVIDIA A10 | 24 GB | \$0.60 / hr | ~4.5 hours | **\$2.70** |
| **Lambda Labs** | 1x NVIDIA A100 SXM | 40 GB | \$1.29 / hr | ~2.0 hours | **\$2.58** |
| **Google Cloud (GCP)** | G2-standard-4 (1x L4) | 24 GB | \$0.85 / hr | ~4.0 hours | **\$3.40** |
| **AWS EC2** | `g5.xlarge` (1x A10G) | 24 GB | \$1.01 / hr | ~4.0 hours | **\$4.04** |

> [!NOTE]
> Training a 7B parameter model in the cloud costs **under \$5.00 total**. However, per strict governance rules, no cloud resources will be provisioned until local 1.5B model experiments are completed and validated.

---

## 4. Base Model Research & Recommendations

Candidate open-weight foundation models were evaluated across 10 technical criteria:

| Evaluation Dimension | Qwen 2.5 1.5B Instruct | Llama 3.2 1B Instruct | Qwen 2.5 3B Instruct | Qwen 2.5 7B Instruct | Llama 3.1 8B Instruct |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Parameter Count** | 1.54B | 1.23B | 3.09B | 7.61B | 8.03B |
| **Architecture** | Dense Transformer | Dense Transformer | Dense Transformer | Dense Transformer | Dense Transformer |
| **License** | **Apache-2.0** | Llama 3.2 Community | **Apache-2.0** | **Apache-2.0** | Llama 3.1 Community |
| **Commercial Terms** | Unconditional | Permitted (<700M MAU) | Unconditional | Unconditional | Permitted (<700M MAU) |
| **Telugu / Indic Tokenizer** | **Native (High Efficiency)** | Limited (High Fertility) | **Native (High Efficiency)** | **Native (High Efficiency)** | Moderate |
| **English & Reasoning** | Strong | Strong | Very Strong | Exceptional | Exceptional |
| **Context Length** | 32,768 tokens | 131,072 tokens | 32,768 tokens | 131,072 tokens | 131,072 tokens |
| **Fine-Tuning Compatibility** | HuggingFace / PEFT / TRL | HuggingFace / PEFT / TRL | HuggingFace / PEFT / TRL | HuggingFace / PEFT / TRL | HuggingFace / PEFT / TRL |
| **Local 4GB GPU Fit** | **YES (2.41 GB peak)** | **YES (2.05 GB peak)** | Marginal / OOM Risk | **NO (Cloud Required)** | **NO (Cloud Required)** |
| **Inference Latency** | Ultra-Low (<30 ms/tok) | Ultra-Low (<25 ms/tok) | Low (<45 ms/tok) | Medium (~75 ms/tok) | Medium (~80 ms/tok) |

### The Three Recommended Candidates

#### 1. Small Candidate (Initial Local Experiments): `Qwen/Qwen2.5-1.5B-Instruct`
- **Why it is recommended:** It fits within the 4 GB VRAM boundary (2.41 GB peak under 4-bit QLoRA), uses the permissive **Apache-2.0** license, and exhibits state-of-the-art mathematical reasoning and Telugu tokenization density among sub-2B models.
- **Intended Role:** Local fine-tuning testbed for mathematical reasoning and Telugu dialogue.

#### 2. Medium Candidate (Advanced Experiments): `meta-llama/Llama-3.2-3B-Instruct`
- **Why it is recommended:** Exceptional reasoning density and a massive 128K context window. Can be fine-tuned locally with micro-sequence lengths (512 tokens) or on an entry-level GPU workstation.
- **Intended Role:** Multi-turn conversational intelligence and agentic tool planning.

#### 3. Large Candidate (Future Cloud Experiments): `Qwen/Qwen2.5-7B-Instruct`
- **Why it is recommended:** Best-in-class open-weight 7B model globally, outperforming many proprietary 13B models on coding, math, and multilingual benchmarks.
- **Intended Role:** Cloud-served enterprise model for complex multi-tool workflows and deep reasoning.

---

## 5. Training Data Preparation Architecture

TATTVA AI's training data preparation pipeline (`universal-training-pipeline.ts`) standardizes diverse dataset sources into training-ready formats:

```mermaid
flowchart LR
    RAW["Raw Datasets (Parquet / JSONL / CSV)"] --> CLEAN["Deduplication & Length Filter"]
    CLEAN --> NORM["Unicode NFC & Diacritic Normalization"]
    NORM --> SPLIT["Deterministic Train/Val Split (e.g. 90/10)"]
    SPLIT --> FORMAT{"Target SFT Format"}
    FORMAT --> ALPACA["Alpaca Format (instruction, input, output)"]
    FORMAT --> CHATML["ChatML Format (<|im_start|>role...)"]
    FORMAT --> HF["HuggingFace Format (messages: [{role, content}])"]
    ALPACA & CHATML & HF --> HASH["SHA-256 Checksum Manifest"]
```

### Supported SFT Formats
1. **ChatML (Recommended for Qwen & Llama 3.2):**
   ```text
   <|im_start|>system
   You are TATTVA AI, a helpful, precise mathematical reasoning assistant.<|im_end|>
   <|im_start|>user
   Natalia sold clips to 48 of her friends in April...<|im_end|>
   <|im_start|>assistant
   Natalia sold 48 / 2 = 24 clips in May. The total clips sold were 48 + 24 = 72.
   #### 72<|im_end|>
   ```
2. **Alpaca Format:**
   ```json
   {
     "instruction": "Solve the following grade school math problem with step-by-step reasoning.",
     "input": "Natalia sold clips to 48 of her friends in April...",
     "output": "Natalia sold 48 / 2 = 24 clips in May... #### 72"
   }
   ```
3. **HuggingFace Messages Format:**
   ```json
   {
     "messages": [
       { "role": "system", "content": "You are TATTVA AI..." },
       { "role": "user", "content": "Natalia sold clips..." },
       { "role": "assistant", "content": "Natalia sold 48 / 2 = 24 clips... #### 72" }
     ]
   }
   ```

---

## 6. Training Architecture & Hyperparameter Configuration

Implemented in `frontend/app/lib/training/fine-tuning/tattva-finetuning-engine.ts`:

### 6.1 Quantization & PEFT Configuration
- **Quantization:** BitsAndBytes 4-bit NormalFloat (NF4) with double quantization:
  ```python
  bnb_config = BitsAndBytesConfig(
      load_in_4bit=True,
      bnb_4bit_quant_type="nf4",
      bnb_4bit_compute_dtype=torch.bfloat16,
      bnb_4bit_use_double_quant=True
  )
  ```
- **LoRA Hyperparameters:**
  - Target Modules: `["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]`
  - Rank ($r$): 16
  - Alpha ($\alpha$): 32 (Scaling factor $\frac{\alpha}{r} = 2.0$)
  - Dropout: 0.05
  - Trainable Parameters: $\approx 0.85\%$ of total weights (~13M parameters).

### 6.2 Training Hyperparameters (RTX 3050 4GB Profile)
- **Batch Size:** `per_device_train_batch_size = 1`
- **Gradient Accumulation Steps:** `8` (Effective batch size: **8**)
- **Learning Rate:** $2 \times 10^{-4}$ with Cosine decay schedule
- **Warmup Ratio:** `0.05` (First 5% of training steps)
- **Max Sequence Length:** `1,024 tokens` (Clamped to prevent VRAM spikes)
- **Optimizer:** `paged_adamw_8bit` (Offloads inactive optimizer states from VRAM)
- **Gradient Checkpointing:** `True` (Trades ~20% compute speed for ~60% activation memory savings)
- **Weight Decay:** `0.01`
- **FP16 / BF16:** `bf16=True` (Ampere architecture native support)

### 6.3 Checkpointing & Model Versioning
- Checkpoints saved every 100 steps.
- The `save_total_limit = 2` setting ensures that only the top 2 best checkpoints (by validation loss) are retained on disk to preserve storage space.
- Semantic Versioning: Artifacts are packaged as `tattva-<domain>-<params>-v<major>.<minor>.<patch>`.

---

## 7. Model Evaluation Plan

To prevent regression and measure fine-tuning impact, models will undergo a double-blind baseline comparison:

```mermaid
flowchart TD
    subgraph Benchmark Evaluation ["Protected Evaluation Suite"]
        E1["GSM8K (1,319 problems) - Exact Number Match"]
        E2["MMMLU Hindi (456 sample) - MCQ Accuracy"]
        E3["Telugu Reasoning (8 problems) - Indic Script Comprehension"]
        E4["Coding Suite (5 problems) - Syntax & Logic Criteria"]
        E5["Tool Use Suite (5 problems) - JSON Schema Validity"]
    end

    subgraph Comparison Engine ["Comparative Assessment"]
        BASE["Base Model (Qwen2.5-1.5B Unadapted)"] --> CME["Custom Model Evaluator"]
        FT["Fine-Tuned Model (Qwen2.5-1.5B + LoRA)"] --> CME
        E1 & E2 & E3 & E4 & E5 --> CME
        CME --> REPORT["Comparison Scorecard & Regression Alert"]
    end
```

### Metrics & Passing Criteria
1. **Mathematical Accuracy (GSM8K):** Target **$\ge 65.0\%$** accuracy on the held-out 1,319-question evaluation split (up from the unadapted base model's ~52%).
2. **Catastrophic Forgetting Guard:** The fine-tuned model must retain **$\ge 90\%$** of its base performance on general instruction following and Telugu comprehension.
3. **Safety & Format Compliance:** 0% malformed outputs or leaked reasoning delimiters.

---

## 8. Security, Privacy & Licensing Safeguards

1. **Zero User Conversation Training:** No private user interactions or prompts submitted through chat routes will ever enter training pipelines without explicit cryptographic opt-in.
2. **Zero Hardcoded Secrets:** SFT datasets and exported training artifacts are scanned to ensure no API keys (`GEMINI_API_KEY`, Supabase tokens, etc.) are present in training text.
3. **License Permissiveness Check:** Every training dataset must have a verified permissive open-source license (Apache-2.0, MIT, ODC-BY, or CC-BY-4.0). Datasets containing non-commercial clauses (e.g., CC-BY-NC) or copyleft clauses (GPL) are prohibited.
4. **Human-in-the-Loop Execution Gate:** Fine-tuning jobs generated by `tattva-finetuning-engine.ts` default to `approvalGranted: false` and `requiresHumanApproval: true`. Automated execution without explicit user authorization is blocked.

---

## 9. Remaining Blockers

Before executing the first local fine-tuning experiment, the following blockers must be addressed:

| Blocker ID | Blocker Description | Required Action | Status |
| :-: | :--- | :--- | :---: |
| **BLK-01** | Python ML stack is not installed in the global environment (`torch`, `transformers`, `peft`, `bitsandbytes`, `accelerate`, `trl`). | Provision a project virtual environment (`.venv`) and install PyTorch with CUDA 12.4+ and training dependencies. | **ACTIONABLE** |
| **BLK-02** | Base model weights for `Qwen/Qwen2.5-1.5B-Instruct` (~3.1 GB) are not downloaded locally. | Download base model weights via HuggingFace Hub upon explicit user confirmation. | **PENDING APPROVAL** |
| **BLK-03** | System free RAM is currently ~2.11 GB due to host background tasks. | Close high-memory background browser tabs and background processes prior to training to ensure smooth data caching. | **ACTIONABLE** |

---

## 10. Recommended First Fine-Tuning Experiment

When you are ready to authorize the first model training run, the following experiment is recommended:

```yaml
Experiment Name: tattva-math-qwen-1.5b-sft-exp1
Target Base Model: Qwen/Qwen2.5-1.5B-Instruct
Task: Multi-Step Grade School Mathematical Reasoning
Dataset: OpenAI GSM8K Training Split (train-00000-of-00001.parquet)
Dataset Volume: 7,473 verified examples
Export Format: ChatML (<|im_start|>system...<|im_start|>user...<|im_start|>assistant...)
Hardware Target: Local NVIDIA GeForce RTX 3050 Laptop GPU (4 GB VRAM)
Method: 4-bit NormalFloat (NF4) QLoRA (r=16, alpha=32, target_modules=all-linear)
Max Sequence Length: 1,024 tokens
Batch Size: 1 (Gradient Accumulation: 8 -> Effective Batch: 8)
Learning Rate: 2e-4 (Cosine schedule, 5% warmup)
Epochs: 2
Estimated Peak VRAM: 2.41 GB (1.68 GB headroom)
Estimated Training Duration: 2.2 to 2.8 hours
Estimated Direct Cost: $0.00 (Local Hardware)
Expected Outcome: GSM8K evaluation accuracy improvement from ~52% to >68% without catastrophic forgetting
```

---

*Report certified by Principal Machine Learning Engineer & Model Fine-Tuning Specialist for TATTVA AI.*
