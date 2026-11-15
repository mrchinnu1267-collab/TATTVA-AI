# TATTVA AI – AGENTIC AI & AUTONOMOUS TASK EXECUTION ENGINE
**Author & Lead Architect**: kotapati Gowtham Chowdary  
**Release**: v2.1.0 (Production General Availability)  
**Verification**: 21 / 21 Automated Tests Passing ([frontend/tests/phase-17-agentic-ai.test.ts](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/tests/phase-17-agentic-ai.test.ts))  
**Implementation**: [frontend/app/lib/agent-engine/](file:///c:/Users/mrchi/TATTVA_AI/TATTVA_AI/frontend/app/lib/agent-engine)

---

## 1. Architectural Overview

The **TATTVA AI Agent Engine** enables goal-oriented autonomous task decomposition, tool selection, plan execution, output piping, and state recovery.

```
                     [ High-Level User Goal ]
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │              TASK PLANNER                    │
         │ - Decomposes goal into ordered DAG milestones│
         │ - Identifies step-by-step dependencies       │
         └──────────────────────┬───────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │             TOOL SELECTOR                    │
         │ - Inspects Tool Registry                     │
         │ - Matches step requirements to capable tools │
         └──────────────────────┬───────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │       SAFETY & CONFIRMATION GATE             │
         │ - Read-only operations → Auto-authorized     │
         │ - Destructive operations → User Approval     │
         └──────────────────────┬───────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │         EXECUTION CONTROLLER                 │
         │ - Sandboxed execution                        │
         │ - Progress event streaming (SSE)             │
         │ - AbortSignal cancellation listener          │
         │ - Output piping from step n to step n+1      │
         └──────────────────────┬───────────────────────┘
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │        RESULT VALIDATION & SYNTHESIS         │
         │ - Verifies milestone acceptance criteria     │
         │ - Synthesizes comprehensive final deliverable│
         └──────────────────────────────────────────────┘
```

---

## 2. Tool Registry & Capabilities

| Tool Identifier | Category | Execution Mode | Confirmation Requirement |
|:---|:---|:---|:---|
| `web_search` | Research | Read-Only | Auto-approved |
| `github_inspector` | Developer | Read-Only | Auto-approved |
| `document_processor` | RAG / Files | Read-Only | Auto-approved |
| `data_calculator` | Math / Analysis| Pure Compute | Auto-approved |
| `code_runner` | Sandbox | Sandboxed Compute| Mandatory Confirmation for disk/network |
| `file_modifier` | Filesystem | Destructive write | **Mandatory User Confirmation** |
| `db_migration_runner`| Database | Destructive DDL | **Mandatory User Confirmation** |
| `image_generator` | Multimodal | Cloud / Local | Auto-approved |
| `pdf_generator` | Document Export| Local Generation| Auto-approved |

---

## 3. Sandboxed Execution & Safety Guardrails

- **Zero Untrusted Execution**: External shell scripts or untrusted code are executed strictly in isolated subprocesses with timeout limits (max 10s default) and memory caps.
- **Human-in-the-Loop Gate**: Any operation capable of data modification, file deletion, or irreversible state alteration triggers an interactive user approval prompt. Execution is suspended until explicit authorization is granted.
- **Graceful Task Abort**: All agent operations accept standard `AbortSignal`. Users can interrupt runaway or misdirected tasks instantly; the controller safely terminates active workers and skips remaining milestones.

---

## 4. Agent Dashboard & Observability

- Real-time telemetry tracking: total executions, milestone completion rate, step failure rates, and average execution latency.
- Accessible in the UI at `/dashboard/agent-observability`.
