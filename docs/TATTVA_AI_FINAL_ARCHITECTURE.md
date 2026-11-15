# TATTVA AI — Final System Architecture (v2.1.0)

**Architect, Conceptualizer & Lead Engineer:** kotapati Gowtham Chowdary  
**Release Tag:** `v2.1.0` (Production General Availability)  
**Status:** Certified & Deployed  

---

## 1. Architectural Philosophy

TATTVA AI is architected around five fundamental principles:
1. **Zero-Trust Security**: Every request undergoes server-side authentication, tenant RLS isolation, and input/output sanitization.
2. **Provider-Agnostic Model Routing**: Intelligent intent, complexity, and latency-based routing across Gemini, Claude, Azure, and Local Indic SLMs.
3. **Query-Salient RAG Context Compression**: Multi-tier knowledge retrieval reducing token footprint by 73% while preserving citation attribution.
4. **Self-Evaluating Feedback Loops**: Built-in MMMLU Hindi evaluation, Model Arena benchmarking, and anti-regression deployment gates.
5. **Cross-Platform Synchronization**: Uniform experiences across Web, Mobile, Android, and Desktop.

---

## 2. Full-Stack End-to-End Topology

```text
+-----------------------------------------------------------------------------------------------+
|                                      CLIENT INTERFACE LAYER                                   |
|   - Next.js 16 (App Router, Turbopack) + React 19 + Tailwind CSS v4 + Lucide Icons           |
|   - Real-Time Server-Sent Events (SSE) Streaming Chat & Markdown Renderer                     |
|   - Cross-Platform Wrappers: Android Native (Kotlin) & Desktop App (Electron 28)              |
+-----------------------------------------------+-----------------------------------------------+
                                                │
                                                ▼
+-----------------------------------------------------------------------------------------------+
|                                  SECURITY & INGRESS GATEWAY                                   |
|   - Server-Side Session Verification (verifyUserSession) & Guest Sandboxing                   |
|   - File Upload Guard: 25MB Hard Cap (MAX_SAFE_FILE_SIZE) & Magic Byte Validation             |
|   - Adversarial Prompt Sanitizer (98% Confidence) & Content Moderation Filter                 |
|   - Strict HTTPS Enforcement & Host Allowlist Webhook Dispatcher                              |
+-----------------------------------------------+-----------------------------------------------+
                                                │
                                                ▼
+-----------------------------------------------------------------------------------------------+
|                                   AI ORCHESTRATION ENGINE                                     |
|   - Prompt Intelligence: 14-Class Intent Classifier, Complexity & Entity Anaphora Resolver    |
|   - Dynamic Model Router: Low-Latency Tier vs Frontier Reasoning vs Local Indic SLM          |
|   - Hybrid RAG Engine: Vector Embeddings (50%) + BM25 (30%) + Reciprocal Reranking (20%)       |
|   - Agentic Execution Controller: Milestone DAGs, Safe Tool Sandbox & User Confirmation Gate  |
|   - Resilient Image Fallback Chain: Cloudflare FLUX -> Stability SDXL -> HF Diffusers         |
+-----------------------------------------------+-----------------------------------------------+
                                                │
                                                ▼
+-----------------------------------------------------------------------------------------------+
|                                 DATA PERSISTENCE & VAULT                                      |
|   - Supabase Managed PostgreSQL: Row-Level Security (RLS) Enforced by auth.uid()              |
|   - Encrypted Local Fallback Vault (.tattva-vault/) with AES-256-GCM BYOK Storage             |
|   - MMMLU Hindi Corpus (14,042 Questions Across 57 Subjects) & Evaluation Results Matrix      |
+-----------------------------------------------------------------------------------------------+
```
