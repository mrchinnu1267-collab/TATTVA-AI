# TATTVA AI — Controlled Beta Launch Plan (Phase 29)

**Lead Release Manager & Principal Architect:** kotapati Gowtham Chowdary  
**Target Release Version:** `2.1.0-beta.2`  
**Execution Window:** Q4 2026  
**Status:** Approved for Controlled Staged Deployment  
**Automated Verification:** `tests/phase-29-controlled-beta-launch.test.ts` (32/32 assertions passing)

---

## 1. Beta Program Objectives & Scope

The TATTVA AI Controlled Beta Program validates real-world performance, usability, and multi-modal intelligence with a curated group of authorized beta testers before general public availability.

### Core Objectives
1. **Empirical Quality Validation**: Verify AI reasoning fidelity across English, Hindi, and Telugu in live conversational settings.
2. **Stress-Testing Document RAG**: Validate multi-format document extraction (PDF, DOCX, XLSX, CSV) and query-salient token compression under real user workloads.
3. **Cross-Platform Parity**: Test responsive UI rendering, authentication persistence, and on-demand audio synthesis across Desktop Browsers, Mobile Safari/Chrome, Android Native App, and Electron Desktop App.
4. **Zero-Training Privacy Verification**: Ensure that tester conversations and uploaded files are never ingested into fine-tuning or distillation datasets.

---

## 2. Beta Cohort & Access Strategy

Access is restricted via cryptographic invitation codes and administrator-controlled whitelisting:

| Cohort Tier | Quota Allocation | Target Audience | Primary Focus |
| :--- | :---: | :--- | :--- |
| **Standard Beta** (`TATTVA-BETA-2026`) | 100 req/day | Academic students, educators, general users | Conversational chat, math/science questions, UI feedback |
| **VIP Tester** (`TATTVA-VIP-FOUNDER`) | 500 req/day | AI researchers, developers, data engineers | Complex code synthesis, MMMLU benchmarks, RAG documents |
| **Internal Team** (`TATTVA-INTERNAL-DEV`) | 2,000 req/day | Core engineering & security specialists | Security regression, edge failovers, latency profiling |

---

## 3. Environment Architecture & Safety Isolation

```text
[ Developer Local ] ──────► [ Staging / Beta Environment ] ──────► [ Production Serving ]
                                   │
                                   ├── Separate Beta Config (.env.local)
                                   ├── Isolated Supabase Tenant Schema
                                   ├── Bounded File Storage (25MB Max)
                                   ├── Real-Time Telemetry & Alert Webhooks
                                   └── Automated Rollback Engine (<10% Error Threshold)
```

### Safety Guardrails
- **Automated Rollback Engine:** `deployment-guard.ts` monitors error rates and triggers rollback to `v2.0.0` if errors exceed $10\%$ or p95 response time exceeds $5,000\text{ms}$.
- **Zero Silent Model Upselling:** Free/standard testers are never routed to higher-cost frontier models without explicit user consent.
- **Circuit Breakers:** Tripped providers automatically degrade gracefully to local Indic SLMs or fallback image models without crashing user sessions.

---

## 4. Launch Phases & Schedule

1. **Phase 29.1 (Internal Smoke Testing):** Internal team tests core workflows (Days 1–3).
2. **Phase 29.2 (VIP Founder Cohort):** 15 invited researchers test coding & RAG capabilities (Days 4–10).
3. **Phase 29.3 (Controlled Academic Beta):** 50 student/faculty testers test MMMLU Hindi evaluation & document synthesis (Days 11–24).
4. **Phase 29.4 (Review & Bug Remediation):** Engineering resolves reported tickets through the 7-status lifecycle (Days 25–30).
5. **Phase 29.5 (Beta Conclusion & GA Sign-Off):** Evaluation report generation and graduation to v2.2.0 General Availability.
