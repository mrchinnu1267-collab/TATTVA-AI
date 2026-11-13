# TATTVA AI — Current Architecture Audit

> **Document Version:** `2.0.0-audit`  
> **Audit Date:** November 14, 2026  
> **Lead Architect & Maintainer:** kotapati Gowtham Chowdary  
> **Repository Context:** `TATTVA_AI` (Monorepo)  
> **Workspaces:** `frontend/`, `image-engine/`, `android-app/`, `desktop-app/`, `ios-app/`, `docs/`, `.agent/`  

---

## 1. Executive Summary & Foundational Status

TATTVA AI is an advanced, production-deployed multimodal AI platform. It currently operates as an **intelligent AI orchestration and multimodal synthesis platform** utilizing state-of-the-art foundation model APIs (Google Gemini, OpenRouter, Nvidia NIM, Cloudflare Workers AI), local Fast-API microservices, and client applications.

> [!IMPORTANT]
> **Foundational Model Status:** TATTVA AI does **not** currently possess an independently pre-trained foundation model. Claims of proprietary foundation models must not be made until the multi-phase engineering lifecycle (Phases 1 through 5) produces fully evaluated, validated model weights. At present, TATTVA AI's proprietary intellectual property resides in its:
> 1. Multi-tier AI Orchestration & Intent Classification Engine.
> 2. Unified Document Generation & Office XML Compiler.
> 3. Dual-Stream Image Generation & Inpainting Pipeline.
> 4. Multi-Platform Client Layer (Next.js 16 Web, Native Android WebView v1.3 APK, Electron Desktop, Capacitor iOS).

---

## 2. Monorepo Structural Topology

```
TATTVA_AI/
├── .agent/skills/                     # 13 Autonomous Agent Skills
│   ├── single-file-web-app-architect/ # Standalone Web App / Canvas Architect
│   ├── ai-integration/                # Server-Side Model Inference & Routing
│   ├── backend-specialist/            # Supabase API & RLS Security
│   ├── codebase-explorer/             # AST & Relationship Navigation
│   ├── context-manager/               # Session Context & Architectural Handoffs
│   ├── dependency-manager/            # Monorepo Dependency Integrity
│   ├── documentation-generator/       # Technical Docs & API References
│   ├── minimal-code-editor/           # Surgical Code Editor
│   ├── project-memory/                # Architectural State & Milestone Tracker
│   ├── security-auditor/              # CSP, Vault, RLS & Zero-Trust Auditing
│   ├── smart-debugger/                # Root Cause Diagnostics
│   ├── testing-specialist/            # Automated Test Suites & Health Checks
│   └── ui-ux-specialist/              # Tailwind CSS v4 & Framer Motion UI
├── frontend/                          # Primary Production Application (Next.js 16)
│   ├── app/
│   │   ├── api/                       # 79 Server-Side Next.js Route Handlers
│   │   ├── chat/                      # Main Multimodal Chat Interface (8,365 LOC)
│   │   ├── workspace/                 # Enterprise Office Suites (Word, Excel, PPT)
│   │   ├── image-studio/              # Multi-Provider Image Studio
│   │   ├── presentation-studio/       # Interactive Presentation Synthesis
│   │   ├── maps/                      # Satellite Map & Places Explorer
│   │   ├── local-image-generator/     # Local Image Generator Interface
│   │   ├── download/                  # Native App Distribution Portal
│   │   └── lib/
│   │       ├── ai-orchestrator/       # Intent Classifier, Model Router, RAG, Tools
│   │       ├── document-engine/       # DOCX, XLSX, PDF, PPTX, CSV, ZIP Compilers
│   │       ├── image-engine/          # Cloudflare FLUX, Pollinations, Quality Metrics
│   │       ├── supabase.ts            # Client & Admin Supabase SDK Wrappers
│   │       └── auth-redirect.ts       # Cross-Platform Redirect Normalization
├── image-engine/                      # Python Microservice (FastAPI + PyTorch)
│   ├── .venv/                         # Local Python 3.11 Environment
│   ├── main.py                        # FastAPI Image Synthesis API
│   ├── pipeline.py                    # Diffusers Model Loading Pipeline
│   └── requirements.txt               # PyTorch / Diffusers Dependencies
├── android-app/                       # Native Android Application
│   ├── app/src/main/                  # Kotlin WebView Shell, Security Config, Splash
│   └── build.gradle.kts               # Android SDK 35, Min SDK 24 Build Script
├── desktop-app/                       # Electron Native Wrapper
├── ios-app/                           # Capacitor iOS Bridge
└── docs/                              # Architecture & Specifications Repository
```

---

