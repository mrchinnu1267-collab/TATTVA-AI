# TATTVA AI — Existing Architecture Audit

> **Document Version:** `1.0.0-audit`  
> **Audit Date:** 2026-11-12  
> **Lead Architect & Maintainer:** kotapati Gowtham Chowdary  
> **Repository Context:** `TATTVA_AI` (Monorepo)  
> **Primary Workspaces:** `frontend/`, `image-engine/`, `android-app/`, `desktop-app/`, `ios-app/`  

---

## 1. Executive Summary & Monorepo Topology

TATTVA AI is structured as a full-stack, multimodal intelligence monorepo. It encompasses a web application, native mobile and desktop shells, an offline Python FastAPI image engine, and an automated agent skill suite.

```
TATTVA_AI/
├── .agent/skills/                   # 12 Modular Antigravity/Agent Skills
├── frontend/                        # Core Web Application (Next.js 16, Turbopack, React 19)
│   ├── app/                         # App Router: Pages, 79 Route Handlers, Layouts, UI Components
│   │   ├── api/                     # 79 Server-Side API Handlers (REST & Streaming)
│   │   ├── chat/                    # Main Multimodal Chat Interface (8,284 LOC)
│   │   ├── workspace/               # Enterprise Workspace Suite (Word, Excel, PPT, Outlook)
│   │   ├── image-studio/            # Dedicated Certified AI Image Studio UI (Phases A-W)
│   │   ├── presentation-studio/     # Interactive Presentation Synthesis & Viewer UI
│   │   ├── maps/                    # Satellite Map & Google Places Explorer
│   │   ├── local-image-generator/   # Local FastAPI Image Generator UI
│   │   ├── download/                # Native APK & Desktop App Distributables
│   │   ├── lib/                     # Core Business Logic & Engine Subsystems
│   │   │   ├── ai-orchestrator/     # Intent Classification, Model Routing, Reasoning, Tools
│   │   │   ├── image-engine/        # 25 Modules: Certification, Regression, Inpainting, LoRA
│   │   │   ├── document-engine/     # Office OpenXML & Python Bridge File Generators
│   │   │   ├── context-engine/      # Multi-turn Context Management & Summarization
│   │   │   ├── human-intelligence/  # Empathetic Alignment, Clarification & Safety Formatting
│   │   │   ├── mcp/                 # Model Context Protocol (Claude Connectors & SSRF Guard)
│   │   │   ├── security/            # Token Encryption (AES-256-GCM), CSP, Rate Limiting
│   │   │   └── memory-service.ts    # Short/Long-Term Memory Storage & Vector Embeddings
│   │   └── components/              # Modular UI Components (Workspace, Image Studio, Modals)
│   ├── tests/                       # 40 Test Suites covering Phases A-W, SSRF, Office Bridge
│   ├── supabase_*.sql               # Database Schemas (Memory, RLS Security, Workspace Apps)
│   └── package.json                 # Next.js 16.4.3, React 19.3.1, Tailwind CSS ^4.3.3
├── image-engine/                    # Standalone Python FastAPI AI Image Pipeline
│   ├── main.py                      # FastAPI App (SDXL, SD 2.0 Inpainting, ControlNet)
│   ├── pipeline.py                  # PyTorch Diffusers Inference Pipelines (FP16/FP8)
│   ├── download_models.py           # Automated Hugging Face Model Weight Fetcher
│   └── Dockerfile                   # CUDA 12.1 Container Configuration
├── android-app/                     # Native Android Application (Kotlin, Gradle 8.x)
├── desktop-app/                     # Desktop Application (Electron Wrapper)
└── ios-app/                         # iOS Application (Capacitor Container)
```

---

## 2. Frontend & Backend Architecture

### 2.1 Web Application Framework
* **Next.js Version:** `16.4.3` utilizing App Router and Turbopack compiler.
* **UI Engine:** React `19.3.1`, React DOM `19.3.1`.
* **Styling & Layout:** Tailwind CSS `^4.3.3` with PostCSS, Lucide React icons (`1.66.0`), and Framer Motion (`14.9.0`).
* **Design Language:** Minimalist, high-density light-theme preference with dark-mode toggle; neutral slate/zinc color palette.

### 2.2 Entry Routes
1. `/chat`: Main general intelligence interface handling text, code, document uploads, vision, direct file downloads, and memory inspection.
2. `/workspace`: Seven integrated productivity applications (Word Editor, Excel Spreadsheet, PowerPoint Studio, Outlook Email Client, Smart Canvas, Project Manager, Research Lab).
3. `/image-studio`: Production-certified Image Studio (Phases A through W) featuring Prompt Compiler, Conditioning, Consistency, Regression Gatekeeper, and Model Health Watcher.
4. `/presentation-studio`: Dedicated presentation generation, editing, and slide deck previewer.
5. `/maps`: OpenStreetMap & Leaflet satellite map interface with Google Places intelligence and local photo retrieval.
6. `/local-image-generator`: Client dashboard connecting directly to the local FastAPI image engine on `http://127.0.0.1:8000`.
7. `/auth`, `/login`, `/register`, `/create-account`, `/reset-password`: Authentication lifecycle screens.

