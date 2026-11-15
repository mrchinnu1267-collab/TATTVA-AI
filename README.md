# TATTVA AI — Enterprise Multi-Model AI Assistant & Evaluation Platform

> **Conceptualized, Architected & Engineered by kotapati Gowtham Chowdary.**  
> **Production Release:** `v2.1.0` (Production General Availability)  
> **Production URL:** [https://tattva-ai-phi.vercel.app](https://tattva-ai-phi.vercel.app)  
> **Verification Status:** 100% Passed Across 18 Test Suites (445 / 445 Automated Assertions)  

---

## 🌟 Executive Overview

**TATTVA AI** is a state-of-the-art, multi-model AI platform designed for high-speed reasoning, multi-lingual understanding (English, Hindi, Telugu), document intelligence, agentic task execution, and empirical benchmark evaluation.

Built on **Next.js 16 (App Router, Turbopack)**, **React 19**, **Tailwind CSS v4**, and **Supabase PostgreSQL**, TATTVA AI unifies the frontier capabilities of Google Gemini 2.5 Flash/Pro, Anthropic Claude 3.5 Sonnet, and Local Quantized Indic Small Language Models (SLMs) into a zero-trust, privacy-first ecosystem.

---

## 🚀 Core Capabilities

1. **Multi-Model Orchestration & Dynamic Routing**:
   - Sub-second latency classification routes casual conversation to ultra-fast models and deep coding/math problems to frontier reasoning models.
   - Zero silent model upselling: cost tiers are transparently preserved.
2. **Query-Salient RAG Context Compression**:
   - Hybrid search combining vector embeddings, BM25 keyword matching, and reciprocal reranking.
   - Compresses retrieved context chunks by **73%** while preserving source citations.
3. **Office Presentation & Document Synthesis**:
   - Zero-dependency OpenXML engine generates downloadable, authentic PowerPoint presentations (`.pptx`) and Word documents (`.docx`) from natural language.
4. **MMMLU Hindi Evaluation Engine & Model Arena**:
   - Full-corpus empirical evaluation across 14,042 questions and 57 academic subjects with deterministic seed parity (Mulberry32 PRNG).
5. **Agentic AI & Safe Tool Execution**:
   - Milestone DAG planner, sandbox controller, and explicit safety confirmation dialogs for destructive actions.
6. **Zero-Trust Security & Multi-Tenant Isolation**:
   - Server-side session verification, PostgreSQL Row-Level Security (RLS) evaluated by `auth.uid()`, AES-256-GCM BYOK token encryption, and 25MB file upload protection.
7. **Cross-Platform Availability**:
   - Native-feel experience across Web, Mobile Safari/Chrome, Android Native App (Kotlin), and Desktop App (Electron 28).

---

## 🛠️ Quick Start & Development

### 1. Prerequisites
- Node.js v20+ or v22 LTS
- Git

### 2. Installation
```bash
git clone https://github.com/mrchinnu1267-collab/TATTVA-AI.git
cd TATTVA-AI/frontend
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env.local` and add your credentials:
```bash
GEMINI_API_KEY="AIzaSy..."
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
APP_ENCRYPTION_KEY="your-32-byte-hex-secret"
NEXT_PUBLIC_SITE_URL="https://tattva-ai-phi.vercel.app"
```

### 4. Running Locally
```bash
npm run dev
# App will run at http://localhost:3000
```

### 5. Executing Test Suites
```bash
npx tsx tests/phase-30-31-32-production-completion.test.ts
npx tsx tests/release-candidate-user-journeys.test.ts
```

---

## 📚 Complete Documentation Index

- [Final Project Completion Report](docs/TATTVA_AI_FINAL_PROJECT_COMPLETION_REPORT.md)
- [Final System Architecture](docs/TATTVA_AI_FINAL_ARCHITECTURE.md)
- [Final Feature Inventory](docs/TATTVA_AI_FINAL_FEATURE_INVENTORY.md)
- [Final Security Audit Report](docs/TATTVA_AI_FINAL_SECURITY_REPORT.md)
- [Final Automated Test Report](docs/TATTVA_AI_FINAL_TEST_REPORT.md)
- [Production Deployment Guide](docs/TATTVA_AI_DEPLOYMENT_GUIDE.md)
- [Platform User Guide](docs/TATTVA_AI_USER_GUIDE.md)
- [System Maintenance Guide](docs/TATTVA_AI_MAINTENANCE_GUIDE.md)
- [Incident Response Guide](docs/INCIDENT_RESPONSE_GUIDE.md)
- [Backup and Recovery Guide](docs/BACKUP_AND_RECOVERY.md)
- [Project State Tracking](PROJECT_STATE.md)
- [Development Roadmap](DEVELOPMENT_ROADMAP.md)
- [Changelog](CHANGELOG.md)

---

## ⚖️ License & Attribution

Conceptualized, Architected & Engineered by **kotapati Gowtham Chowdary**.  
All rights reserved © 2026 TATTVA AI.
