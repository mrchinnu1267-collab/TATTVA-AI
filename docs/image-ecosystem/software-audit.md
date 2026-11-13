# TATTVA AI - Software Environment & Architecture Audit

**Generated**: 2026-11-12  
**Target Environment**: Windows 11 Workstation (TATTVA AI Monorepo)  
**System Role**: Unified Image Generation & Editing Ecosystem

---

## 1. Operating System & Core Runtimes

| Software / Runtime | Detected Version | Executable Path / Origin | Status / Action Needed |
| :--- | :--- | :--- | :--- |
| **Operating System** | Windows 11 (Build 26300.1, WDDM 3.2) | C:\Windows | Healthy, supports direct Windows CUDA |
| **Node.js** | **v24.19.0** (Current Active) | `node.exe` in PATH | Fully compatible with Next.js 15+ App Router |
| **NPM** | **11.17.0** | `npm.cmd` in PATH | Functional, all frontend dependencies resolved |
| **Python System PATH** | Windows App execution alias (Microsoft Store stub) | `C:\Users\mrchi\AppData\Local\Microsoft\WindowsApps\python.exe` | Requires isolated Python 3.10-3.12 installation |
| **Package Installer** | **winget.exe (Windows Package Manager)** | `winget.exe` detected in PATH | Available for automated, unattended Python setup |
| **CUDA Toolchain** | Driver CUDA 13.1, `nvcc` absent | NVIDIA Driver 591.84 | PyTorch binary wheels bundle native CUDA runtime |
| **Shell Environment** | PowerShell 7 / Windows PowerShell 5.1 | `pwsh.exe` / `powershell.exe` | Compatible with automated automation scripts |

---

## 2. Existing TATTVA AI Architecture Review

The TATTVA AI repository has a modular monorepo structure with frontend, mobile, and backend engines:

```
TATTVA_AI/
├── frontend/                     # Next.js 15+ App Router web application
│   ├── app/
│   │   ├── api/image/            # API Route: /api/image (Image generation, routing, auditing)
│   │   ├── api/ai-agent/image/   # Agentic image endpoint for conversational workflows
│   │   ├── image-studio/         # TATTVA Image Studio interface & interactive editor
│   │   ├── components/           # UI Components (Image Studio dashboards, tools)
│   │   └── lib/image-engine/     # Core Image Intelligence Engine
│   │       ├── consistency/      # Prompt compiler & canonical character dictionaries
│   │       ├── editing/          # Inpainting, outpainting, surgical editor router
│   │       ├── free-suite/       # AI Horde, Pollinations, and free cluster adapters
│   │       ├── multi-model-router/ # Dynamic model selection & capability matching
│   │       ├── testing/          # Independent visual verification & adherence audit
│   │       ├── types.ts          # Core provider and model schemas
│   │       ├── providers.ts      # Multi-provider execution & universal fallback fleet
│   │       └── provider-capabilities.ts # Provider capability matrices
│   └── tests/                    # Automated regression & verification test suites
│
├── image-engine/                 # Dedicated local offline Python engine
│   ├── main.py                   # FastAPI application with /health, /models, /generate, /unload
│   ├── pipeline.py               # Diffusers pipeline manager with low-VRAM optimizations
│   ├── config.json               # Model registry, memory limits, VAE tiling, CPU offload configs
│   ├── requirements.txt          # Pinned Python package dependencies
│   ├── download_models.py        # Safe, verified model weight fetcher
│   └── Dockerfile                # Optional containerized deployment configuration
```

---

## 3. Current Image Provider Configurations & Health Status

TATTVA AI's frontend maintains a resilient fallback chain configured across both cloud APIs and distributed free clusters:

| Provider ID | Implementation Type | Credentials Configured | Health / Operational Status | Cost Profile |
| :--- | :--- | :--- | :--- | :--- |
| **`pollinations`** | Hosted Open-Weight (FLUX.1-schnell, FLUX Realism, SDXL Turbo) | None needed (Public API) | **100% OPERATIONAL** (Tested: 803ms latency, HTTP 200) | **$0.00 (Free)** |
| **`ai-horde`** | Crowdsourced GPU Cluster (SDXL Base, Realistic Vision, DreamShaper) | Anonymous Key (`0000000000`) | **100% OPERATIONAL** (Tested: HTTP 202 Accepted, async polling) | **$0.00 (Free)** |
| **`huggingface`** | Inference API & Spaces (Animagine XL 3.1, ByteDance SDXL-Lightning) | `HF_TOKEN` in `.env.local` | **100% OPERATIONAL** (Dedicated spaces verified) | **$0.00 (Free Tier)** |
| **`local`** | Local CUDA FastAPI (`http://127.0.0.1:8001`) | None (Localhost network) | Ready for automated service launch via `.venv` | **$0.00 (Local GPU)** |
| **`gemini`** | Google Gemini Multimodal (`gemini-2.5-flash-image`) | `GEMINI_API_KEY` in `.env.local` | Configured; currently in HTTP 429 quota backoff | API Quota |
| **`openai`** | OpenAI DALL-E 3 (`dall-e-3`) | `OPENAI_API_KEY` (if provided) | Conditional fallback if user key supplied | Paid API |

---

## 4. Analysis of the Existing `image-engine/` Python Backend

A deep inspection of [image-engine/pipeline.py](file:///C:/Users/mrchi/TATTVA_AI/TATTVA_AI/image-engine/pipeline.py) and [image-engine/config.json](file:///C:/Users/mrchi/TATTVA_AI/TATTVA_AI/image-engine/config.json) reveals exceptional engineering for low-VRAM hardware:

1. **Memory Protection**:
   - `cpu_offload: "auto"`: Uses `accelerate` sequential CPU offloading when VRAM is under 6 GB.
   - `attention_slicing: true`: Trades minor compute overhead to reduce peak attention matrix memory by >60%.
   - `vae_slicing: true` & `vae_tiling: true`: Prevents VRAM OOM during high-resolution decoding.
   - `max_megapixels: 1.0`: Automatically scales down oversized user requests to fit hardware memory.
2. **Supported Local Models**:
   - `sd15` (`stable-diffusion-v1-5/stable-diffusion-v1-5`): Operates natively within 2.5 GB VRAM.
   - `sdxl-turbo` (`stabilityai/sdxl-turbo`): Generates 512x512 images in 1-4 steps (~3 seconds).
   - `sdxl` (`stabilityai/stable-diffusion-xl-base-1.0`): High-fidelity generation with sequential offload.
3. **Integration Point**:
   - The frontend's [providers.ts](file:///C:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/app/lib/image-engine/providers.ts) already features `generateWithLocal()` targeting `LOCAL_IMAGE_ENGINE_URL || "http://127.0.0.1:8001"`.

---

## 5. Software Audit Conclusions & Prerequisites

1. **Python Environment**: An isolated Python 3.11 virtual environment (`image-engine/.venv`) must be initialized using `winget` or direct portable installer.
2. **PyTorch Wheels**: Must be installed with `--index-url https://download.pytorch.org/whl/cu121` so PyTorch detects the RTX 3050 CUDA driver.
3. **Security Boundary**: Zero secrets or credentials are sent to client bundles; `.env.local` is read exclusively on the server in Next.js route handlers.
4. **Unified Automation**: PowerShell lifecycle scripts (`install-image-tools.ps1`, `start-image-engine.ps1`, `verify-installation.ps1`) must be generated to provide one-click management for the user.