## 3. Current AI Orchestration Engine (`frontend/app/lib/ai-orchestrator`)

The existing AI Orchestrator acts as the central brain of the Next.js runtime.

```
                     ┌───────────────────────────────────┐
                     │          User Request             │
                     └─────────────────┬─────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │  Intent Classifier & Complexity   │
                     │  (Rule Heuristics + Fast Gemini)  │
                     └─────────────────┬─────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐         ┌──────────────────┐          ┌──────────────────┐
│ Document Intent  │         │  Reasoning /     │          │  Agent / Tool    │
│  (XLSX, DOCX,    │         │  General Chat    │          │  Task Dispatch   │
│   PDF, PPTX)     │         │                  │          │                  │
└────────┬─────────┘         └─────────┬────────┘          └─────────┬────────┘
         │                             │                             │
         ▼                             ▼                             ▼
┌──────────────────┐         ┌──────────────────┐          ┌──────────────────┐
│ Document Engine  │         │   Model Router   │          │  Tool Registry   │
│ (Binary Compiler)│         │(Gemini, OpenRtr, │          │(Web, Code, Calc, │
│                  │         │  Nvidia NIM)     │          │ GitHub, DocProc) │
└────────┬─────────┘         └─────────┬────────┘          └─────────┬────────┘
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │   Synthesized Unified Response    │
                     │   (Text, Stream, Binary Cards)    │
                     └───────────────────────────────────┘
```

### Components:
1. **`intent-classifier.ts`**: Evaluates prompt semantics, classifies into 13 `TaskIntent` categories, and scores complexity (1–10).
2. **`model-router.ts`**: Multi-provider dispatcher routing between Google Gemini (`gemini-3.5-flash-lite`, `gemini-3.6-flash`), OpenRouter (`llama-3.3-70b`, `deepseek-r1`), and Nvidia NIM.
3. **`tools/`**: Tool execution suite:
   - `web-search.ts`: Real-time grounding via Google Search API.
   - `code-runner.ts`: JavaScript/Python syntax verification.
   - `data-calculator.ts`: Mathematical evaluation.
   - `document-processor.ts`: Extraction and parsing.
   - `github-inspector.ts`: Repository structure inspection.
4. **`document-engine/`**: In-house binary compilation pipeline:
   - `docx.ts`: Native OpenXML Word generator with styled headings and tables.
   - `xlsx.ts`: Multi-sheet spreadsheet generator with live formulas (`SUM`, `AVERAGE`, `COUNTIF`).
   - `pdf.ts` & `pptx.ts`: Presentation and PDF synthesis.
   - `zip.ts`: Complete code archive packaging.

---

## 4. Hardware & Compute Environment Audit

Audit conducted on the active development workstation on **November 14, 2026**:

| Metric | Specification | Engineering Assessment |
| :--- | :--- | :--- |
| **Operating System** | Windows 11 Home 64-bit | Local dev host. Docker/WSL2 required for Linux training runs. |
| **CPU** | AMD Ryzen 7 170 (8 Cores, 16 Threads) | High performance for data pre-processing, tokenization & synthetic data. |
| **System RAM** | 16.0 GB DDR (15.32 GB visible, ~2.0 GB free) | Constraint: Heavy in-memory training of models >1B will OOM without swap/quantization. |
| **Discrete GPU** | NVIDIA GeForce RTX 3050 Laptop GPU | Ada/Ampere architecture with Tensor Cores. |
| **GPU VRAM** | **4,096 MiB (4.0 GB) GDDR6** | **Critical constraint:** Restricts local training to small models ($\le 125\text{M}$ dense or $\le 1\text{B}$ with INT4/QLoRA). |
| **CUDA Version** | 13.1 (Driver: 591.84) | Modern CUDA runtime; compatible with PyTorch 2.x and FlashAttention-2. |
| **Local Disk** | NVMe SSD: 153.81 GB Free of 293.6 GB | Sufficient for staging small datasets ($\le 20\text{GB}$) and small checkpoints. |

---

## 5. Security & Authentication Audit

1. **Authentication Architecture**:
   - Supabase Auth handles Google OAuth, Email/Password, Password Reset, and Guest sessions.
   - Unified redirection via `app/lib/auth-redirect.ts` resolves mobile browser environments (`localhost:3000` redirect bug resolved).
2. **Secrets & Keys**:
   - Strictly protected via server-side Next.js route handlers (`.env.local`).
   - Zero secrets leaked into public client bundles.
3. **Row-Level Security (RLS)**:
   - Database tables (`chats`, `messages`, `memory_records`, `files`) isolated by `user_id = auth.uid()`.
