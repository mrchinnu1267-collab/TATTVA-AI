# TATTVA AI – FINAL SYSTEM ARCHITECTURE SPECIFICATION
## Comprehensive End-to-End Architectural Reference & Component Taxonomy

**Document Version:** 3.0.0  
**Lead AI Architect:** kotapati Gowtham Chowdary  
**Target Repository:** `C:\Users\mrchi\TATTVA_AI\TATTVA_AI`  

---

## 1. HIGH-LEVEL TOPOLOGY

```
+-------------------------------------------------------------------------+
|                        USER CLIENT PLATFORMS                            |
| Desktop Browser | Responsive Mobile | Android Webview / PWA | Desktop   |
+------------------------------------+------------------------------------+
                                     | (HTTPS / WSS / JWT Auth)
                                     v
+-------------------------------------------------------------------------+
|                     NEXT.JS 15 APP ROUTER & GATEWAY                     |
| Rate Limiter (60 req/min) | Zero Trust Session Validator | Security Log |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                 MASTER AI ORCHESTRATOR & COGNITIVE CORE                 |
|                                                                         |
|  1. Content Safety & Sanitization (Prompt Injection Neutralizer)        |
|  2. Central Prompt Analyzer (Intent, Dialect, Typo Normalizer)          |
|  3. Context Manager (Anaphora Resolver, Selective Context Turns)        |
|  4. Task Decomposer (Multi-Step DAG Planner, ComplexTaskPlan)           |
|  5. Result Verifier (Non-zero bytes, valid formats, 0 placeholders)     |
+---------+--------------------------+--------------------------+---------+
          |                          |                          |
          v                          v                          v
+-------------------+      +-------------------+      +-------------------+
|   MODEL ROUTER    |      |    RAG ENGINE     |      |   AGENT ENGINE    |
| Task-Weighted     |      | Hybrid Dense +    |      | 10-Step DAG       |
| Empirical Score   |      | BM25 Keyword      |      | Execution Runner  |
| Provider Circuit  |      | Unicode NFC Norm  |      | Tool Registry     |
| Breaker Cooldown  |      | 73% Context Comp. |      | Human Conf. Gate  |
| Vision Gating     |      | Workspace RBAC    |      | Result Verification|
+---------+---------+      +---------+---------+      +---------+---------+
          |                          |                          |
          +--------------------------+--------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                       UNIVERSAL MULTIMODAL STUDIO                       |
| Diffusion Engine (FLUX, SDXL) | ControlNet Spatial Guidance              |
| Surgical Inpainting & Outpainting | Real-ESRGAN 2x/4x Super-Resolution  |
| Multimodal VQA Vision | Whisper Audio STT / TTS | Video Chapters        |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                      STORAGE & PERSISTENCE LAYER                        |
| Supabase PostgreSQL (RLS) | Encrypted Client Vault | Point-in-time Snap |
+-------------------------------------------------------------------------+
```

---

## 2. SUBSYSTEM INTERFACES & RESPONSIBILITIES

### 2.1. Central Prompt Understanding Engine (`app/lib/ai-orchestrator/intelligence/`)
- **`prompt-analyzer.ts`**: Coordinates semantic extraction, entity mapping, and intent classification across 14 discrete task types (`coding`, `agent_task`, `mathematics`, `reasoning`, `document_generation`, `image_generation`, etc.).
- **`context-manager.ts`**: Resolves pronoun anaphora (`"it"`, `"this"`, `"that"`) and colloquial Telugu-English phrasing (`"Previous answer short ga cheppu"`, `"Daanini PDF ga convert cheyyi"`). Selectively filters the top relevant turns via semantic keyword scoring, avoiding context saturation.
- **`task-decomposer.ts`**: Generates a typed `ComplexTaskPlan` identifying deliverables, domains, language stacks, database layers, documentation, and presentation requirements.
- **`response-validator.ts`**: Enforces strict negative constraints (forbidden word detection), native `JSON.parse` validity, and tool execution honesty checks.

### 2.2. Intelligent Model Router (`app/lib/ai-orchestrator/model-router.ts`)
- **Empirical Task Weighting**: Automatically sorts candidates according to empirical benchmark performance (DeepSeek V3 for math/reasoning, Gemini 3.5 Flash Lite for coding/chat/vision).
- **Multimodal Vision Gating**: Excludes text-only foundation models whenever active image attachments are present.
- **Circuit Breaker Cooldown**: Catches provider exhaustion (e.g. Anthropic 400 credit errors) and enforces a 60-second bypass to prevent 6–10s retry latency spikes.
- **Rate Limit Resilience**: Catches 429 quota exhaustion spikes with a single 1.2s backoff retry.

### 2.3. End-to-End Autonomous Agent Engine (`app/lib/ai-orchestrator/agent-engine/`)
- **`end-to-end-orchestrator.ts`**: Implements full multi-step workflows (Workflow A College Project, Workflow B Academic Research, Workflow C Data Analysis) from user request to verified deliverable files.
- **`result-verifier.ts`**: Ground-truth artifact verification checking non-zero byte existence, format extensions (`.java`, `.sql`, `.docx`, `.pptx`, `.xlsx`, `.pdf`), zero `// TODO` placeholders, and mathematical calculations.
- **Human Confirmation Gate**: Pauses execution on destructive operations (`DROP`, `DELETE`, `KILL`) until explicit confirmation is provided.

### 2.4. Zero-Trust Security & Indirect Injection Guard (`app/lib/security/`)
- **`content-safety-guard.ts`**: Neutralizes adversarial prompt injections (`ignore previous instructions`, control delimiters `<|im_start|>`) in external files and web text, wrapping them in `<untrusted_external_data>` boundaries.
- **`client-vault.ts` & `security.ts`**: Enforces multi-tenant workspace isolation (403 Forbidden for cross-tenant access) and scrubs API keys from logs.

---

*Certified and Approved by kotapati Gowtham Chowdary, Lead Architect & Principal AI Engineer, TATTVA AI.*