### 2.3 Backend API Architecture
The backend is composed of **79 Next.js Route Handlers** running in `nodejs` runtime with configured timeouts (`maxDuration = 60s`).
* Dispatcher: `/api/chat/route.ts` orchestrates clock grounding, weather grounding, BYOK custom model routing, Claude MCP connector execution, and dispatches to `MasterAIOrchestrator`.
* Document Generation: `/api/generate-document` and `/api/download-document` interface with the Document Engine.
* Image Operations: 20+ specialized routes under `/api/image/*` (accurate, benchmark, certification, edit, learning, maintenance, monitoring, nextgen, regression, storage, upscale, validation).
* Connectors: `/api/connectors/*` handles OAuth flows, MCP server execution, and tool discovery.

---

## 3. Existing AI Providers & Integrations

TATTVA AI currently interfaces with several cloud and local model providers:

| Provider | Integration Type | Active Models | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Google Gemini** | `@google/genai` SDK | `gemini-3.5-flash-lite`<br>`gemini-3.6-flash`<br>`gemini-3.8-flash`<br>`gemini-2.5-flash-image`<br>`gemini-embedding-001` | Fast conversation, deep reasoning, coding, document synthesis, native multimodal vision, 3072-dim embeddings. |
| **OpenRouter** | OpenAI-compatible REST API | `meta-llama/llama-3.3-70b-instruct:free`<br>`deepseek/deepseek-r1:free` | Open-source LLM routing, complex mathematical reasoning, and logical problem solving. |
| **Nvidia NIM** | OpenAI-compatible REST API | `meta/llama-3.1-70b-instruct` | High-throughput enterprise LLM inference with low latency. |
| **Anthropic Claude** | Messages API via MCP | `claude-3-5-sonnet-20241022` | Model Context Protocol (MCP) tool execution, code analysis, structured tool use. |
| **Hugging Face** | Serverless / Dedicated Spaces | `black-forest-labs/FLUX.1-schnell`<br>`stabilityai/stable-diffusion-xl-base-1.0` | Diffusion text-to-image and secondary fallback rendering. |
| **Pollinations AI** | Zero-Auth REST Endpoint | `flux`, `turbo` | Unauthenticated public fallback image generation. |
| **Local Diffusers** | Python FastAPI (`image-engine`) | `sdxl-controlnet-fp8`<br>`sd-2-0-inpainting-fp8` | Offline, zero-cloud-cost GPU-accelerated inpainting, outpainting, and ControlNet conditioning. |
| **Custom BYOK** | Generic REST Proxy | User-configured OpenAI, Groq, Mistral, Anthropic | Client-supplied API keys with automated credential scrubbing. |

---

## 4. Supabase Database, Authentication & Storage

### 4.1 Schema Definitions
The database schema is formalized in three standalone SQL migrations in `frontend/`:
1. `supabase_security_rls_schema.sql`: Defines `workspaces`, `workspace_members`, `user_profiles`, `conversations`, `messages`, `user_files`, `user_memories`, and `security_audit_logs`. Establishes strict PostgreSQL Row-Level Security (RLS) policies enforcing multi-tenant isolation.
2. `supabase_memory_schema.sql`: Enables `pgvector` extension, creates `user_memories` (vector 3072-dim), `user_preferences`, `user_feedback`, and `conversation_summaries`.
3. `supabase_workspace_apps_schema.sql`: Defines `workspace_items`, `workspace_activity_logs`, and `workspace_shares` for collaborative document editing.

### 4.2 Storage Buckets
* Primary bucket: `tattva-secure-vault`.
* Purpose: Secure storage of user-uploaded files and compiled output documents (PPTX, DOCX, XLSX, PDF).
* Access model: Server-generated 1-hour signed download URLs (`getSignedUrl`).

### 4.3 Runtime Disconnect vs Local Fallback
While schemas exist and clients are instantiated via `@supabase/ssr` / `@supabase/supabase-js`, runtime components (`app/lib/memory-service.ts`, `app/lib/ai-orchestrator/rag-engine.ts`, and `app/api/chats/route.ts`) actively fall back to local disk directories:
* `.tattva_memory_data/`: Stores `memories.json`, `settings.json`, `feedback.json`, `rag_knowledge_chunks.json`.
* `.tattva_secure_vault/cloud_chats/`: Stores `chats_<hex_email>.json`.

---

## 5. Existing Image-Generation Engine

