# TATTVA AI — Universal Model Registry & Catalog

> **Registry Version:** `2.0.0-catalog`  
> **Status:** Live Dynamic Catalog  
> **Lead Architect & Maintainer:** kotapati Gowtham Chowdary  
> **Design Pattern:** Provider-Independent Capability Abstraction  

---

## 1. Registry Architecture & Credential Isolation

Every model provider in the TATTVA AI ecosystem requires its **own independent credential and API configuration**. 

> [!WARNING]
> **Strict Credential Boundary:** One provider's API key (e.g., `GEMINI_API_KEY`) **never** grants access to other providers (e.g., `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`). Each adapter validates its own environment secrets before advertising availability.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               MODEL REGISTRY METADATA SCHEMA                           │
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ id                   │ Unique system identifier (e.g. "gemini-3.6-flash")              │
│ name                 │ Human-readable display label                                    │
│ provider             │ "gemini" | "anthropic" | "openai" | "openrouter" | "tattva"    │
│ parameters           │ Parameter scale (e.g. "125M", "1B", "70B", "Undisclosed")       │
│ contextWindow        │ Maximum token context length (tokens)                           │
│ maxOutputTokens      │ Maximum generated completion tokens                             │
│ latencyTier          │ "ultra_low" (<300ms) | "low" (<800ms) | "medium" | "high"       │
│ modalities           │ Input/Output types: ["text", "code", "image", "audio", "video"] │
│ pricingPer1MTokens   │ Input cost / Output cost in USD                                 │
│ status               │ "production" | "experimental" | "planned" | "offline"           │
│ requiredEnvKey       │ Target environment variable needed to activate provider         │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

---

## 2. External Frontier Foundation Models

### Google Gemini Fleet
| Model ID | Context | Modalities | Latency Tier | Input / Output per 1M | Primary Strengths | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `gemini-3.5-flash-lite` | 1,048,576 | Text, Code, Image, Audio, Video | Ultra Low | $0.075 / $0.30 | High-speed chat, intent classification, summarization | **Production** |
| `gemini-3.6-flash` | 1,048,576 | Text, Code, Image, Audio, Video | Low | $0.15 / $0.60 | Complex reasoning, mathematics, coding, tool orchestration | **Production** |
| `gemini-2.5-pro` | 2,097,152 | Text, Code, Image, Audio, Video | Medium | $1.25 / $5.00 | Massive document analysis, multi-hour video research | **Production** |

*Required Credential:* `GEMINI_API_KEY`

---

### Anthropic Claude Fleet
| Model ID | Context | Modalities | Latency Tier | Input / Output per 1M | Primary Strengths | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `claude-3-5-haiku-20241022` | 200,000 | Text, Code | Low | $0.80 / $4.00 | Rapid coding, structured JSON, tool execution | **Adapter Ready** |
| `claude-3-5-sonnet-20241022` | 200,000 | Text, Code, Image | Medium | $3.00 / $15.00 | Frontier coding, architectural design, mathematical proofs | **Adapter Ready** |

*Required Credential:* `ANTHROPIC_API_KEY`

---

### OpenAI Fleet
| Model ID | Context | Modalities | Latency Tier | Input / Output per 1M | Primary Strengths | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `gpt-4o-mini` | 128,000 | Text, Code, Image | Low | $0.15 / $0.60 | Fast multimodal dialog, translation, general tasks | **Adapter Ready** |
| `gpt-4o` | 128,000 | Text, Code, Image, Audio | Medium | $2.50 / $10.00 | Complex multimodal reasoning, vision, cross-domain coding | **Adapter Ready** |
| `o1-mini` / `o3-mini` | 128,000 | Text, Code | High (Reasoning) | $1.10 / $4.40 | Extended Chain-of-Thought math and algorithm synthesis | **Adapter Ready** |

*Required Credential:* `OPENAI_API_KEY`

---

### Open-Source Frontier Fleet (via OpenRouter / vLLM / Nvidia NIM)
| Model ID | Context | Modalities | Latency Tier | Input / Output per 1M | Primary Strengths | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `meta-llama/llama-3.3-70b-instruct` | 131,072 | Text, Code | Medium | $0.12 / $0.30 | Open-weights baseline, coding, general reasoning | **Production** |
| `deepseek/deepseek-r1` | 65,536 | Text, Code | Medium | $0.55 / $2.19 | Open reasoning, competitive with o1 on math benchmarks | **Production** |
| `qwen/qwen-2.5-coder-32b-instruct` | 131,072 | Text, Code | Low | $0.18 / $0.50 | Specialized code synthesis, repo analysis, test writing | **Production** |

*Required Credential:* `OPENROUTER_API_KEY` or `NVIDIA_API_KEY`

---

## 3. Proprietary TATTVA Model Fleet (Development Roadmap)

> [!IMPORTANT]
> In strict adherence to scientific accuracy, TATTVA models are marked **Planned / Under Development** until their weights have been fully pre-trained, validated, and evaluated.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              TATTVA PROPRIETARY MODEL SPECIFICATION                    │
├──────────────────┬───────────┬──────────────┬──────────────┬───────────────────────────┤
│ Model ID         │ Scale     │ Architecture │ Target Date  │ Primary Application       │
├──────────────────┼───────────┼──────────────┼──────────────┼───────────────────────────┤
│ tattva-micro-125m│ 125M      │ Dense Transf │ Phase 1 (Q1) │ Scaling proxy & tokenizer │
│ tattva-code-1b   │ 1.1B      │ Dense + MTP  │ Phase 5 (Q2) │ Specialized coding SLM    │
│ tattva-math-1b   │ 1.1B      │ Dense + RLVR │ Phase 6 (Q2) │ Symbolic math derivation  │
│ tattva-omni-2b   │ 2.4B      │ Multimodal   │ Phase 5 (Q3) │ Vision-language assistant │
│ tattva-moe-8x1b  │ 8B (2B act)│ Sparse MoE  │ Phase 4 (Q4) │ High-capacity general SLM │
└──────────────────┴───────────┴──────────────┴──────────────┴───────────────────────────┘
```

### 1. `tattva-micro-125m` (Experimental Proxy)
* **Architecture:** 12 layers, 768 hidden dimension, 12 attention heads, Rotary Position Embeddings (RoPE), SwiGLU activations, 128k BPE vocabulary.
* **Compute Target:** Trainable locally on the NVIDIA RTX 3050 Laptop GPU (4GB VRAM) using PyTorch 2.x and BF16 mixed precision.
* **Purpose:** Validate loss convergence, $\mu$P scaling, and checkpoint recovery mechanics.

### 2. `tattva-code-1b` (Specialized Coding SLM)
* **Architecture:** 24 layers, 2048 hidden dimension, 16 heads, Multi-Query Attention (MQA), Multi-Token Prediction (MTP) head for $t+1, t+2$.
* **Training Data:** 500 Billion tokens of curated, deduplicated source code (Python, TypeScript, Go, Rust, C++).
* **Serving Target:** 4-bit quantized deployment via ONNX Runtime and vLLM.

### 3. `tattva-math-1b` (Mathematical Reasoning with RLVR)
* **Architecture:** Compact dense transformer optimized for step-by-step symbolic derivation and Lean4 formal theorem checking.
* **Post-Training:** Group Relative Policy Optimization (GRPO) using automated Python SymPy execution rewards.
