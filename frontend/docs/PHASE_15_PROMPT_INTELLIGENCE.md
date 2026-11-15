# TATTVA AI – PHASE 15: ADVANCED PROMPT UNDERSTANDING ENGINE

**Author**: kotapati Gowtham Chowdary  
**System**: TATTVA AI Cognitive Orchestration Platform  
**Date**: November 15, 2026  
**Status**: Verified & Operational (35/35 Automated Tests Passing)

---

## 1. Executive Summary

Phase 15 introduces the **Centralized Prompt Understanding & Intelligence Engine** for TATTVA AI. Rather than arbitrarily expanding system prompt lengths, this engine executes a deterministic 10-stage cognitive parsing and validation pipeline that decodes user intent, extracts negative constraints, resolves conversational coreferences (anaphora), scores underspecification/ambiguity, plans multi-step dependency graphs, and validates model outputs prior to delivery.

---

## 2. 14 Core Intent Matrix

The engine supports granular classification across 14 distinct intents:

| # | Task Intent | Scope & Description | Default Tooling |
|---|-------------|---------------------|-----------------|
| 1 | `coding` | Software architecture, algorithms, components, refactoring | `code_runner`, `data_calculator` |
| 2 | `mathematics` | Symbolic algebra, calculus, matrices, arithmetic | `data_calculator` |
| 3 | `general_qa` | Factual inquiry, conceptual explanations, history, science | Standard LLM Context |
| 4 | `document_analysis` | Multimodal document parsing, handwriting transcription | `document_processor` |
| 5 | `creative_writing` | Poems, narratives, screenplays, essays, lyrics | Creative persona prompting |
| 6 | `data_analysis` | Statistical inference, CSV/tabular manipulation, KPIs | `data_calculator`, CSV parser |
| 7 | `web_research` | Temporal facts, 2025/2026 data, live market information | `web_search` |
| 8 | `agent_task` | Multi-step codebase audits, repository scans, tool DAGs | `github_inspector`, `code_runner` |
| 9 | `summarization` | Text condensation, executive briefings, bullet digests | Content extraction |
| 10 | `translation` | Idiomatic Indic translation (Telugu, Hindi) & global languages | Indic script preserver |
| 11 | `image_generation` | Text-to-image prompting, photorealistic visual assets | Local/Cloud Image Engine |
| 12 | `conversational` | Social greetings, introductions, capabilities exploration | Low-latency chat model |
| 13 | `troubleshooting` | Stack traces, type errors, crash diagnosis, bug repair | Code analyzer, debugger |
| 14 | `comparison` | Architecture trade-offs, technology benchmarks (e.g. Postgres vs Mongo) | Matrix comparison generator |

---

## 3. The 10-Stage Intelligence Pipeline

The engine executes sequentially via `PromptIntelligencePipeline.execute()`:

```
[1. User Request Intake]
         ↓
[2. Intent Classification] (Primary & Secondary across 14 intents)
         ↓
[3. Requirement & Constraint Extraction] (Explicit, Implicit, Format, Negative Bounds)
         ↓
[4. Context & Reference Resolution] (Multi-turn anaphora & topic anchoring)
         ↓
[5. Ambiguity Assessment Gate] ──(High ambiguity)──> [Return Clarification Question]
         ↓ (Low ambiguity)
[6. Task Planning & Decomposition] (DAG of ordered subtasks & dependencies)
         ↓
[7. Model & Tool Routing] (Selects optimal latency/parameter tier)
         ↓
[8. System Prompt Enhancement] (Grounding with explicit constraints)
         ↓
[9. Execution & Model Inference] (Dispatches to model handler or sandbox)
         ↓
[10. Response Validation & Quality Audit] (Enforces zero placeholders & format compliance)
```

---

## 4. Verification & Automated Tests

Automated test suite `frontend/tests/phase-15-prompt-intelligence.test.ts`:
- **Total Test Cases**: 35
- **Passed**: 35 (100%)
- **Test Coverage**:
  - All 14 intents correctly classified.
  - Negative constraints ("Do NOT use external libraries") identified and enforced.
  - Multi-turn anaphora ("Now implement it in Python") resolved to prior topic ("Dijkstra's algorithm").
  - Ambiguity scoring accurately separates vague prompts (95/100) from well-formed requests (10/100).
  - Multi-step architecture decomposes enterprise goals into ordered milestones with dependencies.
  - 10-stage pipeline executes end-to-end with full stage telemetry.