The Image Studio architecture encompasses **25 specialized modules** in `app/lib/image-engine/`:
* **Prompt Compiler (Phase A):** Multi-stage natural language parser generating positive, negative, and aesthetic tokens with aspect ratio and guidance scaling.
* **Reference Conditioning (Phase B):** Multi-modal image analysis, feature extraction, and image-to-image conditioning.
* **Intelligent Routing (Phase C):** Latency and capability-based dispatch across Gemini, FLUX, SDXL, and Pollinations.
* **Spatial & Positioning Control (Phase D):** Bounding box formulation and compositional layout graphs.
* **Independent Visual Evaluation (Phase E):** Rule-based and vision-LLM verification scoring prompt adherence (0–100%).
* **Super-Resolution (Phase F):** 2x and 4x upscaling pipelines.
* **Customization & LoRA (Phase G):** LoRA adapter registry, trigger word injection, and training evaluation hooks.
* **Advanced Editing & Inpainting (Phase H):** Mask formulation, dilation, feathering, object addition/removal, background replacement, and transparent PNG cutout.
* **Character & Subject Consistency (Phase I):** Subject profiles, identity tokens, and multi-scene storyboard generation.
* **Benchmarking & Reliability (Phases J–L):** 200+ canonical test prompts, automated circuit breaker cooldowns, and retry ceilings ($\le 3$).
* **Continuous Improvement & Regression (Phases M–P):** Failure feedback collection and 500-prompt regression test matrix.
* **Monitoring & Real-World Validation (Phases Q–U):** Real-time telemetry, 300 unseen prompt validations, and generalization probing.
* **Certification & Maintenance (Phases V–W):** Production release certification (`v1.2.0-certified-production`), SHA-256 idempotency cache, model health watcher, and monthly report generator.

---

## 6. Sara Voice Assistant Architecture (Current State)

* **Historical Status:** Sara was a voice assistant featuring Speech-to-Text (STT) and Text-to-Speech (TTS).
* **Purge Record:** In commit `4d8fc94` ("feat(ui): enforce minimalist interface with clean attachment menu and purge voice/mic elements"), all voice routes (`/api/voice-chat`, `/api/tts`), voice pages (`/voice`), microphone buttons, and audio listeners were removed across web, Android, and iOS.
* **Current Residue:** The only existing voice code is a client-side modal `frontend/app/components/workspace/VoiceWorkspaceModal.tsx` that invokes the browser's native `webkitSpeechRecognition` API and `window.speechSynthesis`.
* **Architectural Gap:** Sara lacks server-side audio ingestion, natural voice synthesis, voice activity detection (VAD), interruption handling, and integration with the central orchestrator.

---

## 7. File Generation & Office Compatibility Engine

Located in `app/lib/document-engine/`:
* **Two-Tier Architecture:**
  1. **Tier 1 (Native Python Office Engine):** Invokes `python_office_engine.py` via `python-bridge.ts`, leveraging `python-pptx` (1.0.2) and `python-docx` (1.2.0). Generates native Microsoft Office documents with authentic slide masters, layout shapes, formatted tables, and callouts.
  2. **Tier 2 (Pure TypeScript OpenXML Engine):** Standalone zero-dependency binary generators (`docx.ts`, `pptx.ts`, `xlsx.ts`, `pdf.ts`, `csv.ts`) producing standard OPC ZIP packages.
* **Strict Pre-Delivery Validation (`validator.ts`):** Verifies file size, magic numbers (`PK\x03\x04` for Office ZIPs, `%PDF-` for PDFs), and verifies reopening via Python (`validatePptxWithPython`, `validateDocxWithPython`).
* **Delivery Pipeline:** Files are uploaded to `tattva-secure-vault` in Supabase Storage and rendered in the Chat UI as downloadable cards with file metadata and one-click download buttons.

---

## 8. Conversation History & Memory Architecture

* **Short-Term Context:** Passed in request bodies as `messages` arrays. The Context Engine (`app/lib/context-engine/`) provides recursive sliding-window summarization.
* **Long-Term Memory (`memory-service.ts`):**
  * Auto-extracts memory items from chat exchanges using Gemini.
  * Categories: `preference`, `project`, `technical_level`, `language`, `formatting`, `instruction`.
  * Embeddings: Generates 3072-dimensional vector embeddings using `gemini-embedding-001`.
  * Deduplication: Merges memories if cosine similarity $> 0.86$.
* **Storage Location:** While Supabase queries are attempted, runtime falls back to `.tattva_memory_data/memories.json`.
* **Session Persistence:** `/api/chats` reads and writes user sessions to local files (`.tattva_secure_vault/cloud_chats/chats_<hex_email>.json`).

---

## 9. Security, Guardrails & Environment Configuration

* **Zero-Trust Input Defense:** `sanitizeAndGuardPrompt` in `app/lib/security.ts` blocks prompt injection, credential exfiltration, and unauthorized system prompt overrides.
* **Output Guardrails:** `guardAIOutput` strips accidentally revealed system tokens, credentials, and internal paths.
* **Rate Limiting:** In-memory sliding window limiter (`checkRateLimit`) enforcing endpoint-specific thresholds (e.g., 60 req/min on `/api/chat`).
* **Content Moderation:** `content-moderation.ts` inspects prompts and images against NSFW and safety standards.
* **SSRF Guard:** `ssrf-guard.ts` validates outgoing Claude MCP requests, blocking loopback addresses, private subnets (RFC 1918), and cloud metadata endpoints (`169.254.169.254`).
* **Credential Encryption:** AES-256-GCM encryption for user BYOK keys and MCP tokens at rest.
* **Security Headers & CSP:** Nonce-based Content Security Policy with `strict-dynamic` in Next.js headers.
